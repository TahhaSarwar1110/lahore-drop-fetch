-- Add storage policy for riders to upload delivery proofs
CREATE POLICY "Riders can upload delivery proofs"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'pickup-proofs' 
  AND auth.role() = 'authenticated'
  AND has_role(auth.uid(), 'rider'::app_role)
);

-- Allow riders to view their uploaded proofs
CREATE POLICY "Riders can view pickup-proofs bucket"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'pickup-proofs'
  AND auth.role() = 'authenticated'
);