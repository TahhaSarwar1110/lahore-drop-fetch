// Durable settlement sends reuse whatsapp_events and the existing signed webhook/inbox.
// No provider credentials or recipient supplied by the caller is trusted here.
export const SETTLEMENT_TEMPLATES: Record<string, number> = {
  tabedaar_order_review_payment: 6,
  tabedaar_items_reviewed: 5,
  tabedaar_payment_required_after_review: 5,
  tabedaar_refund_due: 4,
  tabedaar_outstanding_balance: 4,
  tabedaar_payment_confirmed: 3,
  tabedaar_refund_completed: 5,
};

export const normalizeSettlementPhone = (raw: string): string | null => {
  let digits = raw.replace(/\D/g, "").replace(/^00/, "");
  if (/^03\d{9}$/.test(digits)) digits = `92${digits.slice(1)}`;
  else if (/^3\d{9}$/.test(digits)) digits = `92${digits}`;
  return /^[1-9]\d{9,14}$/.test(digits) ? digits : null;
};

export const sanitizeSettlementParam = (value: unknown): string =>
  String(value ?? "").replace(/[\r\n\t]+/g, " ").replace(/ {4,}/g, "   ").trim().slice(0, 1000) || "-";

export const settlementRetryStatus = (status: number, attempts: number): string =>
  (status === 429 || status >= 500) && attempts < 3 ? "retry" : "failed";

// deno-lint-ignore no-explicit-any
type Db = any;

export async function dispatchSettlementWhatsApp(db: Db, orderId: string) {
  const phoneId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
  const token = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
  if (!phoneId || !token) return;
  const { data: claimed, error } = await db.rpc("claim_settlement_whatsapp", { p_order: orderId });
  if (error) throw new Error(error.message);
  for (const event of claimed ?? []) {
    let providerAccepted = false;
    try {
      const { data: prefs } = await db.from("notification_preferences").select("whatsapp_enabled").eq("user_id", event.customer_id).maybeSingle();
      const { data: profile } = await db.from("profiles").select("phone, full_name").eq("id", event.customer_id).maybeSingle();
      const to = normalizeSettlementPhone(profile?.phone ?? "");
      if (prefs?.whatsapp_enabled === false || !to) {
        await db.from("whatsapp_events").update({ send_status: "skipped", last_error: !to ? "No valid customer phone" : "Customer opted out" }).eq("event_id", event.event_id);
        continue;
      }
      const params = Array.isArray(event.template_params) ? event.template_params.map(sanitizeSettlementParam) : [];
      if (SETTLEMENT_TEMPLATES[event.template_name] !== params.length) throw new Error("Invalid stored template parameter count");
      const response = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ messaging_product: "whatsapp", to, type: "template", template: {
          name: event.template_name, language: { code: "en" },
          components: [{ type: "body", parameters: params.map((text: string) => ({ type: "text", text })) }],
        } }),
        signal: AbortSignal.timeout(15000),
      });
      const raw = await response.text();
      let data: any = {};
      try { data = JSON.parse(raw); } catch { /* ambiguous successful response stays unknown */ }
      providerAccepted = response.ok;
      const id = data.messages?.[0]?.id;
      const status = response.ok ? id ? "sent" : "unknown" : settlementRetryStatus(response.status, event.attempts);
      const safeError = response.ok ? null : `Meta ${response.status}: ${data.error?.code ?? "unknown"} ${String(data.error?.message ?? "Request rejected").slice(0, 300)}`;
      const { error: updateError } = await db.from("whatsapp_events").update({ send_status: status, message_id: id ?? null, last_error: safeError, next_attempt_at: status === "retry" ? new Date(Date.now() + 60000).toISOString() : null, updated_at: new Date().toISOString() }).eq("event_id", event.event_id);
      if (updateError) throw new Error(updateError.message);
      await db.from("notification_deliveries").insert({ user_id: event.customer_id, channel: "whatsapp", status, event_type: event.event_type, dedupe_key: `${event.event_id}:attempt:${event.attempts}`, error: safeError });
      if (id) {
        const { data: existingConversation } = await db.from("whatsapp_conversations").select("id").eq("phone", to).maybeSingle();
        const conversationResult = existingConversation
          ? { data: existingConversation, error: null }
          : await db.from("whatsapp_conversations").upsert({ phone: to, display_name: profile?.full_name ?? "Customer", customer_user_id: event.customer_id }, { onConflict: "phone", ignoreDuplicates: true }).select("id").maybeSingle();
        const conversation = conversationResult.data;
        const convError = conversationResult.error;
        if (convError) throw new Error(convError.message);
        if (!conversation) throw new Error("Conversation write requires reconciliation");
        const { error: messageError } = await db.from("whatsapp_messages").upsert({ conversation_id: conversation.id, wa_message_id: id, direction: "outbound", msg_type: "template", body: `[Template: ${event.template_name}] ${params.join(" | ")}`, status: "sent", status_updated_at: new Date().toISOString() }, { onConflict: "wa_message_id", ignoreDuplicates: true });
        if (messageError) throw new Error(messageError.message);
      }
      console.log(JSON.stringify({ scope: "settlement-whatsapp", key: event.event_id, template: event.template_name, status, message_id: id ?? null, attempt: event.attempts, error: safeError }));
    } catch (e) {
      // Never release a send claim after a timeout or a post-acceptance storage failure.
      // A request may already have reached Meta; blind retries could duplicate money notices.
      const message = providerAccepted ? "Meta accepted; local tracking needs reconciliation" : String((e as Error)?.message ?? e).slice(0, 300);
      await db.from("whatsapp_events").update({ send_status: "unknown", last_error: message, updated_at: new Date().toISOString() }).eq("event_id", event.event_id);
      await db.from("notification_deliveries").insert({ user_id: event.customer_id, channel: "whatsapp", status: "unknown", event_type: event.event_type, dedupe_key: `${event.event_id}:attempt:${event.attempts}`, error: message });
      console.error(JSON.stringify({ scope: "settlement-whatsapp", key: event.event_id, status: "unknown", error: message }));
    }
  }
}