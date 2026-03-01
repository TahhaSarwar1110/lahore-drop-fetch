-- Create table for tracking item pickup status
CREATE TABLE IF NOT EXISTS public.item_pickups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id UUID NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
  rider_id UUID NOT NULL,
  picked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  pickup_proof_url TEXT,
  pickup_proof_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.item_pickups ENABLE ROW LEVEL SECURITY;

-- Riders can view pickups for their assigned orders
CREATE POLICY "Riders can view their item pickups"
ON public.item_pickups
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'rider'::app_role)
  AND rider_id = auth.uid()
);

-- Riders can insert pickups for their assigned orders
CREATE POLICY "Riders can create item pickups"
ON public.item_pickups
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'rider'::app_role)
  AND rider_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM order_items oi
    JOIN order_assignments oa ON oa.order_id = oi.order_id
    WHERE oi.id = order_item_id
    AND oa.rider_id = auth.uid()
  )
);

-- Admins and managers can view all pickups
CREATE POLICY "Admins and managers can view all item pickups"
ON public.item_pickups
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
);

-- Create storage bucket for pickup proofs
INSERT INTO storage.buckets (id, name, public)
VALUES ('pickup-proofs', 'pickup-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for pickup-proofs bucket
CREATE POLICY "Riders can upload pickup proofs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'pickup-proofs'
  AND has_role(auth.uid(), 'rider'::app_role)
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Riders can view their pickup proofs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'pickup-proofs'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'manager'::app_role)
  )
);

CREATE POLICY "Public can view pickup proofs"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'pickup-proofs');