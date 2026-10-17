CREATE OR REPLACE FUNCTION public.enforce_settlement_before_delivery()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Keep the customer balance in sync once the shopping expense is verified
  IF NEW.expense_status = 'verified' AND NEW.shopping_expense_pkr IS NOT NULL THEN
    NEW.customer_balance_pkr := COALESCE(NEW.paid_amount_pkr, 0) - NEW.shopping_expense_pkr;
    IF NEW.customer_balance_pkr > 0 AND NEW.refund_status = 'none' THEN
      NEW.refund_status := 'pending';
    ELSIF NEW.customer_balance_pkr <= 0 AND NEW.refund_status = 'pending' THEN
      NEW.refund_status := 'none';
    END IF;
    -- Customer still owes money: reopen payment so they can upload a top-up
    IF NEW.customer_balance_pkr < 0 AND NEW.payment_verification = 'verified' THEN
      NEW.payment_status := 'pending';
    END IF;
  END IF;

  IF NEW.status IN ('In Delivery', 'Delivered')
     AND NEW.status IS DISTINCT FROM OLD.status
     AND NEW.order_total_pkr IS NOT NULL THEN
    IF NEW.expense_status IS DISTINCT FROM 'verified' THEN
      RAISE EXCEPTION 'Delivery blocked: shopping expense must be verified first' USING ERRCODE = '42501';
    END IF;
    IF NEW.customer_balance_pkr < 0 THEN
      RAISE EXCEPTION 'Delivery blocked: customer must pay the remaining amount first' USING ERRCODE = '42501';
    END IF;
    IF NEW.customer_balance_pkr > 0 AND NEW.refund_status IS DISTINCT FROM 'completed' THEN
      RAISE EXCEPTION 'Delivery blocked: customer refund must be completed first' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS zz_enforce_settlement_before_delivery ON public.orders;
CREATE TRIGGER zz_enforce_settlement_before_delivery
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.enforce_settlement_before_delivery();