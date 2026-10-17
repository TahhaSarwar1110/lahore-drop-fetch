CREATE OR REPLACE FUNCTION public.verify_order_payment(p_order_id uuid, p_paid_amount integer, p_approved boolean, p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_old public.orders%ROWTYPE;
  v_new_total integer;
  v_balance integer;
BEGIN
  IF auth.jwt() ->> 'role' IS DISTINCT FROM 'service_role' AND NOT (COALESCE(public.has_role(auth.uid(), 'manager'), false) OR COALESCE(public.has_role(auth.uid(), 'admin'), false)) THEN
    RAISE EXCEPTION 'Only managers or admins can verify payments' USING ERRCODE = '42501';
  END IF;
  IF p_approved IS NULL OR p_paid_amount IS NULL OR p_paid_amount < 0 THEN
    RAISE EXCEPTION 'Invalid payment amount or decision' USING ERRCODE = '22023';
  END IF;
  IF NOT p_approved AND COALESCE(btrim(p_reason), '') = '' THEN
    RAISE EXCEPTION 'Rejection reason required' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO v_old FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF v_old.payment_verification IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'Payment already reviewed; a new submission is required' USING ERRCODE = '22023';
  END IF;
  v_new_total := COALESCE(v_old.paid_amount_pkr, 0) + CASE WHEN p_approved THEN p_paid_amount ELSE 0 END;
  UPDATE public.orders SET
    paid_amount_pkr = v_new_total,
    payment_verification = CASE WHEN p_approved THEN 'verified' ELSE 'rejected' END,
    payment_verified_by = auth.uid(),
    payment_verified_at = now(),
    payment_rejection_reason = CASE WHEN p_approved THEN NULL ELSE p_reason END
  WHERE id = p_order_id;
  IF p_approved AND v_old.expense_status = 'verified' AND v_old.shopping_expense_pkr IS NOT NULL THEN
    v_balance := v_new_total - v_old.shopping_expense_pkr;
    UPDATE public.orders SET
      customer_balance_pkr = v_balance,
      refund_status = CASE WHEN v_balance > 0 AND refund_status IN ('none', 'failed') THEN 'pending' ELSE refund_status END
    WHERE id = p_order_id;
    INSERT INTO public.order_financial_events (order_id, event_type, actor_id, old_value, new_value)
    VALUES (p_order_id, 'balance_recalculated', auth.uid(),
      jsonb_build_object('paid_amount_pkr', v_old.paid_amount_pkr, 'customer_balance_pkr', v_old.paid_amount_pkr - v_old.shopping_expense_pkr),
      jsonb_build_object('paid_amount_pkr', v_new_total, 'shopping_expense_pkr', v_old.shopping_expense_pkr, 'customer_balance_pkr', v_balance));
  END IF;
  INSERT INTO public.order_financial_events (order_id, event_type, actor_id, old_value, new_value, note)
  VALUES (p_order_id, CASE WHEN p_approved THEN 'payment_verified' ELSE 'payment_rejected' END, auth.uid(),
    jsonb_build_object('payment_verification', v_old.payment_verification, 'paid_amount_pkr', v_old.paid_amount_pkr),
    jsonb_build_object('payment_verification', CASE WHEN p_approved THEN 'verified' ELSE 'rejected' END, 'paid_amount_pkr', v_new_total), p_reason);
END;
$$;