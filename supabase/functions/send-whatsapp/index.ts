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

const templatePayload = (to: string, body: WhatsAppRequest) => ({
  messaging_product: "whatsapp",
  to,
  type: "template",
  template: {
    name: body.templateName,
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

const sendMessage = async (to: string, body: WhatsAppRequest) => {
  // Business-initiated messages need an approved template. Try the template
  // first; if it is missing/unapproved, fall back to plain text (which only
  // delivers inside the 24h customer service window).
  if (body.templateName) {
    const attempt = await post(templatePayload(to, body));
    if (attempt.ok) return { to, ok: true, channel: "template", data: attempt.data };
    console.error(
      `WhatsApp template "${body.templateName}" failed, falling back to text:`,
      JSON.stringify(attempt.data),
    );
  }

  const fallback = await post(textPayload(to, body.message));
  if (!fallback.ok) {
    console.error("WhatsApp API error:", JSON.stringify(fallback.data));
    return { to, ok: false, error: fallback.data };
  }
  return { to, ok: true, channel: "text", data: fallback.data };
};

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

    const body: WhatsAppRequest = await req.json();
    if (!body.message || typeof body.message !== "string") {
      return new Response(JSON.stringify({ error: "message is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve recipients
    const recipients: string[] = [];

    if (body.phone) {
      const p = normalizePhone(body.phone);
      if (p) recipients.push(p);
    }

    if (body.userId) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("phone")
        .eq("id", body.userId)
        .maybeSingle();
      const p = normalizePhone(profile?.phone ?? "");
      if (p) recipients.push(p);
    }

    if (body.role) {
      const { data: roleRows } = await supabaseAdmin
        .from("user_roles")
        .select("user_id")
        .eq("role", body.role);
      const ids = (roleRows ?? []).map((r) => r.user_id);
      if (ids.length) {
        const { data: profiles } = await supabaseAdmin
          .from("profiles")
          .select("phone")
          .in("id", ids);
        (profiles ?? []).forEach((pr) => {
          const p = normalizePhone(pr.phone ?? "");
          if (p) recipients.push(p);
        });
      }
    }

    const unique = [...new Set(recipients)];
    if (unique.length === 0) {
      return new Response(
        JSON.stringify({ error: "No valid recipient phone numbers found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const results = await Promise.all(unique.map((to) => sendMessage(to, body)));

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
