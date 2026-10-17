ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

COMMENT ON COLUMN public.profiles.email IS 'Optional real email for phone-only accounts; used to deliver order emails.';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    NEW.raw_user_meta_data->>'email'
  );
  RETURN NEW;
END;
$$;