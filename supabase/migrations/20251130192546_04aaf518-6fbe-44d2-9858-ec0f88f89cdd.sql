-- Allow managers to insert order assignments
CREATE POLICY "Managers can create order assignments"
ON public.order_assignments
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));