-- Allow customers to view item pickups for their orders
CREATE POLICY "Users can view item pickups for their orders"
ON public.item_pickups
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE oi.id = item_pickups.order_item_id
    AND o.user_id = auth.uid()
  )
);