-- Allow managers to update order items for approval workflow
CREATE POLICY "Managers can update order items for approval"
ON public.order_items
FOR UPDATE
USING (has_role(auth.uid(), 'manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'manager'::app_role));