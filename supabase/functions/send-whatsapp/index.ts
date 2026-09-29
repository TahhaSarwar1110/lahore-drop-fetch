import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
const WHATSAPP_ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface WhatsAppRequest {
  /** Send to a specific app user (phone resolved from their profile) */
  userId?: string;
  /** Or broadcast to everyone holding a role, e.g. "manager" | "admin" | "rider" */
  role?: string;
  /** Or an explicit E.164 number */
  phone?: string;
  /** Plain text body (used when no template is provided) */
  message: string;
  /** Optional approved template */
  templateName?: string;
  templateLanguage?: string;
  templateParams?: string[];
}

const normalizePhone = (raw: string): string | null => {
  const digits = (raw || "").replace(/\D/g, "");
  if (digits.length < 8) return null;
  // Local Pakistani format (03001234567) -> 923001234567
  if (digits.startsWith("0")) return `92${digits.slice(1)}`;
  return digits;
};

const post = async (payload: unknown) => {
  const res = await fetch(
    `https://graph.facebook.com/v20.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );
  const data = await res.json();
  return { ok: res.ok, data };
};

const textPayload = (to: string, message: string) => ({
  messaging_product: "whatsapp",
  to,
  type: "text",
  text: { preview_url: false, body: message },
});

/**
 * Allows remapping a template name without a code change, e.g. set secret
 * WHATSAPP_TEMPLATE_TABEDAAR_ORDER_RECEIVED=order_received_v2
 */
const resolveTemplateName = (name: string): string =>
  Deno.env.get(`WHATSAPP_TEMPLATE_${name.toUpperCase()}`) || name;

const templatePayload = (to: string, body: WhatsAppRequest) => ({
  messaging_product: "whatsapp",
  to,
  type: "template",
  template: {
    name: resolveTemplateName(body.templateName as string),
    language: { code: body.templateLanguage || "en" },
    components: body.templateParams?.length
      ? [
          {
            type: "body",
            parameters: body.templateParams.map((text) => ({
              type: "text",
              text,
            })),
          },
        ]
      : undefined,
  },
});

/** True only when the recipient messaged us within the last 24 hours. */
const hasOpenServiceWindow = async (
  supabase: any,
  to: string,
): Promise<boolean> => {
  const { data } = await supabase
    .from("whatsapp_contacts")
    .select("last_inbound_at")
    .eq("phone", to)
    .maybeSingle();

  if (!data?.last_inbound_at) return false;
  const last = new Date(data.last_inbound_at).getTime();
  return Number.isFinite(last) && Date.now() - last < 24 * 60 * 60 * 1000;
};

const sendMessage = async (to: string, body: WhatsAppRequest, supabase: any) => {
  // Business-initiated messages MUST use an approved template. Plain text is
  // only allowed when we have evidence of an open 24h customer service window.
  let lastTemplateError: unknown = null;
  if (body.templateName) {
    // Try the requested language, then common variants (Meta is strict here).
    const languages = [...new Set([body.templateLanguage || "en", "en_US", "en"])];
    let attempt = { ok: false, data: null as unknown };
    for (const language of languages) {
      attempt = await post(templatePayload(to, { ...body, templateLanguage: language }));
      if (attempt.ok) {
        return { to, ok: true, channel: "template", language, data: attempt.data };
      }
      lastTemplateError = attempt.data;
    }
    lastTemplateError = attempt.data;
    console.error(
      `WhatsApp template "${resolveTemplateName(body.templateName)}" failed:`,
      JSON.stringify(attempt.data),
    );
  }

  const windowOpen = await hasOpenServiceWindow(supabase, to);
  if (!windowOpen) {
    console.error(
      `Skipping free-form WhatsApp text to recipient: no open 24h service window${
        body.templateName ? " and template delivery failed" : " and no template provided"
      }`,
    );
    return {
      to,
      ok: false,
      error: "no_approved_template_delivery",
      details: lastTemplateError,
    };
  }

  const fallback = await post(textPayload(to, body.message));
  if (!fallback.ok) {
    console.error("WhatsApp API error:", JSON.stringify(fallback.data));
    return { to, ok: false, error: fallback.data };
  }
  return { to, ok: true, channel: "text", data: fallback.data };
};

const json = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const ORDER_RECEIVED_TEMPLATE = "tabedaar_order_received";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Meta rejects params with newlines/tabs or 4+ consecutive spaces. */
const cleanParam = (s: string, max = 900) =>
  (s || "").replace(/[\r\n\t]+/g, " ").replace(/ {4,}/g, "   ").trim().slice(0, max) || "-";

const num = (v: unknown) => {
  const n = parseFloat(String(v ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : 0;
};
const qtyOf = (d: Record<string, unknown>) => {
  const e = Object.entries(d || {}).find(([k]) => {
    const l = k.toLowerCase();
    return l.includes("quantity") || l === "qty";
  });
  const q = parseInt(String(e?.[1] ?? "").replace(/[^0-9]/g, ""), 10);
  return Number.isFinite(q) && q > 0 ? q : 1;
};
const priceOf = (d: Record<string, unknown>) => {
  const e = Object.entries(d || {}).find(([k]) => k.toLowerCase().includes("price"));
  return num(e?.[1]);
};
const nameOf = (d: Record<string, unknown>, type: string) => {
  const e = Object.entries(d || {}).find(([k]) => /name|title|description/i.test(k));
  return String(e?.[1] ?? "").trim() || type;
};
const rs = (n: number) => `Rs. ${Math.round(n).toLocaleString("en-PK")}`;

async function handleOrderReceived(supabase: any, callerId: string, orderId: unknown) {
  if (typeof orderId !== "string" || !UUID_RE.test(orderId)) {
    return json({ error: "valid orderId is required" }, 400);
  }

  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select("id, user_id, additional_charges, delivery_charges")
    .eq("id", orderId)
    .maybeSingle();
  if (orderErr || !order) return json({ error: "Order not found" }, 404);
  if (order.user_id !== callerId) return json({ error: "Forbidden" }, 403);

  const { data: items } = await supabase
    .from("order_items")
    .select("item_type, item_data, approval_status")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });
  const live = (items ?? []).filter((i: any) => i.approval_status !== "rejected");
  if (!live.length) return json({ error: "Order has no items yet" }, 409);

  const { data: prefs } = await supabase
    .from("notification_preferences").select("whatsapp_enabled")
    .eq("user_id", callerId).maybeSingle();
  if (prefs && prefs.whatsapp_enabled === false) {
    return json({ success: false, skipped: "opted_out" });
  }

  const { data: profile } = await supabase
    .from("profiles").select("full_name, phone").eq("id", callerId).maybeSingle();
  const to = normalizePhone(profile?.phone ?? "");
  if (!to) return json({ error: "Customer profile has no valid phone" }, 404);

  // Idempotency: one confirmation per order, ever (unless the send failed).
  const eventId = `order_received:${orderId}`;
  const { error: claimErr } = await supabase
    .from("whatsapp_events")
    .insert({ event_id: eventId, event_type: "order_received_sent" });
  if (claimErr) {
    if (claimErr.code === "23505") {
      console.log(`[order_received] duplicate skipped order=${orderId}`);
      return json({ success: true, duplicate: true });
    }
    console.error(`[order_received] claim failed order=${orderId}: ${claimErr.message}`);
    return json({ error: "Could not record send" }, 500);
  }

  let itemsTotal = 0;
  const lines = live.map((i: any, idx: number) => {
    const d = (i.item_data ?? {}) as Record<string, unknown>;
    const q = qtyOf(d);
    const line = priceOf(d) * q;
    itemsTotal += line;
    return `${idx + 1}) ${nameOf(d, i.item_type)} x${q}${line ? ` - ${rs(line)}` : ""}`;
  });
  const total = itemsTotal + num(order.additional_charges) + num(order.delivery_charges);

  const params = [
    cleanParam(profile?.full_name || "Customer", 60),
    orderId.slice(0, 8),
    cleanParam(lines.join(" | ")),
    rs(total),
  ];

  let result: any = { ok: false };
  for (const language of ["en", "en_US"]) {
    result = await post({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: resolveTemplateName(ORDER_RECEIVED_TEMPLATE),
        language: { code: language },
        components: [{ type: "body", parameters: params.map((text) => ({ type: "text", text })) }],
      },
    });
    if (result.ok) {
      const msgId = result.data?.messages?.[0]?.id;
      console.log(`[order_received] sent order=${orderId} lang=${language} to=***${to.slice(-4)} msg=${msgId}`);
      return json({ success: true, language, messageId: msgId });
    }
  }

  // Release the claim so a later retry can try again.
  await supabase.from("whatsapp_events").delete().eq("event_id", eventId);
  const err = result.data?.error ?? {};
  console.error(`[order_received] failed order=${orderId} to=***${to.slice(-4)} code=${err.code} msg=${err.message}`);
  return json({ success: false, error: "template_send_failed", code: err.code, details: err.message });
}


serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!WHATSAPP_PHONE_NUMBER_ID || !WHATSAPP_ACCESS_TOKEN) {
      return new Response(
        JSON.stringify({ error: "WhatsApp credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Require an authenticated caller
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } =
      await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawBody = await req.json();

    // ---- Server-built order confirmation (tabedaar_order_received) ----
    if (rawBody?.event === "order_received") {
      return await handleOrderReceived(supabaseAdmin, user.id, rawBody.orderId);
    }

    const body: WhatsAppRequest = rawBody;
    if (!body.message || typeof body.message !== "string") {
      return new Response(JSON.stringify({ error: "message is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve recipients
    const recipients: string[] = [];

    /** Drops users who switched WhatsApp notifications off in their settings. */
    const filterOptedIn = async (ids: string[]): Promise<string[]> => {
      if (!ids.length) return [];
      const { data: prefs } = await supabaseAdmin
        .from("notification_preferences")
        .select("user_id, whatsapp_enabled")
        .in("user_id", ids);
      const optedOut = new Set(
        (prefs ?? [])
          .filter((p: { whatsapp_enabled: boolean }) => p.whatsapp_enabled === false)
          .map((p: { user_id: string }) => p.user_id),
      );
      return ids.filter((id) => !optedOut.has(id));
    };

    /** Returns how many opted-in users were allowed through. */
    const addPhonesForUsers = async (ids: string[]) => {
      const allowed = await filterOptedIn(ids);
      if (!allowed.length) return 0;
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("phone")
        .in("id", allowed);
      (profiles ?? []).forEach((pr) => {
        const p = normalizePhone(pr.phone ?? "");
        if (p) recipients.push(p);
      });
      return allowed.length;
    };

    if (body.userId) {
      const before = recipients.length;
      const allowed = await addPhonesForUsers([body.userId]);
      // Profile has no usable phone: fall back to the number supplied by the caller
      if (allowed && recipients.length === before && body.phone) {
        const p = normalizePhone(body.phone);
        if (p) recipients.push(p);
      }
    } else if (body.phone) {
      // Explicit number with no linked user
      const p = normalizePhone(body.phone);
      if (p) recipients.push(p);
    }

    if (body.role) {
      const { data: roleRows } = await supabaseAdmin
        .from("user_roles")
        .select("user_id")
        .eq("role", body.role);
      await addPhonesForUsers((roleRows ?? []).map((r) => r.user_id));
    }

    const unique = [...new Set(recipients)];
    if (unique.length === 0) {
      return new Response(
        JSON.stringify({ error: "No valid recipient phone numbers found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const results = await Promise.all(
      unique.map((to) => sendMessage(to, body, supabaseAdmin)),
    );

    return new Response(
      JSON.stringify({ success: results.some((r) => r.ok), results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("send-whatsapp error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
