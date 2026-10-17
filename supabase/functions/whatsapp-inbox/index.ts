import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Manager/admin WhatsApp Inbox actions (server-side only; Meta credentials never leave here).
 * POST { action: "send_text" | "send_template" | "mark_read" | "media", ... }
 */
const PHONE_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
const TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
const GRAPH = "https://graph.facebook.com/v20.0";
const WINDOW_MS = 24 * 60 * 60 * 1000;

const ALLOWED_TEMPLATES = new Set([
  "tabedaar_order_received",
  "tabedaar_payment_pending",
  "tabedaar_payment_confirmed",
  "tabedaar_rider_assigned",
  "tabedaar_items_picked_up",
  "tabedaar_order_delivered",
]);

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const isUuid = (v: unknown): v is string =>
  typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

const graphPost = async (payload: unknown) => {
  const res = await fetch(`${GRAPH}/${PHONE_ID}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!PHONE_ID || !TOKEN) return json({ error: "WhatsApp is not configured" }, 500);

  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  // --- Authenticate caller ---
  const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
  const userId = userData.user.id;

  const db = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

  // --- Authorize: manager or admin only ---
  const { data: roles } = await db.from("user_roles").select("role").eq("user_id", userId).in("role", ["manager", "admin"]);
  if (!roles?.length) return json({ error: "Forbidden" }, 403);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  const action = body?.action;

  try {
    // ---------- Media proxy (token never exposed) ----------
    if (action === "media") {
      if (!isUuid(body.messageId)) return json({ error: "Invalid messageId" }, 400);
      const { data: m } = await db.from("whatsapp_messages").select("media_id, media_mime, media_filename, direction").eq("id", body.messageId).maybeSingle();
      if (!m?.media_id || m.direction !== "inbound") return json({ error: "No media" }, 404);
      const meta = await fetch(`${GRAPH}/${m.media_id}`, { headers: { Authorization: `Bearer ${TOKEN}` } });
      if (!meta.ok) return json({ error: "Media unavailable" }, 502);
      const info = await meta.json();
      if (typeof info?.url !== "string" || !info.url.startsWith("https://")) return json({ error: "Media unavailable" }, 502);
      const file = await fetch(info.url, { headers: { Authorization: `Bearer ${TOKEN}` } });
      if (!file.ok || !file.body) return json({ error: "Media unavailable" }, 502);
      return new Response(file.body, {
        status: 200,
        headers: {
          ...cors,
          "Content-Type": m.media_mime || file.headers.get("content-type") || "application/octet-stream",
          "Cache-Control": "private, max-age=300",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    // ---------- List approved templates from Meta ----------
    if (action === "list_templates") {
      const tryGet = async (u: string) => {
        const r = await fetch(u, { headers: { Authorization: `Bearer ${TOKEN}` } });
        return { ok: r.ok, data: await r.json().catch(() => ({})) };
      };
      let r = await tryGet(`${GRAPH}/${PHONE_ID}/message_templates?limit=100`);
      if (!r.ok) {
        // Need the WABA id: resolve it from the phone number's verified name edge.
        const pn = await tryGet(`${GRAPH}/${PHONE_ID}?fields=id`);
        return json({ error: "template_list_unavailable", status: r.data?.error?.message, phone: pn.data }, 502);
      }
      const names = (r.data?.data ?? []).map((t: any) => ({ name: t.name, language: t.language, status: t.status, params: (t.components ?? []).find((c: any) => c.type === "BODY")?.text }));
      return json({ ok: true, count: names.length, templates: names });
    }

    // ---------- Template diagnostic: live-send each lifecycle template to our own number ----------
    if (action === "check_templates") {
      // Meta rejects sends to the business's own number, so the live check
      // goes to the calling manager/admin's own profile phone.
      const { data: prof } = await db.from("profiles").select("phone").eq("id", userId).maybeSingle();
      const own = String(prof?.phone ?? "").replace(/\D/g, "").replace(/^0/, "92");
      if (!/^\d{10,15}$/.test(own)) return json({ error: "Your profile has no valid phone number for the test send" }, 400);

      const SAMPLES: Record<string, string[]> = {
        tabedaar_order_received: ["Test Customer", "abcd1234", "2 Shirts, 1 Jacket", "Rs. 3,500"],
        tabedaar_items_reviewed: ["Test Customer", "abcd1234", "2 Shirts", "1 Jacket", "Out of stock"],
        tabedaar_payment_required_after_review: ["Test Customer", "abcd1234", "2 Shirts", "None", "Rs. 2,000"],
        tabedaar_payment_confirmed: ["Test Customer", "abcd1234", "Rs. 2,000"],
        tabedaar_items_picked_up: ["Test Customer", "abcd1234"],
        tabedaar_order_delivered: ["Test Customer", "abcd1234", "Rs. 3,500"],
      };
      const results: Record<string, unknown> = {};
      for (const [name, params] of Object.entries(SAMPLES)) {
        let r = await graphPost({
          messaging_product: "whatsapp", to: own, type: "template",
          template: {
            name, language: { code: "en" },
            components: [{ type: "body", parameters: params.map((text) => ({ type: "text", text })) }],
          },
        });
        if (!r.ok) {
          r = await graphPost({
            messaging_product: "whatsapp", to: own, type: "template",
            template: {
              name, language: { code: "en_US" },
              components: [{ type: "body", parameters: params.map((text) => ({ type: "text", text })) }],
            },
          });
          if (r.ok) {
            results[name] = { ok: true, language: "en_US", messageId: r.data?.messages?.[0]?.id };
            continue;
          }
        }
        const e = r.data?.error ?? {};
        results[name] = r.ok
          ? { ok: true, language: "en", messageId: r.data?.messages?.[0]?.id }
          : { ok: false, code: e.code, subcode: e.error_subcode, message: e.message, details: e.error_data?.details, blame: e.error_data?.blame_field_specs };
      }
      return json({ ok: true, sentTo: `***${own.slice(-4)}`, ownLength: own.length, results });
    }

    // ---------- Actions on a conversation ----------
    if (!isUuid(body.conversationId)) return json({ error: "Invalid conversationId" }, 400);
    const { data: conv } = await db
      .from("whatsapp_conversations").select("id, phone, last_inbound_at").eq("id", body.conversationId).maybeSingle();
    if (!conv) return json({ error: "Conversation not found" }, 404);

    // Recipient is always the stored, validated number — never client supplied.
    if (!/^\d{8,15}$/.test(conv.phone)) return json({ error: "Invalid recipient number" }, 400);

    if (action === "mark_read") {
      const { data: last } = await db
        .from("whatsapp_messages").select("wa_message_id").eq("conversation_id", conv.id).eq("direction", "inbound")
        .not("wa_message_id", "is", null).order("created_at", { ascending: false }).limit(1).maybeSingle();
      await db.from("whatsapp_conversations").update({ unread_count: 0 }).eq("id", conv.id);
      let metaMarked = false;
      if (last?.wa_message_id) {
        const r = await graphPost({ messaging_product: "whatsapp", status: "read", message_id: last.wa_message_id });
        metaMarked = r.ok;
        if (!r.ok) console.warn("Meta mark-read failed", JSON.stringify(r.data?.error?.code ?? null));
      }
      return json({ ok: true, metaMarked });
    }

    const windowOpen = !!conv.last_inbound_at && Date.now() - new Date(conv.last_inbound_at).getTime() < WINDOW_MS;
    let payload: Record<string, unknown>;
    let msgType = "text";
    let storedBody = "";

    if (action === "send_text") {
      const text = typeof body.text === "string" ? body.text.trim() : "";
      if (!text || text.length > 4096) return json({ error: "Message must be 1-4096 characters" }, 400);
      if (!windowOpen) {
        return json({ error: "window_closed", message: "The 24-hour customer service window is closed. Send an approved template instead." }, 409);
      }
      payload = { messaging_product: "whatsapp", to: conv.phone, type: "text", text: { preview_url: false, body: text } };
      storedBody = text;
    } else if (action === "send_template") {
      const name = body.templateName;
      if (typeof name !== "string" || !ALLOWED_TEMPLATES.has(name)) return json({ error: "Template not allowed" }, 400);
      const params: string[] = Array.isArray(body.params) ? body.params.map((p: unknown) => String(p).slice(0, 1024)) : [];
      if (params.length > 10 || params.some((p) => !p.trim())) return json({ error: "Invalid template parameters" }, 400);
      const language = typeof body.language === "string" && /^[a-z]{2}(_[A-Z]{2})?$/.test(body.language) ? body.language : "en";
      payload = {
        messaging_product: "whatsapp",
        to: conv.phone,
        type: "template",
        template: {
          name,
          language: { code: language },
          components: params.length ? [{ type: "body", parameters: params.map((text) => ({ type: "text", text })) }] : undefined,
        },
      };
      msgType = "template";
      storedBody = `[Template: ${name}] ${params.join(" | ")}`.slice(0, 1000);
    } else {
      return json({ error: "Unknown action" }, 400);
    }

    let result = await graphPost(payload);
    // Template language fallback (Meta is strict about codes).
    if (!result.ok && action === "send_template") {
      for (const lang of ["en_US", "en"]) {
        if ((payload as any).template.language.code === lang) continue;
        (payload as any).template.language.code = lang;
        result = await graphPost(payload);
        if (result.ok) break;
      }
    }

    if (!result.ok) {
      console.error("Inbox send failed", JSON.stringify({ code: result.data?.error?.code, msg: result.data?.error?.message }));
      return json({ error: "send_failed", message: result.data?.error?.message ?? "WhatsApp rejected the message" }, 502);
    }

    const waId: string | undefined = result.data?.messages?.[0]?.id;
    const now = new Date().toISOString();
    const { error: insErr } = await db.from("whatsapp_messages").upsert({
      conversation_id: conv.id,
      wa_message_id: waId ?? null,
      direction: "outbound",
      msg_type: msgType,
      body: storedBody,
      status: "sent",
      status_updated_at: now,
      sent_by: userId,
      created_at: now,
    }, { onConflict: "wa_message_id", ignoreDuplicates: true });
    if (insErr) console.error("Failed to store outbound message:", insErr.message);

    await db.from("whatsapp_conversations").update({
      last_message_at: now,
      last_message_preview: storedBody.slice(0, 200),
    }).eq("id", conv.id);

    return json({ ok: true, id: waId ?? null });
  } catch (e) {
    console.error("whatsapp-inbox error:", (e as Error)?.message);
    return json({ error: "Internal error" }, 500);
  }
});
