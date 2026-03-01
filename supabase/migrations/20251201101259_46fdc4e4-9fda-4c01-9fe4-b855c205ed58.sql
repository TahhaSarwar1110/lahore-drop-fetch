-- Create rider locations table for real-time tracking
CREATE TABLE public.rider_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(rider_id)
);

-- Enable RLS
ALTER TABLE public.rider_locations ENABLE ROW LEVEL SECURITY;

-- Riders can insert and update their own location
CREATE POLICY "Riders can upsert their own location"
ON public.rider_locations
FOR ALL
USING (
  has_role(auth.uid(), 'rider'::app_role) AND rider_id = auth.uid()
)
WITH CHECK (
  has_role(auth.uid(), 'rider'::app_role) AND rider_id = auth.uid()
);

-- Admins and managers can view all rider locations
CREATE POLICY "Admins and managers can view all rider locations"
ON public.rider_locations
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

-- Enable realtime for rider_locations
ALTER TABLE public.rider_locations REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rider_locations;

-- Create function to update timestamp automatically
CREATE OR REPLACE FUNCTION public.update_rider_location_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_rider_location_timestamp
BEFORE UPDATE ON public.rider_locations
FOR EACH ROW
EXECUTE FUNCTION public.update_rider_location_timestamp();