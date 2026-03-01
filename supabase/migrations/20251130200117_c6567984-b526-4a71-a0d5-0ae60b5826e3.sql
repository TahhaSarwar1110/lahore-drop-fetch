-- Add DELETE policy for order_items so users can remove items from their own pending orders
CREATE POLICY "Users can delete items from their own pending orders"
ON public.order_items
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.orders
    WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
      AND orders.status = 'Pending'
  )
);