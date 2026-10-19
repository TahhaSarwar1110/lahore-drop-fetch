CREATE OR REPLACE FUNCTION public.order_settlement_total(p_goods integer, p_bundle numeric, p_delivery numeric) RETURNS integer LANGUAGE sql IMMUTABLE SET search_path = public AS $$ SELECT COALESCE(p_goods,0) + ROUND(COALESCE(p_bundle,0))::integer + ROUND(COALESCE(p_delivery,0))::integer $$;
GRANT EXECUTE ON FUNCTION public.order_settlement_total(integer,numeric,numeric) TO authenticated, service_role;
DO $$ DECLARE v text; n text; BEGIN
FOREACH n IN ARRAY ARRAY['enforce_settlement_before_delivery','sync_verified_payment_status','verify_order_payment','verify_shopping_expense'] LOOP
SELECT pg_get_functiondef(p.oid) INTO v FROM pg_proc p JOIN pg_namespace ns ON ns.oid=p.pronamespace WHERE ns.nspname='public' AND p.proname=n;
IF v IS NULL THEN RAISE EXCEPTION 'Missing financial function %', n; END IF;
v := replace(v, 'COALESCE(NEW.paid_amount_pkr, 0) - NEW.shopping_expense_pkr', 'COALESCE(NEW.paid_amount_pkr, 0) - public.order_settlement_total(NEW.shopping_expense_pkr, NEW.additional_charges, NEW.delivery_charges)');
v := replace(v, 'THEN NEW.shopping_expense_pkr ELSE NEW.order_total_pkr END', 'THEN public.order_settlement_total(NEW.shopping_expense_pkr, NEW.additional_charges, NEW.delivery_charges) ELSE NEW.order_total_pkr + ROUND(COALESCE(NEW.delivery_charges,0))::integer END');
v := replace(v, 'v_new_total - v_old.shopping_expense_pkr', 'v_new_total - public.order_settlement_total(v_old.shopping_expense_pkr, v_old.additional_charges, v_old.delivery_charges)');
v := replace(v, 'v_old.paid_amount_pkr - v_old.shopping_expense_pkr', 'v_old.paid_amount_pkr - public.order_settlement_total(v_old.shopping_expense_pkr, v_old.additional_charges, v_old.delivery_charges)');
v := replace(v, 'COALESCE(v_old.paid_amount_pkr, 0) - COALESCE(v_old.shopping_expense_pkr, 0)', 'COALESCE(v_old.paid_amount_pkr, 0) - public.order_settlement_total(v_old.shopping_expense_pkr, v_old.additional_charges, v_old.delivery_charges)');
EXECUTE v;
END LOOP;
END $$;
CREATE OR REPLACE FUNCTION public.sync_changed_order_charges() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN
IF NEW.additional_charges IS DISTINCT FROM OLD.additional_charges AND NEW.order_total_pkr IS NOT NULL THEN
NEW.order_total_pkr := NEW.order_total_pkr - ROUND(COALESCE(OLD.additional_charges,0))::integer + ROUND(COALESCE(NEW.additional_charges,0))::integer;
END IF;
RETURN NEW;
END $$;
CREATE TRIGGER sync_changed_order_charges BEFORE UPDATE OF additional_charges ON public.orders FOR EACH ROW EXECUTE FUNCTION public.sync_changed_order_charges();
CREATE OR REPLACE FUNCTION public.invalidate_unsettled_delivery_release() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN
IF NEW.status NOT IN ('Delivered','Cancelled') AND NEW.expense_status='verified' AND NEW.shopping_expense_pkr IS NOT NULL THEN
IF NEW.customer_balance_pkr > 0 AND OLD.refund_status='completed' AND NEW.customer_balance_pkr IS DISTINCT FROM OLD.customer_balance_pkr THEN
NEW.refund_status := 'pending'; NEW.refund_completed_at := NULL; NEW.refund_completed_by := NULL;
END IF;
IF NEW.customer_balance_pkr < 0 OR (NEW.customer_balance_pkr > 0 AND NEW.refund_status <> 'completed') THEN
NEW.ready_for_delivery_at := NULL; NEW.ready_for_delivery_by := NULL;
IF NEW.status='Ready for Delivery' THEN NEW.status := 'Purchasing'; END IF;
END IF;
END IF;
RETURN NEW;
END $$;
CREATE TRIGGER zzz_invalidate_unsettled_delivery_release BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.invalidate_unsettled_delivery_release();
COMMENT ON COLUMN public.orders.order_total_pkr IS 'Initial payable snapshot including bundle service charges, excluding third-party delivery. UI Order Total subtracts bundle charges to show goods only; settlement uses verified goods expense plus separate charges.';