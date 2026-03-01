-- Create a security definer function to check if user owns an order
-- This avoids RLS recursion when checking order ownership
CREATE OR REPLACE FUNCTION public.user_owns_order(_user_id uuid, _order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.orders
    WHERE id = _order_id
      AND user_id = _user_id
  )
$$;

-- Create a function to check if rider is assigned to an order
CREATE OR REPLACE FUNCTION public.rider_assigned_to_order(_rider_id uuid, _order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.order_assignments
    WHERE order_id = _order_id
      AND rider_id = _rider_id
  )
$$;

-- Drop the problematic policy on order_assignments that causes recursion
DROP POLICY IF EXISTS "Users can view assignments for their orders" ON public.order_assignments;

-- Recreate using security definer function to avoid recursion
CREATE POLICY "Users can view assignments for their orders"
ON public.order_assignments
FOR SELECT
USING (
  user_owns_order(auth.uid(), order_id)
);

-- Also fix the profiles policies that still cause issues
DROP POLICY IF EXISTS "Customers can view rider profiles for their orders" ON public.profiles;
DROP POLICY IF EXISTS "Riders can view customer profiles for assigned orders" ON public.profiles;

-- Create a function to get rider ids for user's orders
CREATE OR REPLACE FUNCTION public.get_rider_ids_for_user_orders(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT oa.rider_id 
  FROM public.order_assignments oa
  INNER JOIN public.orders o ON o.id = oa.order_id
  WHERE o.user_id = _user_id
$$;

-- Create a function to get customer ids for rider's assigned orders
CREATE OR REPLACE FUNCTION public.get_customer_ids_for_rider_orders(_rider_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.user_id 
  FROM public.orders o
  INNER JOIN public.order_assignments oa ON oa.order_id = o.id
  WHERE oa.rider_id = _rider_id
$$;

-- Recreate profile policies using security definer functions
CREATE POLICY "Customers can view rider profiles for their orders"
ON public.profiles
FOR SELECT
USING (
  id IN (SELECT get_rider_ids_for_user_orders(auth.uid()))
);

CREATE POLICY "Riders can view customer profiles for assigned orders"
ON public.profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'rider'::app_role) 
  AND id IN (SELECT get_customer_ids_for_rider_orders(auth.uid()))
);