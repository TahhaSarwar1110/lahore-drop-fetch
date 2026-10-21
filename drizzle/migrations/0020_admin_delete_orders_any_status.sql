CREATE OR REPLACE FUNCTION public.admin_delete_order(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only admins can delete orders' USING ERRCODE = '42501';
  END IF;
  PERFORM id FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found' USING ERRCODE = 'P0002';
  END IF;
  DELETE FROM public.order_expense_receipts WHERE order_id = p_order_id;
  DELETE FROM public.order_financial_events WHERE order_id = p_order_id;
  DELETE FROM public.orders WHERE id = p_order_id;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_delete_order(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_order(uuid) TO authenticated;
COMMENT ON FUNCTION public.admin_delete_order(uuid) IS 'Admin-only atomic permanent deletion at any order status, including dependent expense receipts and financial events; other order records cascade.';