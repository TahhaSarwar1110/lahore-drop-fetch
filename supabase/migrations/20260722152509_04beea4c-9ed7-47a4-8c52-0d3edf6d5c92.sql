
-- =====================================================================
-- 1. STORAGE POLICIES — replace public/overly-broad with owner-scoped
-- =====================================================================

-- ORDER-IMAGES: drop public read, restrict to order owner + rider + staff
DROP POLICY IF EXISTS "Anyone can view order images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload order images" ON storage.objects;

CREATE POLICY "Order images viewable by order owner"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'order-images'
  AND EXISTS (
    SELECT 1 FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    WHERE oi.image_url LIKE '%' || storage.objects.name || '%'
      AND o.user_id = auth.uid()
  )
);

CREATE POLICY "Order images viewable by assigned rider"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'order-images'
  AND public.has_role(auth.uid(), 'rider'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.order_items oi
    JOIN public.order_assignments oa ON oa.order_id = oi.order_id
    WHERE oi.image_url LIKE '%' || storage.objects.name || '%'
      AND oa.rider_id = auth.uid()
  )
);

CREATE POLICY "Order images viewable by staff"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'order-images'
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role))
);

CREATE POLICY "Users upload order images to their own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'order-images'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- PAYMENT-PROOFS: drop public read + insufficient upload check
DROP POLICY IF EXISTS "Anyone can view payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own payment proofs" ON storage.objects;

CREATE POLICY "Payment proofs viewable by uploader"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Payment proofs viewable by staff"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role))
);

-- Upload MUST be into a folder path that includes an order_id owned by the user.
-- Convention: payment-proofs/<user_id>/<order_id>/<filename>
CREATE POLICY "Users upload payment proofs only for their own orders"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'payment-proofs'
  AND (auth.uid())::text = (storage.foldername(name))[1]
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.user_id = auth.uid()
      AND o.id::text = (storage.foldername(name))[2]
  )
);

-- PICKUP-PROOFS: drop public read + overly broad "any authenticated" view +
-- wrong-bucket rider upload. Keep the correct owner-scoped policies.
DROP POLICY IF EXISTS "Public can view pickup proofs" ON storage.objects;
DROP POLICY IF EXISTS "Riders can view pickup-proofs bucket" ON storage.objects;
DROP POLICY IF EXISTS "Riders can upload delivery proofs" ON storage.objects;
DROP POLICY IF EXISTS "Riders can upload pickup proofs" ON storage.objects;
DROP POLICY IF EXISTS "Riders can view their pickup proofs" ON storage.objects;

-- Rider uploads: convention pickup-proofs/<rider_id>/<order_id>/<filename>
-- Require the rider to actually be assigned to that order.
CREATE POLICY "Assigned riders upload pickup proofs for their orders"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'pickup-proofs'
  AND public.has_role(auth.uid(), 'rider'::app_role)
  AND (auth.uid())::text = (storage.foldername(name))[1]
  AND EXISTS (
    SELECT 1 FROM public.order_assignments oa
    WHERE oa.rider_id = auth.uid()
      AND oa.order_id::text = (storage.foldername(name))[2]
  )
);

CREATE POLICY "Riders view only their own pickup proofs"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'pickup-proofs'
  AND public.has_role(auth.uid(), 'rider'::app_role)
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Customers view pickup proofs for their own orders"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'pickup-proofs'
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.user_id = auth.uid()
      AND o.id::text = (storage.foldername(name))[2]
  )
);

CREATE POLICY "Staff view all pickup proofs"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'pickup-proofs'
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role))
);

-- =====================================================================
-- 2. MISSING CRUD POLICIES on critical tables
-- =====================================================================

-- Users can update items in their own pending orders
CREATE POLICY "Users can update items in their pending orders"
ON public.order_items FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND o.user_id = auth.uid()
      AND o.status = 'Pending'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND o.user_id = auth.uid()
      AND o.status = 'Pending'
  )
);

-- Users can cancel (delete) their own pending orders
CREATE POLICY "Users can delete their own pending orders"
ON public.orders FOR DELETE TO authenticated
USING (auth.uid() = user_id AND status = 'Pending');

-- Users can delete their own profile
CREATE POLICY "Users can delete their own profile"
ON public.profiles FOR DELETE TO authenticated
USING (auth.uid() = id);

-- =====================================================================
-- 3. SECURITY DEFINER function EXECUTE grants —
--    remove anon exposure, keep authenticated (required by RLS policies)
-- =====================================================================

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_owns_order(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_customer_ids_for_rider_orders(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_rider_ids_for_user_orders(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.rider_assigned_to_order(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.update_order_status(uuid, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_owns_order(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_customer_ids_for_rider_orders(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_rider_ids_for_user_orders(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rider_assigned_to_order(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_order_status(uuid, text) TO service_role;
