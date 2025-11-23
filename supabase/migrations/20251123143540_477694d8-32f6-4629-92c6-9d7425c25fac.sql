-- Allow riders to view orders that are assigned to them
CREATE POLICY "Riders can view assigned orders"
ON orders
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'rider'::app_role) 
  AND EXISTS (
    SELECT 1 FROM order_assignments 
    WHERE order_assignments.order_id = orders.id 
    AND order_assignments.rider_id = auth.uid()
  )
);

-- Allow riders to view customer profiles for their assigned orders
CREATE POLICY "Riders can view customer profiles for assigned orders"
ON profiles
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'rider'::app_role)
  AND EXISTS (
    SELECT 1 FROM orders o
    JOIN order_assignments oa ON oa.order_id = o.id
    WHERE o.user_id = profiles.id
    AND oa.rider_id = auth.uid()
  )
);