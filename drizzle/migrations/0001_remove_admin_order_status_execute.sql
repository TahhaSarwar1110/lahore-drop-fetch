REVOKE EXECUTE ON FUNCTION public.update_order_status(uuid, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.update_order_status(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_order_status(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_order_status(uuid, text) TO service_role;