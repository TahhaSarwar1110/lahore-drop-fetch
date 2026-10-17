CREATE OR REPLACE FUNCTION public.sync_verified_payment_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.payment_verification = 'verified' AND NEW.order_total_pkr IS NOT NULL THEN
    IF NEW.paid_amount_pkr >= (CASE WHEN NEW.expense_status = 'verified' AND NEW.shopping_expense_pkr IS NOT NULL THEN NEW.shopping_expense_pkr ELSE NEW.order_total_pkr END) THEN
      NEW.payment_status := 'confirmed';
      NEW.payment_confirmed_at := COALESCE(NEW.payment_verified_at, NEW.payment_confirmed_at, now());
      NEW.payment_confirmed_by := COALESCE(NEW.payment_verified_by, NEW.payment_confirmed_by);
    ELSE
      NEW.payment_status := 'pending';
    END IF;
  ELSIF NEW.payment_verification = 'rejected' THEN
    NEW.payment_status := 'rejected';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_verified_payment_status() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER zzz_sync_verified_payment_status BEFORE INSERT OR UPDATE OF payment_verification, paid_amount_pkr, order_total_pkr, expense_status, shopping_expense_pkr ON public.orders FOR EACH ROW EXECUTE FUNCTION public.sync_verified_payment_status();