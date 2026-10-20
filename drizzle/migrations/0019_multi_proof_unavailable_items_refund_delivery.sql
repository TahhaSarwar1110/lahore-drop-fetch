ALTER TABLE public.item_pickups
  ADD COLUMN IF NOT EXISTS proof_files jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS not_available boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS unavailable_reason text;

CREATE OR REPLACE FUNCTION public.submit_item_pickup(p_item_id uuid, p_amount integer, p_proofs jsonb, p_not_available boolean DEFAULT false, p_reason text DEFAULT NULL)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_order_id uuid; v_order public.orders%ROWTYPE; v_total integer; v_all boolean; v_amount integer; v_proofs jsonb; v_p jsonb; v_first text; v_first_name text;
BEGIN
  SELECT order_id INTO v_order_id FROM public.order_items WHERE id=p_item_id AND COALESCE(approval_status,'approved') <> 'rejected';
  IF NOT FOUND THEN RAISE EXCEPTION 'Item not found' USING ERRCODE='P0002'; END IF;
  IF auth.uid() IS NULL OR NOT public.rider_assigned_to_order(auth.uid(), v_order_id) THEN
    RAISE EXCEPTION 'Assigned rider access required' USING ERRCODE='42501'; END IF;
  v_proofs := COALESCE(p_proofs, '[]'::jsonb);
  IF jsonb_typeof(v_proofs) <> 'array' THEN RAISE EXCEPTION 'Invalid attachments' USING ERRCODE='22023'; END IF;
  IF COALESCE(p_not_available,false) THEN
    IF COALESCE(btrim(p_reason),'')='' THEN RAISE EXCEPTION 'Enter why the item was not available' USING ERRCODE='22023'; END IF;
    v_amount := 0;
  ELSE
    IF p_amount IS NULL OR p_amount < 0 THEN RAISE EXCEPTION 'Enter the amount actually paid' USING ERRCODE='22023'; END IF;
    IF jsonb_array_length(v_proofs)=0 THEN RAISE EXCEPTION 'Add at least one proof photo' USING ERRCODE='22023'; END IF;
    v_amount := p_amount;
  END IF;
  IF jsonb_array_length(v_proofs) > 10 THEN RAISE EXCEPTION 'Up to 10 photos per item' USING ERRCODE='22023'; END IF;
  FOR v_p IN SELECT * FROM jsonb_array_elements(v_proofs) LOOP
    IF COALESCE(v_p->>'path','') NOT LIKE auth.uid()::text || '/' || v_order_id::text || '/%' THEN
      RAISE EXCEPTION 'Invalid attachment' USING ERRCODE='22023'; END IF;
  END LOOP;
  v_first := v_proofs->0->>'path'; v_first_name := v_proofs->0->>'name';
  SELECT * INTO v_order FROM public.orders WHERE id=v_order_id FOR UPDATE;
  IF v_order.expense_status IN ('pending_review','verified') THEN
    RAISE EXCEPTION 'The shopping bill is already submitted; ask the manager to reject or reopen it to make changes' USING ERRCODE='42501'; END IF;

  IF EXISTS (SELECT 1 FROM public.item_pickups WHERE order_item_id=p_item_id) THEN
    UPDATE public.item_pickups SET rider_id=auth.uid(), actual_paid_pkr=v_amount, proof_files=v_proofs,
      pickup_proof_url=v_first, pickup_proof_name=v_first_name, receipt_url=NULL, receipt_name=NULL,
      not_available=COALESCE(p_not_available,false), unavailable_reason=CASE WHEN p_not_available THEN btrim(p_reason) ELSE NULL END,
      picked_at=now(), updated_at=now() WHERE order_item_id=p_item_id;
  ELSE
    INSERT INTO public.item_pickups(order_item_id, rider_id, picked_at, pickup_proof_url, pickup_proof_name, actual_paid_pkr, proof_files, not_available, unavailable_reason)
    VALUES (p_item_id, auth.uid(), now(), v_first, v_first_name, v_amount, v_proofs, COALESCE(p_not_available,false), CASE WHEN p_not_available THEN btrim(p_reason) ELSE NULL END);
  END IF;

  SELECT bool_and(ip.actual_paid_pkr IS NOT NULL AND (ip.not_available OR jsonb_array_length(ip.proof_files)>0 OR ip.receipt_url IS NOT NULL)), COALESCE(SUM(ip.actual_paid_pkr),0)
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
END; $function$;
REVOKE ALL ON FUNCTION public.submit_item_pickup(uuid,integer,jsonb,boolean,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_item_pickup(uuid,integer,jsonb,boolean,text) TO authenticated;

-- Refund owed to the customer no longer blocks delivery
CREATE OR REPLACE FUNCTION public.enforce_settlement_before_delivery()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.expense_status = 'verified' AND NEW.shopping_expense_pkr IS NOT NULL THEN
    NEW.customer_balance_pkr := COALESCE(NEW.paid_amount_pkr, 0) - public.order_settlement_total(NEW.shopping_expense_pkr, NEW.additional_charges, NEW.delivery_charges);
    IF NEW.customer_balance_pkr > 0 AND NEW.refund_status = 'none' THEN NEW.refund_status := 'pending';
    ELSIF NEW.customer_balance_pkr <= 0 AND NEW.refund_status = 'pending' THEN NEW.refund_status := 'none'; END IF;
    IF NEW.customer_balance_pkr < 0 AND NEW.payment_verification = 'verified' THEN NEW.payment_status := 'pending'; END IF;
  END IF;
  IF NEW.status IN ('In Delivery', 'Delivered') AND NEW.status IS DISTINCT FROM OLD.status AND NEW.order_total_pkr IS NOT NULL THEN
    IF NEW.expense_status IS DISTINCT FROM 'verified' THEN
      RAISE EXCEPTION 'Delivery blocked: shopping expense must be verified first' USING ERRCODE = '42501'; END IF;
    IF NEW.customer_balance_pkr < 0 THEN
      RAISE EXCEPTION 'Delivery blocked: customer must pay the remaining amount first' USING ERRCODE = '42501'; END IF;
  END IF;
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.enforce_ready_before_delivery()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status IN ('In Delivery','Delivered') AND NEW.status IS DISTINCT FROM OLD.status
     AND NEW.order_total_pkr IS NOT NULL AND NEW.ready_for_delivery_at IS NULL
     AND NOT (NEW.expense_status='verified' AND COALESCE(NEW.customer_balance_pkr,0) > 0) THEN
    RAISE EXCEPTION 'Delivery blocked: the manager must mark the order Ready for Delivery first' USING ERRCODE='42501';
  END IF;
  IF NEW.status='Delivered' AND OLD.status IS DISTINCT FROM 'Delivered' AND COALESCE(NEW.delivery_proof_url,'')='' THEN
    RAISE EXCEPTION 'Delivery proof photo is required' USING ERRCODE='22023';
  END IF;
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.invalidate_unsettled_delivery_release()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$ BEGIN
IF NEW.status NOT IN ('Delivered','Cancelled','In Delivery') AND NEW.expense_status='verified' AND NEW.shopping_expense_pkr IS NOT NULL THEN
  IF NEW.customer_balance_pkr > 0 AND OLD.refund_status='completed' AND NEW.customer_balance_pkr IS DISTINCT FROM OLD.customer_balance_pkr THEN
    NEW.refund_status := 'pending'; NEW.refund_completed_at := NULL; NEW.refund_completed_by := NULL;
  END IF;
  IF NEW.customer_balance_pkr < 0 THEN
    NEW.ready_for_delivery_at := NULL; NEW.ready_for_delivery_by := NULL;
    IF NEW.status='Ready for Delivery' THEN NEW.status := 'Purchasing'; END IF;
  END IF;
END IF;
RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.mark_ready_for_delivery(p_order_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v public.orders%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT (public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin')) THEN
    RAISE EXCEPTION 'Manager access required' USING ERRCODE='42501'; END IF;
  SELECT * INTO v FROM public.orders WHERE id=p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found' USING ERRCODE='P0002'; END IF;
  IF v.status IN ('In Delivery','Delivered','Cancelled','Ready for Delivery') THEN RAISE EXCEPTION 'Order cannot be marked ready from its current status' USING ERRCODE='22023'; END IF;
  IF v.expense_status IS DISTINCT FROM 'verified' THEN RAISE EXCEPTION 'Verify the shopping bill first' USING ERRCODE='42501'; END IF;
  IF COALESCE(v.customer_balance_pkr,0) < 0 THEN RAISE EXCEPTION 'Customer must pay the outstanding amount first' USING ERRCODE='42501'; END IF;
  UPDATE public.orders SET status='Ready for Delivery', ready_for_delivery_at=now(), ready_for_delivery_by=auth.uid() WHERE id=p_order_id;
  INSERT INTO public.order_status_history(order_id,status) VALUES (p_order_id,'Ready for Delivery');
END; $function$;