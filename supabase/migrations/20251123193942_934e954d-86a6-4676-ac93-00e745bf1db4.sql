-- Allow managers to view all customer profiles
CREATE POLICY "Managers can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'admin'));