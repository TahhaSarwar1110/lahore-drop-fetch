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

  // --- Inbound events ---
  try {
    const payload = await req.json();

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
