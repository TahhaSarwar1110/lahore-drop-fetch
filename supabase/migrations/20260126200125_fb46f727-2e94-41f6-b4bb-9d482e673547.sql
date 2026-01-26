-- Create a trigger function to automatically assign customer role on new user signup
CREATE OR REPLACE FUNCTION public.assign_customer_role_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Create trigger on profiles table (which is already triggered on auth.users insert)
CREATE TRIGGER on_profile_created_assign_customer_role
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_customer_role_on_signup();

-- Insert missing customer role for testcustomer3
INSERT INTO public.user_roles (user_id, role)
SELECT 'ac08c7ac-ce16-49c2-a59a-d05f11cfd810', 'customer'
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = 'ac08c7ac-ce16-49c2-a59a-d05f11cfd810' AND role = 'customer'
);