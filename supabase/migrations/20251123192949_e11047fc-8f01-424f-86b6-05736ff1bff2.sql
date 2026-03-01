-- Fix function search path for update_pricing_bundle_timestamp
CREATE OR REPLACE FUNCTION update_pricing_bundle_timestamp()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;