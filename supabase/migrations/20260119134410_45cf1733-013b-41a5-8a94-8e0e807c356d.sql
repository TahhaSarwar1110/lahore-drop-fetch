-- Add RLS policy for riders to update orders they are assigned to
CREATE POLICY "Riders can update assigned orders status"
ON public.orders
FOR UPDATE
USING (
  has_role(auth.uid(), 'rider'::app_role) 
  AND id IN (
    SELECT order_id FROM order_assignments WHERE rider_id = auth.uid()
  )
)
WITH CHECK (
  has_role(auth.uid(), 'rider'::app_role)
  AND id IN (
    SELECT order_id FROM order_assignments WHERE rider_id = auth.uid()
  )
);

-- Add delivery proof columns to orders table if not exist
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS delivery_proof_url text,
ADD COLUMN IF NOT EXISTS delivery_proof_name text,
ADD COLUMN IF NOT EXISTS delivered_at timestamp with time zone;