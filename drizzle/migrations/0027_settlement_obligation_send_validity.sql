CREATE OR REPLACE FUNCTION public.suppress_obsolete_settlement_messages() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF NEW.status IN('resolved','superseded','completed') THEN
  UPDATE public.whatsapp_events SET send_status='superseded',updated_at=now() WHERE order_id=NEW.order_id AND event_id LIKE NEW.id::text||':%' AND template_name IN('tabedaar_refund_due','tabedaar_outstanding_balance') AND send_status IN('pending','retry');
 END IF; RETURN NEW;
END $$;
CREATE TRIGGER suppress_obsolete_settlement_messages AFTER UPDATE ON public.order_settlement_obligations FOR EACH ROW EXECUTE FUNCTION public.suppress_obsolete_settlement_messages();
REVOKE ALL ON FUNCTION public.suppress_obsolete_settlement_messages() FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.claim_settlement_whatsapp(p_order uuid) RETURNS SETOF public.whatsapp_events LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 RETURN QUERY UPDATE public.whatsapp_events SET send_status='sending',attempts=attempts+1,updated_at=now() WHERE event_id IN (SELECT event_id FROM public.whatsapp_events WHERE order_id=p_order AND template_name IS NOT NULL AND (send_status='pending' OR (send_status='retry' AND next_attempt_at<=now())) ORDER BY CASE WHEN template_name='tabedaar_payment_confirmed' THEN 0 ELSE 1 END,created_at LIMIT 20 FOR UPDATE SKIP LOCKED) RETURNING *;
END $$;