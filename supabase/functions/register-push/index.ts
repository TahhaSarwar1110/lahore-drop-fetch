import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.25.76";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

const BodySchema = z.object({
  action: z.enum(["register", "unregister"]).default("register"),
  platform: z.enum(["web", "android", "ios"]),
  endpoint: z.string().min(16).max(4096),
  p256dh: z.string().max(1024).nullable().optional(),
  auth: z.string().max(1024).nullable().optional(),
  device_label: z.string().max(180).nullable().optional(),
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  if (!SUPABASE_URL || !SERVICE_ROLE || !ANON_KEY) {
    return json({ error: "Push registration is unavailable" }, 503);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const asUser = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authError } = await asUser.auth.getUser();
  if (authError || !user) return json({ error: "Unauthorized" }, 401);

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const parsed = BodySchema.safeParse(rawBody);
  if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const input = parsed.data;

  if (input.action === "unregister") {
    const { error } = await admin
      .from("push_subscriptions")
      .update({ revoked_at: new Date().toISOString() })
      .eq("endpoint", input.endpoint)
      .eq("user_id", user.id);
    if (error) return json({ error: "Unable to unregister device" }, 500);
    return json({ success: true });
  }

  const now = new Date().toISOString();
  const { error } = await admin.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      platform: input.platform,
      endpoint: input.endpoint,
      p256dh: input.p256dh ?? null,
      auth: input.auth ?? null,
      device_label: input.device_label ?? null,
      last_seen_at: now,
      revoked_at: null,
    },
    { onConflict: "endpoint" },
  );

  if (error) {
    console.error(JSON.stringify({ scope: "register-push", event: "upsert_failed", code: error.code }));
    return json({ error: "Unable to register device" }, 500);
  }

  return json({ success: true });
});