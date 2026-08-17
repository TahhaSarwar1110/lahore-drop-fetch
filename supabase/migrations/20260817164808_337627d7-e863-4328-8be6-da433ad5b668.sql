DROP POLICY IF EXISTS "Managers can manage pricing bundles" ON public.pricing_bundles;

CREATE POLICY "Managers can manage pricing bundles"
ON public.pricing_bundles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'manager'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'manager'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));