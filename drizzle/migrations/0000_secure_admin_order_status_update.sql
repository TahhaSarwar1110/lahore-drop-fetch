CREATE OR REPLACE FUNCTION public.update_order_status(p_order_id uuid, p_new_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  allowed_statuses constant text[] := ARRAY[
    'Pending',
    'Order Received',
    'Order Confirmed',
    'Purchasing',
    'In Delivery',
    'Delivered',
    'Cancelled'
  ];
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;

  IF p_new_status IS NULL OR NOT (p_new_status = ANY (allowed_statuses)) THEN
    RAISE EXCEPTION 'Invalid order status' USING ERRCODE = '22023';
  END IF;

  UPDATE public.orders
  SET status = p_new_status
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.order_status_history (order_id, status)
  VALUES (p_order_id, p_new_status);
END;
$$;

REVOKE ALL ON FUNCTION public.update_order_status(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_order_status(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.update_order_status(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_order_status(uuid, text) TO service_role;