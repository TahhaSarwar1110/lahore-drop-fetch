CREATE OR REPLACE FUNCTION public.queue_review_whatsapp(p_order_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_o public.orders%ROWTYPE; v_version text; v_approved text; v_rejected text; v_reasons text; v_name text; v_goods integer; v_count integer; v_key text; v_due integer; v_paid boolean;
BEGIN
 SELECT * INTO v_o FROM public.orders WHERE id=p_order_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
 IF auth.uid() IS NULL OR NOT(public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin')) THEN RAISE EXCEPTION 'Manager access required' USING ERRCODE='42501'; END IF;
 IF v_o.status='Cancelled' THEN RETURN; END IF;
 SELECT count(*),md5(string_agg(id::text||':'||coalesce(approval_status,'pending')||':'||coalesce(manager_price_pkr::text,'')||':'||coalesce(manager_feedback,''),'|' ORDER BY id)),coalesce(sum(manager_price_pkr) FILTER(WHERE approval_status='approved'),0),string_agg(coalesce(item_data->>'Item Name',item_data->>'Item Description',item_data->>'Gift Description',item_data->>'Description',item_type),' | ' ORDER BY id) FILTER(WHERE approval_status='approved'),string_agg(coalesce(item_data->>'Item Name',item_data->>'Item Description',item_data->>'Gift Description',item_data->>'Description',item_type),' | ' ORDER BY id) FILTER(WHERE approval_status='rejected'),string_agg(coalesce(item_data->>'Item Name',item_data->>'Item Description',item_type)||': '||manager_feedback,' | ' ORDER BY id) FILTER(WHERE approval_status='rejected') INTO v_count,v_version,v_goods,v_approved,v_rejected,v_reasons FROM public.order_items WHERE order_id=p_order_id;
 IF v_count=0 OR EXISTS(SELECT 1 FROM public.order_items WHERE order_id=p_order_id AND (approval_status IS NULL OR approval_status='pending' OR (approval_status='approved' AND manager_price_pkr IS NULL))) THEN RETURN; END IF;
 SELECT full_name INTO v_name FROM public.profiles WHERE id=v_o.user_id;
 v_name:=coalesce(nullif(v_name,''),'Customer');
 v_due:=greatest(0,v_goods+round(coalesce(v_o.additional_charges,0))::integer+round(coalesce(v_o.delivery_charges,0))::integer-v_o.paid_amount_pkr);
 v_key:=p_order_id::text||':review:'||v_version;
 v_paid:=v_o.confirmed_at IS NOT NULL AND v_approved IS NOT NULL AND v_due>0;
 IF v_paid THEN
  IF EXISTS(SELECT 1 FROM public.whatsapp_events WHERE event_id=v_key||':review_only' AND send_status IN ('sending','sent','delivered','read','unknown','legacy')) THEN
   PERFORM public.queue_settlement_whatsapp(v_key||':payment_due:'||v_due,p_order_id,'tabedaar_payment_required_after_review',jsonb_build_array(v_name,left(p_order_id::text,8),left(v_approved,900),left(coalesce(v_rejected,'None'),900),to_char(v_due,'FM999,999,999,990')));
  ELSE
   UPDATE public.whatsapp_events SET send_status='superseded',updated_at=now() WHERE event_id=v_key||':review_only' AND send_status IN ('pending','retry');
   PERFORM public.queue_settlement_whatsapp(v_key||':payment_due:'||v_due,p_order_id,'tabedaar_order_review_payment',jsonb_build_array(v_name,left(p_order_id::text,8),left(v_approved,900),left(coalesce(v_rejected,'None'),900),left(coalesce(v_reasons,'Not applicable'),900),to_char(v_due,'FM999,999,999,990')));
  END IF;
 ELSE
  IF NOT EXISTS(SELECT 1 FROM public.whatsapp_events WHERE event_id LIKE v_key||':payment_due:%') THEN
   PERFORM public.queue_settlement_whatsapp(v_key||':review_only',p_order_id,'tabedaar_items_reviewed',jsonb_build_array(v_name,left(p_order_id::text,8),left(coalesce(v_approved,'None'),900),left(coalesce(v_rejected,'None'),900),left(coalesce(v_reasons,'Not applicable'),900)));
  END IF;
 END IF;
END $$;
REVOKE ALL ON FUNCTION public.queue_review_whatsapp(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.queue_review_whatsapp(uuid) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.update_refund_status(p_order_id uuid,p_status text,p_method text DEFAULT NULL,p_reference text DEFAULT NULL,p_notes text DEFAULT NULL,p_proof_url text DEFAULT NULL,p_proof_name text DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_old public.orders%ROWTYPE; v_ob public.order_settlement_obligations%ROWTYPE; v_ref text; v_method text; v_proof text;
BEGIN
 IF auth.uid() IS NULL OR NOT(public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin')) THEN RAISE EXCEPTION 'Manager access required' USING ERRCODE='42501'; END IF;
 IF p_status IS NULL OR p_status NOT IN('pending','initiated','completed','failed') THEN RAISE EXCEPTION 'Invalid refund status' USING ERRCODE='22023'; END IF;
 SELECT * INTO v_old FROM public.orders WHERE id=p_order_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
 IF v_old.refund_status='completed' THEN RAISE EXCEPTION 'Refund already completed' USING ERRCODE='22023'; END IF;
 IF v_old.expense_status IS DISTINCT FROM 'verified' OR coalesce(v_old.customer_balance_pkr,0)<=0 THEN RAISE EXCEPTION 'No verified refund due' USING ERRCODE='22023'; END IF;
 SELECT * INTO v_ob FROM public.order_settlement_obligations WHERE order_id=p_order_id AND kind='refund' AND status IN('pending','initiated','failed') FOR UPDATE;
 IF NOT FOUND THEN
  INSERT INTO public.order_settlement_obligations(order_id,kind,amount_pkr) VALUES(p_order_id,'refund',v_old.customer_balance_pkr) RETURNING * INTO v_ob;
 END IF;
 v_method:=coalesce(nullif(btrim(p_method),''),v_old.refund_method);
 v_ref:=coalesce(nullif(btrim(p_reference),''),nullif(btrim(v_old.refund_reference),''));
 v_proof:=coalesce(nullif(p_proof_url,''),v_old.refund_proof_url);
 IF p_proof_url IS NOT NULL THEN
  IF p_proof_url NOT LIKE 'receipts/'||auth.uid()::text||'/'||p_order_id::text||'/refund-%' OR NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='pickup-proofs' AND name=p_proof_url) THEN RAISE EXCEPTION 'Invalid refund proof' USING ERRCODE='22023'; END IF;
 END IF;
 IF p_status='completed' THEN
  IF v_method IS NULL OR v_method NOT IN('bank_transfer','mobile_wallet','cash') THEN RAISE EXCEPTION 'Select a refund method' USING ERRCODE='22023'; END IF;
  IF v_ref IS NULL AND coalesce(v_proof,'')='' THEN RAISE EXCEPTION 'A reference or proof is required to complete a refund' USING ERRCODE='22023'; END IF;
  IF v_ref IS NULL THEN v_ref:='TDB-'||left(p_order_id::text,8)||'-R'||to_char(v_ob.created_at,'YYYYMMDDHH24MISS'); END IF;
 END IF;
 UPDATE public.order_settlement_obligations SET status=p_status,method=v_method,reference=v_ref,proof_path=v_proof,completed_at=CASE WHEN p_status='completed' THEN now() ELSE NULL END WHERE id=v_ob.id;
 UPDATE public.orders SET refund_status=p_status,refund_method=v_method,refund_reference=v_ref,refund_notes=coalesce(p_notes,refund_notes),refund_proof_url=v_proof,refund_proof_name=coalesce(p_proof_name,refund_proof_name),refund_completed_by=CASE WHEN p_status='completed' THEN auth.uid() ELSE refund_completed_by END,refund_completed_at=CASE WHEN p_status='completed' THEN now() ELSE refund_completed_at END WHERE id=p_order_id;
 INSERT INTO public.order_financial_events(order_id,event_type,actor_id,old_value,new_value,note) VALUES(p_order_id,'refund_'||p_status,auth.uid(),jsonb_build_object('refund_status',v_old.refund_status,'customer_balance_pkr',v_old.customer_balance_pkr),jsonb_build_object('refund_status',p_status,'refund_method',v_method,'refund_reference',v_ref,'refund_amount_pkr',v_ob.amount_pkr,'refund_obligation_id',v_ob.id),p_notes);
END $$;
CREATE OR REPLACE FUNCTION public.invalidate_unsettled_delivery_release() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF NEW.status NOT IN('Delivered','Cancelled','In Delivery') AND NEW.expense_status='verified' AND NEW.shopping_expense_pkr IS NOT NULL THEN
  IF NEW.customer_balance_pkr>0 AND OLD.refund_status='completed' AND NEW.customer_balance_pkr IS DISTINCT FROM OLD.customer_balance_pkr THEN RAISE EXCEPTION 'Completed refund settlement cannot be changed without reconciliation' USING ERRCODE='42501'; END IF;
  IF NEW.customer_balance_pkr<0 THEN NEW.ready_for_delivery_at:=NULL; NEW.ready_for_delivery_by:=NULL; IF NEW.status='Ready for Delivery' THEN NEW.status:='Purchasing'; END IF; END IF;
 END IF; RETURN NEW; END $$;