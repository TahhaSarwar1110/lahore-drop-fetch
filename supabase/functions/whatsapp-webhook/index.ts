import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Meta WhatsApp Cloud API webhook.
 *
 * GET  -> hub.challenge verification using WHATSAPP_VERIFY_TOKEN
 * POST -> inbound message / status events from Meta
 *
 * Secrets used (never exposed to the frontend):
 *  - WHATSAPP_VERIFY_TOKEN
 */
const VERIFY_TOKEN = Deno.env.get("WHATSAPP_VERIFY_TOKEN");

serve(async (req: Request): Promise<Response> => {
  const url = new URL(req.url);

  // --- Verification handshake (Meta calls this once when you save the URL) ---
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (!VERIFY_TOKEN) {
      console.error("WHATSAPP_VERIFY_TOKEN is not configured");
      return new Response("Verify token not configured", { status: 500 });
    }

    if (mode === "subscribe" && token === VERIFY_TOKEN && challenge) {
      return new Response(challenge, {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    }

    return new Response("Forbidden", { status: 403 });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // --- Inbound events ---
  try {
    const payload = await req.json();

    const entries = payload?.entry ?? [];
    for (const entry of entries) {
      for (const change of entry?.changes ?? []) {
        const value = change?.value ?? {};

        for (const msg of value.messages ?? []) {
          const from: string = msg.from ?? "";
          const text: string = msg.text?.body ?? `[${msg.type}]`;
          console.log("Inbound WhatsApp message", JSON.stringify({ from, type: msg.type, text }));

          // Best-effort: notify managers in-app that a customer wrote in.
          try {
            const supabaseAdmin = createClient(
              Deno.env.get("SUPABASE_URL") ?? "",
              Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
            );

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
          console.log(
            "WhatsApp delivery status",
            JSON.stringify({ id: status.id, status: status.status, recipient: status.recipient_id }),
          );
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
