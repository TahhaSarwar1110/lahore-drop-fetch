-- Allow customers to view order assignments for their own orders
CREATE POLICY "Users can view assignments for their orders"
ON public.order_assignments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = order_assignments.order_id 
    AND orders.user_id = auth.uid()
  )
);

-- Allow customers to view rider profiles for their assigned orders
CREATE POLICY "Customers can view rider profiles for their orders"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM order_assignments oa
    JOIN orders o ON o.id = oa.order_id
    WHERE oa.rider_id = profiles.id
    AND o.user_id = auth.uid()
  )
);