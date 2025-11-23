-- Allow riders to view order items for their assigned orders
CREATE POLICY "Riders can view items for assigned orders"
ON public.order_items
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'rider'::app_role)
  AND EXISTS (
    SELECT 1 FROM order_assignments
    WHERE order_assignments.order_id = order_items.order_id
    AND order_assignments.rider_id = auth.uid()
  )
);