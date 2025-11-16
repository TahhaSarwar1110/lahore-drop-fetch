-- Drop the existing restrictive insert policy
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;

-- Create a new policy that allows:
-- 1. Admins to insert any roles
-- 2. Anyone to insert admin role if no admins exist yet (bootstrap first admin)
CREATE POLICY "Allow role insertion with bootstrap"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  -- Allow if user is already an admin
  public.has_role(auth.uid(), 'admin'::app_role)
  OR
  -- Allow creating first admin if no admins exist
  (
    role = 'admin'::app_role 
    AND NOT EXISTS (
      SELECT 1 FROM public.user_roles WHERE role = 'admin'::app_role
    )
  )
);