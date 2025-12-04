-- Add new permission for manager order (using manager_order as name)
INSERT INTO public.permissions (name, description)
VALUES ('manager_order', 'Allows viewing customer orders in detail, approving items, providing feedback, and adding service charges')
ON CONFLICT (name) DO NOTHING;

-- Create pricing bundles table
CREATE TABLE public.pricing_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  items_allowed INTEGER NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on pricing bundles
ALTER TABLE public.pricing_bundles ENABLE ROW LEVEL SECURITY;

-- Allow everyone to view active bundles
CREATE POLICY "Anyone can view active pricing bundles"
ON public.pricing_bundles
FOR SELECT
USING (is_active = true);

-- Managers can manage pricing bundles
CREATE POLICY "Managers can manage pricing bundles"
ON public.pricing_bundles
FOR ALL
USING (has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'admin'));

-- Add approval status and feedback to order items
ALTER TABLE public.order_items
ADD COLUMN approval_status TEXT DEFAULT 'pending',
ADD COLUMN manager_feedback TEXT,
ADD COLUMN approved_by UUID REFERENCES auth.users(id),
ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE;

-- Add additional service charges to orders
ALTER TABLE public.orders
ADD COLUMN additional_charges DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN charges_description TEXT;

-- Create trigger for updating pricing bundles timestamp
CREATE OR REPLACE FUNCTION update_pricing_bundle_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_pricing_bundles_updated_at
BEFORE UPDATE ON public.pricing_bundles
FOR EACH ROW
EXECUTE FUNCTION update_pricing_bundle_timestamp();