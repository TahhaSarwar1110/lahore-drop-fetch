-- Fix RLS policies for managers to use 'authenticated' role instead of 'public'
-- Drop the existing manager policies
DROP POLICY IF EXISTS "Managers can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Managers can update orders" ON public.orders;
DROP POLICY IF EXISTS "Managers can view all profiles" ON public.profiles;

-- Recreate with correct role
CREATE POLICY "Managers can view all orders"
ON public.orders
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Managers can update orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Managers can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));