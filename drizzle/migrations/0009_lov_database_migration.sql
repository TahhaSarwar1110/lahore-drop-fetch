CREATE TABLE public.order_payment_proofs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL,
  file_url text NOT NULL,
  file_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.order_payment_proofs TO authenticated;
GRANT ALL ON public.order_payment_proofs TO service_role;
ALTER TABLE public.order_payment_proofs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers add proofs to own orders" ON public.order_payment_proofs FOR INSERT TO authenticated WITH CHECK (uploaded_by = auth.uid() AND public.user_owns_order(auth.uid(), order_id));
CREATE POLICY "Customers read own order proofs" ON public.order_payment_proofs FOR SELECT TO authenticated USING (public.user_owns_order(auth.uid(), order_id));
CREATE POLICY "Managers and admins read all proofs" ON public.order_payment_proofs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Riders read proofs of assigned orders" ON public.order_payment_proofs FOR SELECT TO authenticated USING (public.rider_assigned_to_order(auth.uid(), order_id));

DROP FUNCTION public.verify_order_payment(uuid, integer, boolean, text);
CREATE FUNCTION public.verify_order_payment(p_order_id uuid, p_paid_amount integer, p_approved boolean, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old record;
  v_is_privileged boolean;
  v_new_total integer;
  v_expense integer;
  v_balance integer;
BEGIN
  v_is_privileged := public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin');
  IF auth.jwt() ->> 'role' IS DISTINCT FROM 'service_role' AND NOT v_is_privileged THEN
    RAISE EXCEPTION 'Only managers or admins can verify payments';
  END IF;
  SELECT payment_verification, paid_amount_pkr, order_total_pkr, shopping_expense_pkr, expense_status
    INTO v_old FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;

  v_new_total := COALESCE(v_old.paid_amount_pkr, 0) + GREATEST(p_paid_amount, 0);

  UPDATE public.orders SET
    paid_amount_pkr = v_new_total,
    payment_verification = CASE WHEN p_approved THEN 'verified' ELSE 'rejected' END,
    payment_verified_by = auth.uid(),
    payment_verified_at = now(),
    payment_rejection_reason = CASE WHEN p_approved THEN NULL ELSE p_reason END
  WHERE id = p_order_id;

  IF p_approved AND v_old.expense_status = 'verified' AND v_old.shopping_expense_pkr IS NOT NULL THEN
    v_expense := v_old.shopping_expense_pkr;
    v_balance := v_new_total - v_expense;
    UPDATE public.orders SET
      customer_balance_pkr = v_balance,
      refund_status = CASE WHEN v_balance > 0 AND refund_status IN ('none', 'failed') THEN 'pending' ELSE refund_status END
    WHERE id = p_order_id;
    INSERT INTO public.order_financial_events (order_id, event_type, actor_id, old_value, new_value)
    VALUES (p_order_id, 'balance_recalculated', auth.uid(),
      jsonb_build_object('paid_amount_pkr', v_old.paid_amount_pkr, 'customer_balance_pkr', v_old.paid_amount_pkr - v_expense),
      jsonb_build_object('paid_amount_pkr', v_new_total, 'shopping_expense_pkr', v_expense, 'customer_balance_pkr', v_balance));
  END IF;

  INSERT INTO public.order_financial_events (order_id, event_type, actor_id, old_value, new_value, note)
  VALUES (p_order_id,
    CASE WHEN p_approved THEN 'payment_verified' ELSE 'payment_rejected' END,
    auth.uid(),
    jsonb_build_object('payment_verification', v_old.payment_verification, 'paid_amount_pkr', v_old.paid_amount_pkr),
    jsonb_build_object('payment_verification', CASE WHEN p_approved THEN 'verified' ELSE 'rejected' END, 'paid_amount_pkr', v_new_total),
    p_reason);
END;
$$;
REVOKE ALL ON FUNCTION public.verify_order_payment(uuid, integer, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.verify_order_payment(uuid, integer, boolean, text) TO authenticated, service_role;