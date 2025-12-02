-- Add payment fields to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS payment_proof_url text,
ADD COLUMN IF NOT EXISTS payment_proof_name text,
ADD COLUMN IF NOT EXISTS payment_submitted_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS payment_confirmed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS payment_confirmed_by uuid;

-- Create storage bucket for payment proofs
INSERT INTO storage.buckets (id, name, public) 
VALUES ('payment-proofs', 'payment-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy for payment proofs - users can upload
CREATE POLICY "Users can upload their own payment proofs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'payment-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create storage policy for viewing payment proofs
CREATE POLICY "Anyone can view payment proofs"
ON storage.objects FOR SELECT
USING (bucket_id = 'payment-proofs');