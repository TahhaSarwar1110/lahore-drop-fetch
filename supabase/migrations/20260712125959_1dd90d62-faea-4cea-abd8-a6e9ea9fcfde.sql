
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_type text NOT NULL DEFAULT 'within_city',
  ADD COLUMN IF NOT EXISTS total_weight_kg numeric(10,2),
  ADD COLUMN IF NOT EXISTS delivery_charges numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_charges_set_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivery_charges_set_by uuid,
  ADD COLUMN IF NOT EXISTS delivery_payment_status text NOT NULL DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS delivery_payment_proof_url text,
  ADD COLUMN IF NOT EXISTS delivery_payment_proof_name text,
  ADD COLUMN IF NOT EXISTS delivery_payment_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivery_payment_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivery_payment_confirmed_by uuid;

-- Backfill delivery_type from address prefix
UPDATE public.orders
SET delivery_type = 'out_of_country'
WHERE delivery_type = 'within_city'
  AND delivery_address ILIKE '[OUT OF COUNTRY]%';

UPDATE public.orders
SET delivery_type = 'out_of_city'
WHERE delivery_type = 'within_city'
  AND delivery_address ILIKE '[OUT OF CITY]%';

-- For out-of-city/country orders that don't already have delivery charges set,
-- mark delivery_payment_status as pending so the manager flow kicks in.
UPDATE public.orders
SET delivery_payment_status = 'pending'
WHERE delivery_type IN ('out_of_city', 'out_of_country')
  AND delivery_payment_status = 'not_required';
