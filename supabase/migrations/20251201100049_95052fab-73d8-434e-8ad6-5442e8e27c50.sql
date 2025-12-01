-- Add coordinate fields for pickup locations on order items
ALTER TABLE public.order_items
ADD COLUMN pickup_latitude numeric,
ADD COLUMN pickup_longitude numeric;

-- Add coordinate fields for delivery location on orders
ALTER TABLE public.orders
ADD COLUMN delivery_latitude numeric,
ADD COLUMN delivery_longitude numeric;