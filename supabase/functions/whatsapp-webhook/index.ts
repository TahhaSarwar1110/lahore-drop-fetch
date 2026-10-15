import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Meta WhatsApp Cloud API webhook.
 *
 * GET  -> hub.challenge verification using WHATSAPP_VERIFY_TOKEN
 * POST -> inbound message / status events from Meta (idempotent)
 *
 * Secrets used (never exposed to the frontend / never echoed in responses):
 *  - WHATSAPP_VERIFY_TOKEN
 */
const VERIFY_TOKEN = Deno.env.get("WHATSAPP_VERIFY_TOKEN");
const APP_SECRET = Deno.env.get("WHATSAPP_APP_SECRET");

const isValidSignature = async (body: string, header: string, secret: string): Promise<boolean> => {
  if (!header.startsWith("sha256=")) return false;
  const expectedHex = header.slice(7).toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(expectedHex)) return false;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(body)));
  const actualHex = Array.from(sig).map((b) => b.toString(16).padStart(2, "0")).join("");
  // Constant-time comparison
  let diff = 0;
  for (let i = 0; i < 64; i++) diff |= actualHex.charCodeAt(i) ^ expectedHex.charCodeAt(i);
  return diff === 0;
};

const admin = () =>
  createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

/** Returns true when this event id has NOT been handled before. */
const claimEvent = async (
  supabase: ReturnType<typeof admin>,
  eventId: string,
  eventType: string,
): Promise<boolean> => {
  const { error } = await supabase
    .from("whatsapp_events")
    .insert({ event_id: eventId, event_type: eventType });

  if (error) {
    // 23505 = unique violation -> duplicate delivery from Meta, skip silently.
    if ((error as { code?: string }).code === "23505") return false;
    console.error("Failed to record WhatsApp event:", error.message);
    // Fail closed on unexpected errors so we never double-process.
    return false;
  }
  return true;
};


const RANK: Record<string, number> = { sent: 1, delivered: 2, read: 3 };

const previewFor = (msg: any): { type: string; body: string | null; mediaId: string | null; mime: string | null; filename: string | null } => {
  const type: string = msg?.type ?? "unknown";
  if (type === "text") return { type, body: msg?.text?.body ?? "", mediaId: null, mime: null, filename: null };
  if (["image", "document", "audio", "video", "sticker"].includes(type)) {
    const m = msg?.[type] ?? {};
    return { type, body: m.caption ?? m.filename ?? null, mediaId: m.id ?? null, mime: m.mime_type ?? null, filename: m.filename ?? null };
  }
  if (type === "button") return { type: "text", body: msg?.button?.text ?? "", mediaId: null, mime: null, filename: null };
  if (type === "interactive") {
    const i = msg?.interactive ?? {};
    return { type: "text", body: i?.button_reply?.title ?? i?.list_reply?.title ?? "[interactive]", mediaId: null, mime: null, filename: null };
  }
  return { type, body: null, mediaId: null, mime: null, filename: null };
};

const labelFor = (type: string, body: string | null) =>
  body && type === "text" ? body : body ? `[${type}] ${body}` : `[${type}]`;

/** Persist an inbound message into the inbox (idempotent via unique wa_message_id). */
const storeInbound = async (
  supabase: ReturnType<typeof admin>,
  msg: any,
  from: string,
  contactName: string | null,
  at: string,
) => {
  const p = previewFor(msg);
  const preview = labelFor(p.type, p.body).slice(0, 200);

  const { data: existing } = await supabase
    .from("whatsapp_conversations")
    .select("id, unread_count, display_name, customer_user_id")
    .eq("phone", from)
    .maybeSingle();

  let convId = existing?.id as string | undefined;
  let customerId = existing?.customer_user_id as string | null | undefined;

  if (!customerId && from.length >= 10) {
    const tail = from.slice(-10);
    const { data: matches } = await supabase.from("profiles").select("id").ilike("phone", `%${tail}`).limit(2);
    if (matches && matches.length === 1) customerId = matches[0].id;
  }

  if (!convId) {
    const { data: created, error } = await supabase
      .from("whatsapp_conversations")
      .upsert({ phone: from, display_name: contactName, customer_user_id: customerId ?? null, last_message_at: at, last_message_preview: preview, last_inbound_at: at, unread_count: 0 }, { onConflict: "phone" })
      .select("id, unread_count")
      .single();
    if (error) throw error;
    convId = created.id;
  }

  const { error: insErr } = await supabase.from("whatsapp_messages").insert({
    conversation_id: convId,
    wa_message_id: msg.id,
    direction: "inbound",
    msg_type: p.type,
    body: p.body,
    media_id: p.mediaId,
    media_mime: p.mime,
    media_filename: p.filename,
    status: "received",
    created_at: at,
  });
  if (insErr) {
    if ((insErr as { code?: string }).code === "23505") return; // duplicate
    throw insErr;
  }

  const { data: cur } = await supabase.from("whatsapp_conversations").select("unread_count").eq("id", convId).single();
  await supabase.from("whatsapp_conversations").update({
    unread_count: (cur?.unread_count ?? 0) + 1,
    last_message_at: at,
    last_message_preview: preview,
    last_inbound_at: at,
    display_name: contactName ?? existing?.display_name ?? null,
    customer_user_id: customerId ?? null,
  }).eq("id", convId);
};

const applyStatus = async (supabase: ReturnType<typeof admin>, status: any) => {
  const state: string = status?.status ?? "";
  if (!["sent", "delivered", "read", "failed"].includes(state)) return;
  const { data: row } = await supabase
    .from("whatsapp_messages").select("id, status").eq("wa_message_id", status.id).eq("direction", "outbound").maybeSingle();
  if (!row) return;
  if (state !== "failed" && (RANK[state] ?? 0) <= (RANK[row.status] ?? 0)) return;
  const errMsg = state === "failed"
    ? String(status?.errors?.[0]?.title ?? status?.errors?.[0]?.message ?? "Delivery failed").slice(0, 300)
    : null;
  const ts = Number(status?.timestamp);
  await supabase.from("whatsapp_messages").update({
    status: state,
    error: errMsg,
    status_updated_at: Number.isFinite(ts) && ts > 0 ? new Date(ts * 1000).toISOString() : new Date().toISOString(),
  }).eq("id", row.id);
};

serve(async (req: Request): Promise<Response> => {
  const url = new URL(req.url);

  // --- Verification handshake (Meta calls this once when you save the URL) ---
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (!VERIFY_TOKEN) {
      console.error("WHATSAPP_VERIFY_TOKEN is not configured");
      return new Response("Forbidden", { status: 403 });
    }

    if (mode === "subscribe" && token === VERIFY_TOKEN && challenge) {
      return new Response(challenge, {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    }

    console.warn("Rejected WhatsApp webhook verification attempt");
    return new Response("Forbidden", { status: 403 });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // --- Signature verification (X-Hub-Signature-256 = HMAC-SHA256 of raw body with App Secret) ---
  const rawBody = await req.text();
  if (!APP_SECRET) {
    console.error("WHATSAPP_APP_SECRET is not configured");
    return new Response("Server misconfigured", { status: 500 });
  }
  const sigHeader = req.headers.get("x-hub-signature-256") ?? "";
  if (!(await isValidSignature(rawBody, sigHeader, APP_SECRET))) {
    console.warn("Rejected WhatsApp webhook POST: invalid signature");
    return new Response("Invalid signature", { status: 401 });
  }

  // --- Inbound events ---
  try {
    const payload = JSON.parse(rawBody);

    // Only process well-formed WhatsApp Cloud API payloads.
    if (payload?.object !== "whatsapp_business_account" || !Array.isArray(payload?.entry)) {
      console.warn("Ignoring unexpected webhook payload shape");
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = admin();

    for (const entry of payload.entry) {
      for (const change of entry?.changes ?? []) {
        if (change?.field && change.field !== "messages") continue;
        const value = change?.value ?? {};

        for (const msg of value.messages ?? []) {
          const messageId: string = msg?.id ?? "";
          const from: string = (msg?.from ?? "").replace(/\D/g, "");
          if (!messageId || !from) continue;

          const isNew = await claimEvent(supabaseAdmin, `msg:${messageId}`, "inbound_message");
          if (!isNew) continue;

          const text: string =
            typeof msg?.text?.body === "string" ? msg.text.body : `[${msg?.type ?? "unknown"}]`;

          console.log(
            "Inbound WhatsApp message",
            JSON.stringify({ id: messageId, type: msg?.type }),
          );

          // Track the 24h customer service window for this number.
          const timestamp = Number(msg?.timestamp);
          const lastInboundAt = Number.isFinite(timestamp) && timestamp > 0
            ? new Date(timestamp * 1000).toISOString()
            : new Date().toISOString();

          await supabaseAdmin
            .from("whatsapp_contacts")
            .upsert({ phone: from, last_inbound_at: lastInboundAt }, { onConflict: "phone" });

          // Persist into the manager WhatsApp Inbox (best-effort, never blocks the 200).
          try {
            const contactName: string | null =
              (value.contacts ?? []).find((c: any) => String(c?.wa_id) === from)?.profile?.name ?? null;
            await storeInbound(supabaseAdmin, msg, from, contactName, lastInboundAt);
          } catch (e) {
            console.error("Failed to store inbound message in inbox:", (e as Error)?.message);
          }

          // Best-effort: notify managers in-app that a customer wrote in.
          try {
            const { data: managers } = await supabaseAdmin
              .from("user_roles")
              .select("user_id")
              .eq("role", "manager");

            const rows = (managers ?? []).map((m: { user_id: string }) => ({
              user_id: m.user_id,
              title: "New WhatsApp message",
              message: `From +${from}: ${text}`.slice(0, 500),
              type: "whatsapp_inbound",
            }));

            if (rows.length) {
              await supabaseAdmin.from("notifications").insert(rows);
            }
          } catch (e) {
            console.error("Failed to record inbound WhatsApp message:", e);
          }
        }

        for (const status of value.statuses ?? []) {
          const statusId: string = status?.id ?? "";
          const state: string = status?.status ?? "unknown";
          if (!statusId) continue;

          const isNew = await claimEvent(
            supabaseAdmin,
            `status:${statusId}:${state}`,
            "message_status",
          );
          if (!isNew) continue;

          console.log("WhatsApp delivery status", JSON.stringify({ id: statusId, status: state }));
          try {
            await applyStatus(supabaseAdmin, status);
          } catch (e) {
            console.error("Failed to apply status to inbox:", (e as Error)?.message);
          }
        }
      }
    }
  } catch (error) {
    // Always 200 so Meta does not retry-storm us on malformed payloads.
    console.error("whatsapp-webhook error:", error);
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
