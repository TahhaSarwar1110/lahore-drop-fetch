ALTER TABLE public.orders ADD COLUMN customer_submitted_amount_pkr integer NOT NULL DEFAULT 0 CHECK (customer_submitted_amount_pkr >= 0);
ALTER TABLE public.order_payment_proofs ADD COLUMN submitted_amount_pkr integer CHECK (submitted_amount_pkr > 0);

CREATE OR REPLACE FUNCTION public.submit_customer_payment(p_order_id uuid, p_amount integer, p_file_path text, p_file_name text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_order public.orders%ROWTYPE;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in to submit payment' USING ERRCODE='42501'; END IF;
 IF p_amount IS NULL OR p_amount <= 0 OR p_file_path IS NULL OR p_file_name IS NULL OR btrim(p_file_name) = '' THEN RAISE EXCEPTION 'A positive payment amount and screenshot are required' USING ERRCODE='22023'; END IF;
 SELECT * INTO v_order FROM public.orders WHERE id=p_order_id FOR UPDATE;
 IF NOT FOUND OR v_order.user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Order not found' USING ERRCODE='42501'; END IF;
 IF v_order.payment_status = 'submitted' AND v_order.payment_verification = 'pending' THEN RAISE EXCEPTION 'Your previous payment is awaiting verification' USING ERRCODE='22023'; END IF;
 IF v_order.status IN ('Delivered','Cancelled') THEN RAISE EXCEPTION 'This order is closed' USING ERRCODE='22023'; END IF;
 IF p_file_path NOT LIKE auth.uid()::text || '/' || p_order_id::text || '/%' THEN RAISE EXCEPTION 'Invalid payment attachment' USING ERRCODE='22023'; END IF;
 IF NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id='payment-proofs' AND name=p_file_path) THEN RAISE EXCEPTION 'Payment screenshot was not uploaded' USING ERRCODE='22023'; END IF;
 INSERT INTO public.order_payment_proofs(order_id,uploaded_by,file_url,file_name,submitted_amount_pkr) VALUES(p_order_id,auth.uid(),p_file_path,p_file_name,p_amount);
 UPDATE public.orders SET customer_submitted_amount_pkr=p_amount,payment_proof_url=p_file_path,payment_proof_name=p_file_name,payment_status='submitted',payment_submitted_at=clock_timestamp() WHERE id=p_order_id;
END; $$;
REVOKE ALL ON FUNCTION public.submit_customer_payment(uuid,integer,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.submit_customer_payment(uuid,integer,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.clear_reviewed_customer_payment() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NEW.payment_verification IN ('verified','rejected') THEN NEW.customer_submitted_amount_pkr := 0; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER zz_clear_reviewed_customer_payment BEFORE UPDATE OF payment_verification ON public.orders FOR EACH ROW EXECUTE FUNCTION public.clear_reviewed_customer_payment();