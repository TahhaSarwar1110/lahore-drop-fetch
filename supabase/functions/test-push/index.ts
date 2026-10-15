// Sends a test push ONLY to the signed-in user's own registered devices and
// reports Firebase's per-device answer. Tokens are never returned.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") ?? "";
const FCM_KEY = Deno.env.get("FIREBASE_MESSAGING_API_KEY") ?? "";
const GATEWAY_URL = "https://connector-gateway.lovable.dev/firebase_messaging";
export const ANDROID_CHANNEL_ID = "tabedaar_orders";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const asUser = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: { user } } = await asUser.auth.getUser();
  if (!user) return json({ error: "Unauthorized" }, 401);

  if (!LOVABLE_API_KEY || !FCM_KEY) {
    return json({ configured: false, devices: [], error: "Firebase push is not configured on the server" });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: subs, error } = await admin
    .from("push_subscriptions")
    .select("id, platform, endpoint, last_seen_at")
    .eq("user_id", user.id)
    .in("platform", ["android", "ios"])
    .is("revoked_at", null);
  if (error) return json({ error: "Could not load your devices" }, 500);

  const devices = [];
  for (const s of subs ?? []) {
    const res = await fetch(`${GATEWAY_URL}/v1/projects/_/messages:send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": FCM_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          token: s.endpoint,
          notification: { title: "Tabedaar.com test", body: "Push notifications are working on this device." },
          data: { url: "/notifications", eventType: "test_push" },
          android: { priority: "HIGH", notification: { channel_id: ANDROID_CHANNEL_ID, sound: "default" } },
          apns: { headers: { "apns-priority": "10" }, payload: { aps: { sound: "default" } } },
        },
      }),
    });
    const text = await res.text();
    let reason: string | null = null;
    if (!res.ok) {
      try {
        const parsed = JSON.parse(text);
        reason = parsed?.error?.details?.find((d: { errorCode?: string }) => d.errorCode)?.errorCode
          ?? parsed?.error?.status ?? `HTTP ${res.status}`;
      } catch { reason = `HTTP ${res.status}`; }
      if (reason === "UNREGISTERED" || reason === "INVALID_ARGUMENT") {
        await admin.from("push_subscriptions").update({ revoked_at: new Date().toISOString() }).eq("id", s.id);
      }
    }
    console.log(JSON.stringify({ scope: "test-push", user_id: user.id, platform: s.platform, ok: res.ok, status: res.status, reason }));
    devices.push({
      platform: s.platform,
      token_suffix: s.endpoint.slice(-6),
      last_seen_at: s.last_seen_at,
      accepted: res.ok,
      reason,
    });
  }

  return json({ configured: true, devices });
});
