CREATE OR REPLACE FUNCTION public.can_read_order_attachment(p_path text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS (
 SELECT 1 FROM public.order_attachments a JOIN public.orders o ON o.id=a.order_id
 WHERE (a.file_url=p_path OR split_part(a.file_url, '?', 1) LIKE '%/' || p_path)
 AND (o.user_id=auth.uid() OR a.uploaded_by=auth.uid() OR EXISTS (SELECT 1 FROM public.order_assignments oa WHERE oa.order_id=o.id AND oa.rider_id=auth.uid()))
 )
$$;
REVOKE ALL ON FUNCTION public.can_read_order_attachment(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_read_order_attachment(text) TO authenticated, service_role;
CREATE POLICY "Uploaders preview their own order images" ON storage.objects FOR SELECT TO authenticated USING (bucket_id='order-images' AND (storage.foldername(name))[1]=auth.uid()::text);
CREATE POLICY "Order participants view rider attachments" ON storage.objects FOR SELECT TO authenticated USING (bucket_id='order-images' AND public.can_read_order_attachment(name));
CREATE OR REPLACE FUNCTION public.can_read_legacy_pickup_proof(p_path text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT auth.uid() IS NOT NULL AND (
 EXISTS (SELECT 1 FROM public.item_pickups ip JOIN public.order_items oi ON oi.id=ip.order_item_id JOIN public.orders o ON o.id=oi.order_id WHERE (ip.pickup_proof_url=p_path OR split_part(ip.pickup_proof_url, '?', 1) LIKE '%/' || p_path) AND (o.user_id=auth.uid() OR ip.rider_id=auth.uid()))
 OR EXISTS (SELECT 1 FROM public.orders o WHERE (o.delivery_proof_url=p_path OR split_part(o.delivery_proof_url, '?', 1) LIKE '%/' || p_path) AND (o.user_id=auth.uid() OR EXISTS(SELECT 1 FROM public.order_assignments oa WHERE oa.order_id=o.id AND oa.rider_id=auth.uid())))
 )
$$;
REVOKE ALL ON FUNCTION public.can_read_legacy_pickup_proof(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_read_legacy_pickup_proof(text) TO authenticated, service_role;
CREATE POLICY "Participants view legacy pickup and delivery proofs" ON storage.objects FOR SELECT TO authenticated USING (bucket_id='pickup-proofs' AND public.can_read_legacy_pickup_proof(name));