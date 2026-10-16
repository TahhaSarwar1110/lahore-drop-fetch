CREATE OR REPLACE FUNCTION public.assign_admin_created_user_role(p_user_id uuid, p_role public.app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_role IS NULL OR p_role NOT IN ('admin', 'manager', 'rider', 'customer') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;
  PERFORM id FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;
  DELETE FROM public.user_roles WHERE user_id = p_user_id;
  INSERT INTO public.user_roles (user_id, role) VALUES (p_user_id, p_role);
END;
$$;
REVOKE ALL ON FUNCTION public.assign_admin_created_user_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assign_admin_created_user_role(uuid, public.app_role) TO service_role;