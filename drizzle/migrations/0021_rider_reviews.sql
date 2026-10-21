CREATE TABLE public.rider_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  rider_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  rating integer NOT NULL CHECK (rating BETWEEN 0 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX rider_reviews_rider_idx ON public.rider_reviews(rider_id);
GRANT SELECT ON public.rider_reviews TO authenticated;
GRANT ALL ON public.rider_reviews TO service_role;
ALTER TABLE public.rider_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers view own reviews" ON public.rider_reviews FOR SELECT TO authenticated USING (customer_id = auth.uid());
CREATE POLICY "Staff view reviews" ON public.rider_reviews FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Riders view own reviews" ON public.rider_reviews FOR SELECT TO authenticated USING (rider_id = auth.uid());

CREATE OR REPLACE FUNCTION public.submit_rider_review(p_order_id uuid, p_rating integer, p_comment text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_status text; v_owner uuid; v_rider uuid;
BEGIN
  IF p_rating IS NULL OR p_rating < 0 OR p_rating > 5 THEN RAISE EXCEPTION 'Rating must be between 0 and 5'; END IF;
  SELECT status, user_id INTO v_status, v_owner FROM orders WHERE id = p_order_id;
  IF v_owner IS NULL OR v_owner <> auth.uid() THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF v_status <> 'Delivered' THEN RAISE EXCEPTION 'You can review the rider after delivery'; END IF;
  SELECT rider_id INTO v_rider FROM order_assignments WHERE order_id = p_order_id ORDER BY assigned_at DESC NULLS LAST LIMIT 1;
  IF v_rider IS NULL THEN RAISE EXCEPTION 'No rider assigned'; END IF;
  INSERT INTO rider_reviews(order_id, rider_id, customer_id, rating, comment)
  VALUES (p_order_id, v_rider, auth.uid(), p_rating, NULLIF(btrim(p_comment),''))
  ON CONFLICT (order_id) DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment, updated_at = now();
END $$;
REVOKE ALL ON FUNCTION public.submit_rider_review(uuid,integer,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_rider_review(uuid,integer,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_rider_ratings(p_rider_ids uuid[])
RETURNS TABLE(rider_id uuid, avg_rating numeric, review_count integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.rider_id, round(avg(r.rating)::numeric, 1), count(*)::int
  FROM rider_reviews r WHERE r.rider_id = ANY(p_rider_ids) GROUP BY r.rider_id
$$;
REVOKE ALL ON FUNCTION public.get_rider_ratings(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_rider_ratings(uuid[]) TO authenticated;