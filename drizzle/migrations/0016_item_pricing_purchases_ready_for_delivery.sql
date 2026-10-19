
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS manager_price_pkr integer CHECK (manager_price_pkr IS NULL OR manager_price_pkr >= 0);
ALTER TABLE public.item_pickups ADD COLUMN IF NOT EXISTS actual_paid_pkr integer CHECK (actual_paid_pkr IS NULL OR actual_paid_pkr >= 0);
ALTER TABLE public.item_pickups ADD COLUMN IF NOT EXISTS receipt_url text;
ALTER TABLE public.item_pickups ADD COLUMN IF NOT EXISTS receipt_name text;
ALTER TABLE public.item_pickups ADD COLUMN IF NOT EXISTS updated_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS ready_for_delivery_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS ready_for_delivery_by uuid;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS refund_account_bank text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS refund_account_title text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS refund_account_number text;

-- Manager reviews one item: decision + verified price; recalculates order total.
CREATE OR REPLACE FUNCTION public.review_order_item(p_item_id uuid, p_status text, p_feedback text, p_manager_price integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_order public.orders%ROWTYPE; v_order_id uuid; v_goods integer;
BEGIN
  IF auth.uid() IS NULL OR NOT (public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin')) THEN
    RAISE EXCEPTION 'Manager access required' USING ERRCODE='42501'; END IF;
  IF p_status NOT IN ('pending','approved','rejected') THEN RAISE EXCEPTION 'Invalid item status' USING ERRCODE='22023'; END IF;
  IF p_status='rejected' AND COALESCE(btrim(p_feedback),'')='' THEN RAISE EXCEPTION 'Feedback is required for rejected items' USING ERRCODE='22023'; END IF;
  IF p_status='approved' AND (p_manager_price IS NULL OR p_manager_price <= 0) THEN RAISE EXCEPTION 'Enter the verified price before approving an item' USING ERRCODE='22023'; END IF;
  SELECT order_id INTO v_order_id FROM public.order_items WHERE id=p_item_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Item not found' USING ERRCODE='P0002'; END IF;
  SELECT * INTO v_order FROM public.orders WHERE id=v_order_id FOR UPDATE;
  IF v_order.confirmed_at IS NOT NULL THEN RAISE EXCEPTION 'Order is confirmed; items are locked' USING ERRCODE='42501'; END IF;
  UPDATE public.order_items SET approval_status=p_status, manager_feedback=NULLIF(btrim(COALESCE(p_feedback,'')),''),
    manager_price_pkr=CASE WHEN p_status='rejected' THEN manager_price_pkr ELSE p_manager_price END,
    approved_by=auth.uid(), approved_at=now() WHERE id=p_item_id;
  SELECT COALESCE(SUM(manager_price_pkr),0) INTO v_goods FROM public.order_items
   WHERE order_id=v_order_id AND approval_status='approved';
  IF NOT EXISTS (SELECT 1 FROM public.order_items WHERE order_id=v_order_id AND approval_status='approved' AND manager_price_pkr IS NULL) THEN
    UPDATE public.orders SET order_total_pkr = v_goods + ROUND(COALESCE(additional_charges,0))::integer WHERE id=v_order_id;
  END IF;
END; $$;
REVOKE ALL ON FUNCTION public.review_order_item(uuid,text,text,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_order_item(uuid,text,text,integer) TO authenticated;

-- Confirming requires a verified price on every approved item (new orders).
CREATE OR REPLACE FUNCTION public.enforce_item_prices_before_confirm()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.confirmed_at IS NOT NULL AND OLD.confirmed_at IS NULL
     AND EXISTS (SELECT 1 FROM public.order_items WHERE order_id=NEW.id AND approval_status='approved' AND manager_price_pkr IS NULL) THEN
    RAISE EXCEPTION 'Set the verified price for every approved item before confirming' USING ERRCODE='42501';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS enforce_item_prices_before_confirm ON public.orders;
CREATE TRIGGER enforce_item_prices_before_confirm BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.enforce_item_prices_before_confirm();

-- Rider records an item purchase: actual amount + pickup photo + receipt photo.
CREATE OR REPLACE FUNCTION public.submit_item_purchase(p_item_id uuid, p_amount integer, p_pickup_path text, p_pickup_name text, p_receipt_path text, p_receipt_name text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_order_id uuid; v_order public.orders%ROWTYPE; v_total integer; v_all boolean;
BEGIN
  SELECT order_id INTO v_order_id FROM public.order_items WHERE id=p_item_id AND COALESCE(approval_status,'approved') <> 'rejected';
  IF NOT FOUND THEN RAISE EXCEPTION 'Item not found' USING ERRCODE='P0002'; END IF;
  IF auth.uid() IS NULL OR NOT public.rider_assigned_to_order(auth.uid(), v_order_id) THEN
    RAISE EXCEPTION 'Assigned rider access required' USING ERRCODE='42501'; END IF;
  IF p_amount IS NULL OR p_amount < 0 THEN RAISE EXCEPTION 'Enter the amount actually paid' USING ERRCODE='22023'; END IF;
  IF COALESCE(p_pickup_path,'')='' OR COALESCE(p_receipt_path,'')='' THEN RAISE EXCEPTION 'Item photo and receipt photo are required' USING ERRCODE='22023'; END IF;
  IF p_pickup_path NOT LIKE auth.uid()::text || '/' || v_order_id::text || '/%' OR p_receipt_path NOT LIKE auth.uid()::text || '/' || v_order_id::text || '/%' THEN
    RAISE EXCEPTION 'Invalid attachment' USING ERRCODE='22023'; END IF;
  SELECT * INTO v_order FROM public.orders WHERE id=v_order_id FOR UPDATE;
  IF v_order.expense_status IN ('pending_review','verified') THEN
    RAISE EXCEPTION 'The shopping bill is already submitted; ask the manager to reject or reopen it to make changes' USING ERRCODE='42501'; END IF;

  IF EXISTS (SELECT 1 FROM public.item_pickups WHERE order_item_id=p_item_id) THEN
    UPDATE public.item_pickups SET rider_id=auth.uid(), actual_paid_pkr=p_amount, pickup_proof_url=p_pickup_path, pickup_proof_name=p_pickup_name,
      receipt_url=p_receipt_path, receipt_name=p_receipt_name, picked_at=now(), updated_at=now() WHERE order_item_id=p_item_id;
  ELSE
    INSERT INTO public.item_pickups(order_item_id, rider_id, picked_at, pickup_proof_url, pickup_proof_name, actual_paid_pkr, receipt_url, receipt_name)
    VALUES (p_item_id, auth.uid(), now(), p_pickup_path, p_pickup_name, p_amount, p_receipt_path, p_receipt_name);
  END IF;

  SELECT bool_and(ip.actual_paid_pkr IS NOT NULL AND ip.receipt_url IS NOT NULL), COALESCE(SUM(ip.actual_paid_pkr),0)
    INTO v_all, v_total
  FROM public.order_items oi LEFT JOIN public.item_pickups ip ON ip.order_item_id=oi.id
  WHERE oi.order_id=v_order_id AND COALESCE(oi.approval_status,'approved') <> 'rejected';

  IF COALESCE(v_all,false) THEN
    UPDATE public.orders SET shopping_expense_pkr=v_total, expense_status='pending_review',
      expense_notes='Sum of item purchases', expense_submitted_by=auth.uid(), expense_submitted_at=now(),
      expense_verified_by=NULL, expense_verified_at=NULL, expense_rejection_reason=NULL
    WHERE id=v_order_id;
    INSERT INTO public.order_financial_events(order_id,event_type,actor_id,old_value,new_value,note)
    VALUES (v_order_id,'expense_submitted',auth.uid(),
      jsonb_build_object('shopping_expense_pkr',v_order.shopping_expense_pkr,'expense_status',v_order.expense_status),
      jsonb_build_object('shopping_expense_pkr',v_total,'expense_status','pending_review'),'All items picked');
  END IF;
  RETURN COALESCE(v_all,false);
END; $$;
REVOKE ALL ON FUNCTION public.submit_item_purchase(uuid,integer,text,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_item_purchase(uuid,integer,text,text,text,text) TO authenticated;

-- Manager releases the order for delivery once money is settled.
CREATE OR REPLACE FUNCTION public.mark_ready_for_delivery(p_order_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v public.orders%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT (public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin')) THEN
    RAISE EXCEPTION 'Manager access required' USING ERRCODE='42501'; END IF;
  SELECT * INTO v FROM public.orders WHERE id=p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found' USING ERRCODE='P0002'; END IF;
  IF v.status IN ('In Delivery','Delivered','Cancelled','Ready for Delivery') THEN RAISE EXCEPTION 'Order cannot be marked ready from its current status' USING ERRCODE='22023'; END IF;
  IF v.expense_status IS DISTINCT FROM 'verified' THEN RAISE EXCEPTION 'Verify the shopping bill first' USING ERRCODE='42501'; END IF;
  IF COALESCE(v.customer_balance_pkr,0) < 0 THEN RAISE EXCEPTION 'Customer must pay the outstanding amount first' USING ERRCODE='42501'; END IF;
  IF COALESCE(v.customer_balance_pkr,0) > 0 AND v.refund_status IS DISTINCT FROM 'completed' THEN RAISE EXCEPTION 'Complete the customer refund first' USING ERRCODE='42501'; END IF;
  UPDATE public.orders SET status='Ready for Delivery', ready_for_delivery_at=now(), ready_for_delivery_by=auth.uid() WHERE id=p_order_id;
  INSERT INTO public.order_status_history(order_id,status) VALUES (p_order_id,'Ready for Delivery');
END; $$;
REVOKE ALL ON FUNCTION public.mark_ready_for_delivery(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_ready_for_delivery(uuid) TO authenticated;

-- Customer shares where the refund should be sent.
CREATE OR REPLACE FUNCTION public.save_refund_account(p_order_id uuid, p_bank text, p_title text, p_number text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.user_owns_order(auth.uid(), p_order_id) THEN RAISE EXCEPTION 'Order not found' USING ERRCODE='42501'; END IF;
  IF COALESCE(btrim(p_bank),'')='' OR COALESCE(btrim(p_title),'')='' OR COALESCE(btrim(p_number),'')='' THEN
    RAISE EXCEPTION 'Bank/wallet, account title and account number are required' USING ERRCODE='22023'; END IF;
  IF length(p_bank)>100 OR length(p_title)>100 OR length(p_number)>40 THEN RAISE EXCEPTION 'Details are too long' USING ERRCODE='22023'; END IF;
  UPDATE public.orders SET refund_account_bank=btrim(p_bank), refund_account_title=btrim(p_title), refund_account_number=btrim(p_number) WHERE id=p_order_id;
END; $$;
REVOKE ALL ON FUNCTION public.save_refund_account(uuid,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_refund_account(uuid,text,text,text) TO authenticated;

-- Delivery cannot start until the manager marks the order ready (new reconciled orders).
CREATE OR REPLACE FUNCTION public.enforce_ready_before_delivery()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status IN ('In Delivery','Delivered') AND NEW.status IS DISTINCT FROM OLD.status
     AND NEW.order_total_pkr IS NOT NULL AND NEW.ready_for_delivery_at IS NULL THEN
    RAISE EXCEPTION 'Delivery blocked: the manager must mark the order Ready for Delivery first' USING ERRCODE='42501';
  END IF;
  IF NEW.status='Delivered' AND OLD.status IS DISTINCT FROM 'Delivered' AND COALESCE(NEW.delivery_proof_url,'')='' THEN
    RAISE EXCEPTION 'Delivery proof photo is required' USING ERRCODE='22023';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS zz_enforce_ready_before_delivery ON public.orders;
CREATE TRIGGER zz_enforce_ready_before_delivery BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.enforce_ready_before_delivery();

-- Customers can view the refund screenshot for their own order.
DROP POLICY IF EXISTS "Customers view refund proof for own orders" ON storage.objects;
CREATE POLICY "Customers view refund proof for own orders" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id='pickup-proofs' AND EXISTS (SELECT 1 FROM public.orders o WHERE o.user_id=auth.uid() AND o.refund_proof_url=storage.objects.name));
