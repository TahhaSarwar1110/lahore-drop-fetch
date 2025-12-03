-- Drop the problematic policies on orders that cause recursion
DROP POLICY IF EXISTS "Riders can view assigned orders" ON public.orders;
DROP POLICY IF EXISTS "Users can update payment info on their own orders" ON public.orders;

-- Recreate the rider policy without recursion (use a simpler check)
CREATE POLICY "Riders can view assigned orders"
ON public.orders
FOR SELECT
USING (
  has_role(auth.uid(), 'rider'::app_role) 
  AND id IN (
    SELECT order_id FROM public.order_assignments WHERE rider_id = auth.uid()
  )
);

-- Recreate user update policy with simpler check
CREATE POLICY "Users can update payment info on their own orders"
ON public.orders
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Also fix profile policies that reference orders to avoid circular dependencies
DROP POLICY IF EXISTS "Customers can view rider profiles for their orders" ON public.profiles;
DROP POLICY IF EXISTS "Riders can view customer profiles for assigned orders" ON public.profiles;

-- Recreate profile policies using IN subqueries instead of EXISTS with JOINs
CREATE POLICY "Customers can view rider profiles for their orders"
ON public.profiles
FOR SELECT
USING (
  id IN (
    SELECT oa.rider_id 
    FROM public.order_assignments oa
    WHERE oa.order_id IN (
      SELECT o.id FROM public.orders o WHERE o.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Riders can view customer profiles for assigned orders"
ON public.profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'rider'::app_role) 
  AND id IN (
    SELECT o.user_id 
    FROM public.orders o
    WHERE o.id IN (
      SELECT oa.order_id FROM public.order_assignments oa WHERE oa.rider_id = auth.uid()
    )
  )
);