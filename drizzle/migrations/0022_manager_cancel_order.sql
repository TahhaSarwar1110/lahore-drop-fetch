CREATE OR REPLACE FUNCTION public.manager_cancel_order(p_order_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE current_status text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'manager'::public.app_role) THEN
    RAISE EXCEPTION 'Manager access required' USING ERRCODE = '42501';
  END IF;
  SELECT status INTO current_status FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found' USING ERRCODE = 'P0002'; END IF;
  IF current_status = 'Delivered' THEN
    RAISE EXCEPTION 'Delivered orders cannot be cancelled' USING ERRCODE = '22023';
  END IF;
  IF current_status = 'Cancelled' THEN RETURN; END IF;
  UPDATE public.orders SET status = 'Cancelled', ready_for_delivery_at = NULL, ready_for_delivery_by = NULL WHERE id = p_order_id;
  INSERT INTO public.order_status_history(order_id, status) VALUES (p_order_id, 'Cancelled');
END;
$$;
REVOKE ALL ON FUNCTION public.manager_cancel_order(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.manager_cancel_order(uuid) TO authenticated, service_role;