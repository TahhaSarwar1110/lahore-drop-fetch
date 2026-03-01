-- Fix SECURITY DEFINER functions to prevent search_path manipulation attacks

-- Drop and recreate update_order_status with proper search_path
DROP FUNCTION IF EXISTS public.update_order_status(uuid, text);

CREATE OR REPLACE FUNCTION public.update_order_status(p_order_id uuid, p_new_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Update order status
  UPDATE public.orders
  SET status = p_new_status
  WHERE id = p_order_id;
  
  -- Add to status history
  INSERT INTO public.order_status_history (order_id, status)
  VALUES (p_order_id, p_new_status);
END;
$function$;

-- Drop and recreate handle_new_order trigger function with proper search_path
DROP FUNCTION IF EXISTS public.handle_new_order() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.order_status_history (order_id, status)
  VALUES (NEW.id, NEW.status);
  RETURN NEW;
END;
$function$;

-- Recreate the trigger since we dropped the function with CASCADE
DROP TRIGGER IF EXISTS on_order_created ON public.orders;

CREATE TRIGGER on_order_created
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_order();