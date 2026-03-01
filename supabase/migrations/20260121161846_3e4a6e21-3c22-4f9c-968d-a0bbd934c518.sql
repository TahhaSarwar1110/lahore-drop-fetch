-- Create table for additional user information (for managers and riders)
CREATE TABLE public.user_details (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    cnic_number text,
    permanent_address text,
    alternative_contact text,
    id_card_url text,
    id_card_name text,
    utility_bill_url text,
    utility_bill_name text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_details ENABLE ROW LEVEL SECURITY;

-- Admins can manage all user details
CREATE POLICY "Admins can manage all user details"
ON public.user_details
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Managers can view their own details
CREATE POLICY "Users can view their own details"
ON public.user_details
FOR SELECT
USING (auth.uid() = user_id);

-- Managers can view all user details
CREATE POLICY "Managers can view all user details"
ON public.user_details
FOR SELECT
USING (has_role(auth.uid(), 'manager'::app_role));

-- Create trigger for updating timestamp
CREATE TRIGGER update_user_details_updated_at
BEFORE UPDATE ON public.user_details
FOR EACH ROW
EXECUTE FUNCTION public.update_pricing_bundle_timestamp();

-- Create storage bucket for user documents (ID cards, utility bills)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('user-documents', 'user-documents', false);

-- Storage policies for user-documents bucket
CREATE POLICY "Admins can upload user documents"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'user-documents' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view user documents"
ON storage.objects
FOR SELECT
USING (bucket_id = 'user-documents' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete user documents"
ON storage.objects
FOR DELETE
USING (bucket_id = 'user-documents' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can view user documents"
ON storage.objects
FOR SELECT
USING (bucket_id = 'user-documents' AND has_role(auth.uid(), 'manager'::app_role));