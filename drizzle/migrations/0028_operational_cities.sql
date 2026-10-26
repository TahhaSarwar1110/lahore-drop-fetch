CREATE TABLE public.operating_cities (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 name text NOT NULL CHECK (name = btrim(name) AND char_length(name) BETWEEN 2 AND 100),
 is_active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.operating_cities TO authenticated;
GRANT ALL ON public.operating_cities TO service_role;
ALTER TABLE public.operating_cities ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX operating_cities_name_unique ON public.operating_cities (lower(name));
CREATE POLICY operating_cities_read ON public.operating_cities FOR SELECT TO authenticated USING (is_active OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY operating_cities_admin_insert ON public.operating_cities FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY operating_cities_admin_update ON public.operating_cities FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY operating_cities_admin_delete ON public.operating_cities FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
ALTER TABLE public.orders ADD COLUMN delivery_from_city text;
COMMENT ON COLUMN public.orders.delivery_from_city IS 'Operating city name snapshot at placement; nullable for legacy orders. Preserved when the operating list changes.';
CREATE FUNCTION public.validate_order_origin_city() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF TG_OP = 'UPDATE' THEN
  IF NEW.delivery_from_city IS NOT DISTINCT FROM OLD.delivery_from_city THEN RETURN NEW; END IF;
 END IF;
 IF NEW.delivery_from_city IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.operating_cities WHERE name = NEW.delivery_from_city AND is_active) THEN
  RAISE EXCEPTION 'Please select an available operating city';
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER validate_order_origin_city BEFORE INSERT OR UPDATE OF delivery_from_city ON public.orders FOR EACH ROW EXECUTE FUNCTION public.validate_order_origin_city();