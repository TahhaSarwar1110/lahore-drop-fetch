CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
ALTER TABLE public.whatsapp_events ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE, ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.profiles(id), ADD COLUMN IF NOT EXISTS template_name text, ADD COLUMN IF NOT EXISTS template_params jsonb, ADD COLUMN IF NOT EXISTS send_status text NOT NULL DEFAULT 'legacy', ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0, ADD COLUMN IF NOT EXISTS message_id text, ADD COLUMN IF NOT EXISTS last_error text, ADD COLUMN IF NOT EXISTS next_attempt_at timestamptz, ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
CREATE INDEX whatsapp_events_pending_order ON public.whatsapp_events(order_id,send_status) WHERE template_name IS NOT NULL;
CREATE TABLE public.order_settlement_obligations (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE, kind text NOT NULL CHECK(kind IN ('refund','outstanding')), amount_pkr integer NOT NULL CHECK(amount_pkr>0), status text NOT NULL DEFAULT 'pending', reason text, components jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz, method text, reference text, proof_path text);
GRANT SELECT ON public.order_settlement_obligations TO authenticated;
GRANT ALL ON public.order_settlement_obligations TO service_role;
ALTER TABLE public.order_settlement_obligations ENABLE ROW LEVEL SECURITY;
CREATE POLICY settlement_obligations_read ON public.order_settlement_obligations FOR SELECT TO authenticated USING (public.user_owns_order(auth.uid(),order_id) OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin'));
CREATE UNIQUE INDEX settlement_one_open_kind ON public.order_settlement_obligations(order_id,kind) WHERE status IN ('pending','initiated','failed');
CREATE OR REPLACE FUNCTION public.queue_settlement_whatsapp(p_key text,p_order uuid,p_template text,p_params jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_customer uuid; v_headers jsonb; BEGIN
 SELECT user_id INTO v_customer FROM public.orders WHERE id=p_order;
 INSERT INTO public.whatsapp_events(event_id,event_type,order_id,customer_id,template_name,template_params,send_status) VALUES(p_key,p_template,p_order,v_customer,p_template,p_params,'pending') ON CONFLICT(event_id) DO NOTHING;
 IF FOUND THEN
  v_headers := COALESCE(NULLIF(current_setting('request.headers',true),''),'{}')::jsonb;
  IF COALESCE(v_headers->>'authorization','') <> '' THEN
   BEGIN
    PERFORM net.http_post(url:='https://oubqyskezyagkfoorzvy.supabase.co/functions/v1/notify',headers:=jsonb_build_object('Content-Type','application/json','Authorization',v_headers->>'authorization'),body:=jsonb_build_object('event_type','settlement_dispatch','order_id',p_order),timeout_milliseconds:=5000);
   EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;
 END IF;
END $$;
REVOKE ALL ON FUNCTION public.queue_settlement_whatsapp(text,uuid,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.queue_settlement_whatsapp(text,uuid,text,jsonb) TO service_role;
CREATE OR REPLACE FUNCTION public.capture_settlement_obligation() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_kind text; v_amount integer; v_id uuid; v_name text; v_reason text; v_row public.order_settlement_obligations%ROWTYPE;
BEGIN
 IF NEW.expense_status IS DISTINCT FROM 'verified' OR NEW.shopping_expense_pkr IS NULL THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' AND NEW.customer_balance_pkr IS NOT DISTINCT FROM OLD.customer_balance_pkr AND OLD.expense_status='verified' THEN RETURN NEW; END IF;
 SELECT full_name INTO v_name FROM public.profiles WHERE id=NEW.user_id;
 v_name:=COALESCE(NULLIF(v_name,''),'Customer');
 v_kind:=CASE WHEN NEW.customer_balance_pkr>0 THEN 'refund' WHEN NEW.customer_balance_pkr<0 THEN 'outstanding' ELSE NULL END;
 FOR v_row IN SELECT * FROM public.order_settlement_obligations WHERE order_id=NEW.id AND status IN ('pending','initiated','failed') FOR UPDATE LOOP
  IF v_kind IS NULL OR v_row.kind<>v_kind THEN UPDATE public.order_settlement_obligations SET status='resolved' WHERE id=v_row.id;
  ELSIF v_row.amount_pkr=abs(NEW.customer_balance_pkr) THEN RETURN NEW;
  ELSE UPDATE public.order_settlement_obligations SET status='superseded' WHERE id=v_row.id; END IF;
 END LOOP;
 IF v_kind IS NULL THEN RETURN NEW; END IF;
 v_amount:=abs(NEW.customer_balance_pkr);
 v_reason:=format('Verified purchases PKR %s + bundle/service PKR %s + additional delivery PKR %s, less verified payments PKR %s.',NEW.shopping_expense_pkr,round(coalesce(NEW.additional_charges,0)),round(coalesce(NEW.delivery_charges,0)),NEW.paid_amount_pkr);
 INSERT INTO public.order_settlement_obligations(order_id,kind,amount_pkr,reason,components) VALUES(NEW.id,v_kind,v_amount,v_reason,jsonb_build_object('shopping_expense_pkr',NEW.shopping_expense_pkr,'bundle_pkr',round(coalesce(NEW.additional_charges,0)),'delivery_pkr',round(coalesce(NEW.delivery_charges,0)),'paid_amount_pkr',NEW.paid_amount_pkr)) RETURNING id INTO v_id;
 PERFORM public.queue_settlement_whatsapp(v_id::text||':'||v_kind||'_due',NEW.id,CASE WHEN v_kind='refund' THEN 'tabedaar_refund_due' ELSE 'tabedaar_outstanding_balance' END,jsonb_build_array(v_name,left(NEW.id::text,8),to_char(v_amount,'FM999,999,999,990'),CASE WHEN v_kind='refund' THEN 'Pending' ELSE v_reason END));
 RETURN NEW;
END $$;
CREATE TRIGGER capture_settlement_obligation AFTER UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.capture_settlement_obligation();
CREATE OR REPLACE FUNCTION public.capture_settlement_audit_notification() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_name text; v_amount integer; v_ref text; v_ob public.order_settlement_obligations%ROWTYPE; v_order public.orders%ROWTYPE;
BEGIN
 SELECT * INTO v_order FROM public.orders WHERE id=NEW.order_id;
 SELECT full_name INTO v_name FROM public.profiles WHERE id=v_order.user_id;
 v_name:=coalesce(nullif(v_name,''),'Customer');
 IF NEW.event_type='payment_verified' THEN
  v_amount:=coalesce((NEW.new_value->>'paid_amount_pkr')::integer,0)-coalesce((NEW.old_value->>'paid_amount_pkr')::integer,0);
  IF v_amount>0 THEN PERFORM public.queue_settlement_whatsapp(NEW.id::text||':payment_confirmed',NEW.order_id,'tabedaar_payment_confirmed',jsonb_build_array(v_name,left(NEW.order_id::text,8),to_char(v_amount,'FM999,999,999,990'))); END IF;
 ELSIF NEW.event_type='refund_completed' THEN
  SELECT * INTO v_ob FROM public.order_settlement_obligations WHERE order_id=NEW.order_id AND kind='refund' AND status='completed' ORDER BY completed_at DESC LIMIT 1;
  IF FOUND THEN PERFORM public.queue_settlement_whatsapp(v_ob.id::text||':refund_completed',NEW.order_id,'tabedaar_refund_completed',jsonb_build_array(v_name,left(NEW.order_id::text,8),to_char(v_ob.amount_pkr,'FM999,999,999,990'),replace(v_ob.method,'_',' '),v_ob.reference)); END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER capture_settlement_audit_notification AFTER INSERT ON public.order_financial_events FOR EACH ROW EXECUTE FUNCTION public.capture_settlement_audit_notification();
CREATE OR REPLACE FUNCTION public.claim_settlement_whatsapp(p_order uuid) RETURNS SETOF public.whatsapp_events LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 RETURN QUERY UPDATE public.whatsapp_events SET send_status='sending',attempts=attempts+1,updated_at=now() WHERE event_id IN (SELECT event_id FROM public.whatsapp_events WHERE order_id=p_order AND template_name IS NOT NULL AND (send_status='pending' OR (send_status='retry' AND next_attempt_at<=now())) ORDER BY created_at LIMIT 20 FOR UPDATE SKIP LOCKED) RETURNING *;
END $$;
REVOKE ALL ON FUNCTION public.claim_settlement_whatsapp(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_settlement_whatsapp(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.capture_settlement_obligation() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.capture_settlement_audit_notification() FROM PUBLIC,anon,authenticated;