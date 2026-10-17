-- 1. New financial columns on orders (all additive, safe for existing rows)
ALTER TABLE public.orders
  ADD COLUMN order_total_pkr integer,
  ADD COLUMN paid_amount_pkr integer NOT NULL DEFAULT 0,
  ADD COLUMN payment_verification text NOT NULL DEFAULT 'pending',
  ADD COLUMN payment_verified_by uuid,
  ADD COLUMN payment_verified_at timestamptz,
  ADD COLUMN payment_rejection_reason text,
  ADD COLUMN shopping_expense_pkr integer,
  ADD COLUMN expense_status text,
  ADD COLUMN expense_notes text,
  ADD COLUMN expense_submitted_by uuid,
  ADD COLUMN expense_submitted_at timestamptz,
  ADD COLUMN expense_verified_by uuid,
  ADD COLUMN expense_verified_at timestamptz,
  ADD COLUMN expense_rejection_reason text,
  ADD COLUMN customer_balance_pkr integer,
  ADD COLUMN refund_status text NOT NULL DEFAULT 'none',
  ADD COLUMN refund_method text,
  ADD COLUMN refund_reference text,
  ADD COLUMN refund_proof_url text,
  ADD COLUMN refund_proof_name text,
  ADD COLUMN refund_notes text,
  ADD COLUMN refund_completed_by uuid,
  ADD COLUMN refund_completed_at timestamptz;

-- 2. Backfill order_total_pkr for existing orders (goods from item data + service charges)
UPDATE public.orders o
SET order_total_pkr = COALESCE((
  SELECT ROUND(SUM(line_total))::integer FROM (
    SELECT
      COALESCE(NULLIF(regexp_replace(COALESCE((
        SELECT kv.value FROM jsonb_each_text(oi.item_data) kv
        WHERE lower(kv.key) LIKE '%price%' LIMIT 1
      ), (oi.item_data->>'expectedPrice'), '0'), '[^0-9.]', '', 'g'), '')::numeric, 0)
      *
      COALESCE(NULLIF(regexp_replace(COALESCE((
        SELECT kv.value FROM jsonb_each_text(oi.item_data) kv
        WHERE lower(kv.key) LIKE '%quantity%' OR lower(kv.key) = 'qty' LIMIT 1
      ), '1'), '[^0-9]', '', 'g'), '')::numeric, 1)
      AS line_total
    FROM public.order_items oi
    WHERE oi.order_id = o.id
  ) lines
), 0) + COALESCE(o.additional_charges, 0)
WHERE o.order_total_pkr IS NULL;

-- 3. Rider expense receipts
CREATE TABLE public.order_expense_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id),
  rider_id uuid NOT NULL REFERENCES public.profiles(id),
  file_url text NOT NULL,
  file_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.order_expense_receipts TO authenticated;
GRANT ALL ON public.order_expense_receipts TO service_role;
ALTER TABLE public.order_expense_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Rider inserts own receipts"
ON public.order_expense_receipts FOR INSERT TO authenticated
WITH CHECK (
  rider_id = auth.uid()
  AND public.rider_assigned_to_order(auth.uid(), order_id)
);

CREATE POLICY "Staff view receipts"
ON public.order_expense_receipts FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Rider views own receipts"
ON public.order_expense_receipts FOR SELECT TO authenticated
USING (rider_id = auth.uid());

CREATE POLICY "Customer views own order receipts"
ON public.order_expense_receipts FOR SELECT TO authenticated
USING (public.user_owns_order(auth.uid(), order_id));

-- 4. Financial audit trail
CREATE TABLE public.order_financial_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id),
  event_type text NOT NULL,
  actor_id uuid,
  old_value jsonb,
  new_value jsonb,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.order_financial_events TO authenticated;
GRANT ALL ON public.order_financial_events TO service_role;
ALTER TABLE public.order_financial_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff view financial events"
ON public.order_financial_events FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Customer views own order financial events"
ON public.order_financial_events FOR SELECT TO authenticated
USING (public.user_owns_order(auth.uid(), order_id));

CREATE POLICY "Assigned rider views financial events"
ON public.order_financial_events FOR SELECT TO authenticated
USING (public.rider_assigned_to_order(auth.uid(), order_id));

-- 5. Manager verifies (or rejects) the customer's paid amount
CREATE OR REPLACE FUNCTION public.verify_order_payment(
  p_order_id uuid,
  p_paid_amount integer,
  p_approved boolean,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_old public.orders%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Manager access required' USING ERRCODE = '42501';
  END IF;
  IF p_paid_amount IS NULL OR p_paid_amount < 0 THEN
    RAISE EXCEPTION 'Invalid paid amount' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_old FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found' USING ERRCODE = 'P0002';
  END IF;

  IF p_approved THEN
    UPDATE public.orders
    SET paid_amount_pkr = p_paid_amount,
        payment_verification = 'verified',
        payment_verified_by = auth.uid(),
        payment_verified_at = now(),
        payment_rejection_reason = NULL,
        payment_status = 'confirmed',
        payment_confirmed_at = COALESCE(payment_confirmed_at, now()),
        payment_confirmed_by = COALESCE(payment_confirmed_by, auth.uid())
    WHERE id = p_order_id;
  ELSE
    IF p_reason IS NULL OR btrim(p_reason) = '' THEN
      RAISE EXCEPTION 'Rejection reason required' USING ERRCODE = '22023';
    END IF;
    UPDATE public.orders
    SET paid_amount_pkr = p_paid_amount,
        payment_verification = 'rejected',
        payment_verified_by = auth.uid(),
        payment_verified_at = now(),
        payment_rejection_reason = p_reason,
        payment_status = 'pending'
    WHERE id = p_order_id;
  END IF;

  INSERT INTO public.order_financial_events (order_id, event_type, actor_id, old_value, new_value, note)
  VALUES (
    p_order_id,
    CASE WHEN p_approved THEN 'payment_verified' ELSE 'payment_rejected' END,
    auth.uid(),
    jsonb_build_object('paid_amount_pkr', v_old.paid_amount_pkr, 'payment_verification', v_old.payment_verification),
    jsonb_build_object('paid_amount_pkr', p_paid_amount, 'payment_verification', CASE WHEN p_approved THEN 'verified' ELSE 'rejected' END),
    p_reason
  );
END;
$function$;

-- 6. Rider submits actual shopping expense
CREATE OR REPLACE FUNCTION public.submit_shopping_expense(
  p_order_id uuid,
  p_amount integer,
  p_notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_old public.orders%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT public.rider_assigned_to_order(auth.uid(), p_order_id) THEN
    RAISE EXCEPTION 'Assigned rider access required' USING ERRCODE = '42501';
  END IF;
  IF p_amount IS NULL OR p_amount < 0 THEN
    RAISE EXCEPTION 'Invalid expense amount' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_old FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found' USING ERRCODE = 'P0002';
  END IF;

  -- A verified expense is locked; only a manager reopen allows resubmission
  IF v_old.expense_status = 'verified' THEN
    RAISE EXCEPTION 'Expense already verified; a manager must reopen it first' USING ERRCODE = '42501';
  END IF;
  IF v_old.expense_status = 'pending_review' THEN
    RAISE EXCEPTION 'Expense already submitted and awaiting review' USING ERRCODE = '42501';
  END IF;

  UPDATE public.orders
  SET shopping_expense_pkr = p_amount,
      expense_status = 'pending_review',
      expense_notes = p_notes,
      expense_submitted_by = auth.uid(),
      expense_submitted_at = now(),
      expense_verified_by = NULL,
      expense_verified_at = NULL,
      expense_rejection_reason = NULL
  WHERE id = p_order_id;

  INSERT INTO public.order_financial_events (order_id, event_type, actor_id, old_value, new_value, note)
  VALUES (
    p_order_id,
    'expense_submitted',
    auth.uid(),
    jsonb_build_object('shopping_expense_pkr', v_old.shopping_expense_pkr, 'expense_status', v_old.expense_status),
    jsonb_build_object('shopping_expense_pkr', p_amount, 'expense_status', 'pending_review'),
    p_notes
  );
END;
$function$;

-- 7. Manager verifies/rejects the expense; balance is computed here only
CREATE OR REPLACE FUNCTION public.verify_shopping_expense(
  p_order_id uuid,
  p_approved boolean,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_old public.orders%ROWTYPE;
  v_balance integer;
BEGIN
  IF auth.uid() IS NULL OR NOT (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Manager access required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_old FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_old.expense_status IS DISTINCT FROM 'pending_review' THEN
    RAISE EXCEPTION 'No submitted expense to review' USING ERRCODE = '22023';
  END IF;

  IF p_approved THEN
    v_balance := COALESCE(v_old.paid_amount_pkr, 0) - COALESCE(v_old.shopping_expense_pkr, 0);
    UPDATE public.orders
    SET expense_status = 'verified',
        expense_verified_by = auth.uid(),
        expense_verified_at = now(),
        expense_rejection_reason = NULL,
        customer_balance_pkr = v_balance,
        refund_status = CASE WHEN v_balance > 0 AND refund_status = 'none' THEN 'pending' ELSE refund_status END
    WHERE id = p_order_id;
  ELSE
    IF p_reason IS NULL OR btrim(p_reason) = '' THEN
      RAISE EXCEPTION 'Rejection reason required' USING ERRCODE = '22023';
    END IF;
    UPDATE public.orders
    SET expense_status = 'rejected',
        expense_verified_by = auth.uid(),
        expense_verified_at = now(),
        expense_rejection_reason = p_reason
    WHERE id = p_order_id;
  END IF;

  INSERT INTO public.order_financial_events (order_id, event_type, actor_id, old_value, new_value, note)
  VALUES (
    p_order_id,
    CASE WHEN p_approved THEN 'expense_verified' ELSE 'expense_rejected' END,
    auth.uid(),
    jsonb_build_object('expense_status', v_old.expense_status, 'customer_balance_pkr', v_old.customer_balance_pkr),
    jsonb_build_object('expense_status', CASE WHEN p_approved THEN 'verified' ELSE 'rejected' END, 'customer_balance_pkr', CASE WHEN p_approved THEN v_balance ELSE v_old.customer_balance_pkr END),
    p_reason
  );
END;
$function$;

-- 8. Manager reopens a verified expense so the rider can resubmit
CREATE OR REPLACE FUNCTION public.reopen_shopping_expense(p_order_id uuid, p_reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_old public.orders%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Manager access required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_old FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_old.expense_status IS DISTINCT FROM 'verified' THEN
    RAISE EXCEPTION 'Only a verified expense can be reopened' USING ERRCODE = '22023';
  END IF;

  UPDATE public.orders
  SET expense_status = 'rejected',
      expense_rejection_reason = COALESCE(p_reason, 'Reopened by manager for correction')
  WHERE id = p_order_id;

  INSERT INTO public.order_financial_events (order_id, event_type, actor_id, old_value, new_value, note)
  VALUES (
    p_order_id,
    'expense_reopened',
    auth.uid(),
    jsonb_build_object('expense_status', v_old.expense_status, 'shopping_expense_pkr', v_old.shopping_expense_pkr),
    jsonb_build_object('expense_status', 'rejected'),
    p_reason
  );
END;
$function$;

-- 9. Manager updates refund status
CREATE OR REPLACE FUNCTION public.update_refund_status(
  p_order_id uuid,
  p_status text,
  p_method text DEFAULT NULL,
  p_reference text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_proof_url text DEFAULT NULL,
  p_proof_name text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_old public.orders%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Manager access required' USING ERRCODE = '42501';
  END IF;
  IF p_status IS NULL OR p_status NOT IN ('pending', 'initiated', 'completed', 'failed') THEN
    RAISE EXCEPTION 'Invalid refund status' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_old FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found' USING ERRCODE = 'P0002';
  END IF;
  IF COALESCE(v_old.customer_balance_pkr, 0) <= 0 THEN
    RAISE EXCEPTION 'No refund due for this order' USING ERRCODE = '22023';
  END IF;
  IF p_status = 'completed'
     AND (COALESCE(btrim(COALESCE(p_reference, v_old.refund_reference, '')), '') = '')
     AND (COALESCE(btrim(COALESCE(p_proof_url, v_old.refund_proof_url, '')), '') = '') THEN
    RAISE EXCEPTION 'A reference or proof is required to complete a refund' USING ERRCODE = '22023';
  END IF;

  UPDATE public.orders
  SET refund_status = p_status,
      refund_method = COALESCE(p_method, refund_method),
      refund_reference = COALESCE(p_reference, refund_reference),
      refund_notes = COALESCE(p_notes, refund_notes),
      refund_proof_url = COALESCE(p_proof_url, refund_proof_url),
      refund_proof_name = COALESCE(p_proof_name, refund_proof_name),
      refund_completed_by = CASE WHEN p_status = 'completed' THEN auth.uid() ELSE refund_completed_by END,
      refund_completed_at = CASE WHEN p_status = 'completed' THEN now() ELSE refund_completed_at END
  WHERE id = p_order_id;

  INSERT INTO public.order_financial_events (order_id, event_type, actor_id, old_value, new_value, note)
  VALUES (
    p_order_id,
    'refund_' || p_status,
    auth.uid(),
    jsonb_build_object('refund_status', v_old.refund_status),
    jsonb_build_object('refund_status', p_status, 'refund_method', COALESCE(p_method, v_old.refund_method), 'refund_reference', COALESCE(p_reference, v_old.refund_reference)),
    p_notes
  );
END;
$function$;

-- 10. New payment submissions reset verification so top-ups get re-reviewed
CREATE OR REPLACE FUNCTION public.reset_payment_verification_on_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.payment_submitted_at IS DISTINCT FROM OLD.payment_submitted_at
     AND NEW.payment_submitted_at IS NOT NULL THEN
    NEW.payment_verification := 'pending';
    NEW.payment_verified_by := NULL;
    NEW.payment_verified_at := NULL;
    NEW.payment_rejection_reason := NULL;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER on_payment_submitted_reset_verification
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.reset_payment_verification_on_submission();

-- 11. Block order confirmation until payment is verified and covers the total
CREATE OR REPLACE FUNCTION public.enforce_payment_before_confirm()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'Order Confirmed' AND OLD.status IS DISTINCT FROM 'Order Confirmed'
     AND NEW.order_total_pkr IS NOT NULL AND NEW.order_total_pkr > 0 THEN
    IF NEW.payment_verification IS DISTINCT FROM 'verified'
       OR COALESCE(NEW.paid_amount_pkr, 0) < NEW.order_total_pkr THEN
      RAISE EXCEPTION 'Order can only be confirmed after verified payment covers the order total' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER enforce_payment_before_confirm
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.enforce_payment_before_confirm();

-- 12. Storage policies for receipt images in the existing pickup-proofs bucket
CREATE POLICY "Riders upload expense receipts"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'pickup-proofs'
  AND (storage.foldername(name))[1] = 'receipts'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "Staff read expense receipts"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'pickup-proofs'
  AND (storage.foldername(name))[1] = 'receipts'
  AND (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin'))
);

CREATE POLICY "Riders read own expense receipts"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'pickup-proofs'
  AND (storage.foldername(name))[1] = 'receipts'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- 13. Function execute grants
GRANT EXECUTE ON FUNCTION public.verify_order_payment(uuid, integer, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_shopping_expense(uuid, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_shopping_expense(uuid, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reopen_shopping_expense(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_refund_status(uuid, text, text, text, text, text, text) TO authenticated;