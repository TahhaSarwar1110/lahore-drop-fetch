// Central notification service.
// Business event in -> in-app notification rows + web/native push out.
// Idempotent per (event_type, order_id, recipient, event_version).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:support@tabedaar.com";
const FCM_SERVICE_ACCOUNT_JSON = Deno.env.get("FCM_SERVICE_ACCOUNT_JSON") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Audience = "customer" | "manager" | "admin" | "rider";

interface NotifyRequest {
  event_type: string;
  order_id?: string;
  /** Distinguishes repeated events of the same type (e.g. item id, status name) */
  event_version?: string;
  item_name?: string;
  amount?: number | string;
  status?: string;
  note?: string;
}

interface Recipe {
  audiences: Audience[];
  title: string;
  /** {order} {item} {customer} {amount} {status} {note} */
  message: string;
}

const RECIPES: Record<string, Recipe> = {
  order_placed: {
    audiences: ["customer", "manager", "admin"],
    title: "Order placed",
    message: "Order #{order} from {customer} has been received and requires review.",
  },
  order_received: {
    audiences: ["customer"],
    title: "Order received",
    message: "We have received your order #{order}. Our team is reviewing it now.",
  },
  order_review_required: {
    audiences: ["manager", "admin"],
    title: "Order requires review",
    message: "Order #{order} from {customer} is waiting for review.",
  },
  item_approval_required: {
    audiences: ["manager"],
    title: "Item requires approval",
    message: "An item ({item}) in order #{order} needs your approval.",
  },
  item_approved: {
    audiences: ["customer"],
    title: "Item approved",
    message: "Your item {item} in order #{order} has been approved.",
  },
  item_rejected: {
    audiences: ["customer"],
    title: "Item rejected",
    message: "Your item {item} in order #{order} was rejected. {note}",
  },
  order_confirmation_required: {
    audiences: ["manager"],
    title: "Order requires confirmation",
    message: "All items in order #{order} are reviewed and the order needs confirmation.",
  },
  order_confirmed: {
    audiences: ["customer"],
    title: "Order confirmed",
    message: "Your order #{order} has been confirmed and is now being processed.",
  },
  payment_requested: {
    audiences: ["customer"],
    title: "Payment requested",
    message: "Payment of PKR {amount} is required for order #{order}. Please upload your payment proof.",
  },
  payment_submitted: {
    audiences: ["manager"],
    title: "Payment submitted",
    message: "{customer} submitted payment proof for order #{order}. Please verify it.",
  },
  payment_confirmed: {
    audiences: ["customer", "rider"],
    title: "Payment confirmed",
    message: "Payment for order #{order} is confirmed. The order is now being processed.",
  },
  delivery_payment_requested: {
    audiences: ["customer"],
    title: "Delivery payment requested",
    message: "Delivery charges of PKR {amount} are due for order #{order}. Please pay to proceed.",
  },
  delivery_payment_submitted: {
    audiences: ["manager"],
    title: "Delivery payment submitted",
    message: "{customer} submitted delivery payment proof for order #{order}. Please verify it.",
  },
  delivery_payment_confirmed: {
    audiences: ["customer", "rider"],
    title: "Delivery payment confirmed",
    message: "Delivery payment for order #{order} is confirmed. Delivery can proceed.",
  },
  order_processing: {
    audiences: ["customer"],
    title: "Order being processed",
    message: "Your order #{order} is being prepared.",
  },
  rider_assigned: {
    audiences: ["customer", "rider"],
    title: "Rider assigned",
    message: "A rider has been assigned to order #{order}.",
  },
  order_ready_for_pickup: {
    audiences: ["customer", "rider"],
    title: "Ready for pickup",
    message: "Order #{order} is ready for pickup.",
  },
  order_picked_up: {
    audiences: ["customer", "manager"],
    title: "Order picked up",
    message: "Items for order #{order} have been picked up.",
  },
  order_out_for_delivery: {
    audiences: ["customer"],
    title: "Out for delivery",
    message: "Your order #{order} is out for delivery.",
  },
  order_delivered: {
    audiences: ["customer", "manager"],
    title: "Order delivered",
    message: "Order #{order} has been delivered. Thank you for choosing Tabedaar.",
  },
  order_cancelled: {
    audiences: ["customer", "manager"],
    title: "Order cancelled",
    message: "Order #{order} has been cancelled.",
  },
  order_status_changed: {
    audiences: ["customer"],
    title: "Order status updated",
    message: "Your order #{order} status changed to {status}.",
  },
  delivery_issue: {
    audiences: ["manager", "admin"],
    title: "Delivery issue",
    message: "Order #{order} needs attention: {note}",
  },
};

const linkFor = (audience: Audience, orderId?: string) => {
  if (!orderId) return "/notifications";
  switch (audience) {
    case "manager":
      return `/manager/orders/${orderId}`;
    case "admin":
      return `/admin/orders/${orderId}`;
    case "rider":
      return `/rider/order/${orderId}`;
    default:
      return `/order-details?orderId=${orderId}`;
  }
};

const log = (event: string, data: Record<string, unknown> = {}) =>
  console.log(JSON.stringify({ scope: "notify", event, ...data }));

// ---------------------------------------------------------------- native push
let cachedFcm: { token: string; exp: number; projectId: string } | null = null;

const b64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_")
    .replace(/=+$/, "");

const getFcmAccessToken = async (): Promise<{ token: string; projectId: string } | null> => {
  if (!FCM_SERVICE_ACCOUNT_JSON) return null;
  const now = Math.floor(Date.now() / 1000);
  if (cachedFcm && cachedFcm.exp - 60 > now) return cachedFcm;
  try {
    const sa = JSON.parse(FCM_SERVICE_ACCOUNT_JSON);
    const header = b64url(new TextEncoder().encode(JSON.stringify({ alg: "RS256", typ: "JWT" })));
    const claims = b64url(new TextEncoder().encode(JSON.stringify({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    })));
    const pem = (sa.private_key as string)
      .replace(/-----BEGIN PRIVATE KEY-----/, "")
      .replace(/-----END PRIVATE KEY-----/, "")
      .replace(/\s+/g, "");
    const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
    const key = await crypto.subtle.importKey(
      "pkcs8",
      der,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const sig = new Uint8Array(
      await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(`${header}.${claims}`)),
    );
    const assertion = `${header}.${claims}.${b64url(sig)}`;
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.access_token) {
      log("fcm_token_failed", { status: res.status });
      return null;
    }
    cachedFcm = { token: data.access_token, exp: now + 3300, projectId: sa.project_id };
    return cachedFcm;
  } catch (e) {
    log("fcm_token_error", { message: String(e) });
    return null;
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization") ?? "";
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const asUser = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  try {
    const { data: { user }, error: authError } = await asUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as NotifyRequest;
    const recipe = RECIPES[body.event_type];
    if (!recipe) {
      return new Response(JSON.stringify({ error: "Unknown event_type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- authorization: caller must own the order or hold a staff role
    const { data: staffRoles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    const callerRoles = (staffRoles ?? []).map((r: { role: string }) => r.role);
    const isStaff = callerRoles.some((r) => ["admin", "manager", "rider"].includes(r));

    let order: {
      id: string;
      user_id: string;
      status: string;
    } | null = null;

    if (body.order_id) {
      const { data } = await admin
        .from("orders")
        .select("id, user_id, status")
        .eq("id", body.order_id)
        .maybeSingle();
      order = data ?? null;
      if (!order) {
        return new Response(JSON.stringify({ error: "Order not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!isStaff && order.user_id !== user.id) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else if (!isStaff) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- resolve recipients server-side
    const shortId = order ? order.id.slice(0, 8) : "";
    let customerName = "a customer";
    const recipients: { userId: string; audience: Audience }[] = [];

    if (order) {
      const { data: profile } = await admin
        .from("profiles")
        .select("full_name")
        .eq("id", order.user_id)
        .maybeSingle();
      if (profile?.full_name) customerName = profile.full_name;
    }

    for (const audience of recipe.audiences) {
      if (audience === "customer") {
        if (order) recipients.push({ userId: order.user_id, audience });
      } else if (audience === "rider") {
        if (order) {
          const { data: assignments } = await admin
            .from("order_assignments")
            .select("rider_id")
            .eq("order_id", order.id);
          for (const a of assignments ?? []) {
            recipients.push({ userId: (a as { rider_id: string }).rider_id, audience });
          }
        }
      } else {
        const { data: roleUsers } = await admin
          .from("user_roles")
          .select("user_id")
          .eq("role", audience);
        for (const r of roleUsers ?? []) {
          recipients.push({ userId: (r as { user_id: string }).user_id, audience });
        }
      }
    }

    // de-duplicate: one notification per user (first matching audience wins)
    const seen = new Set<string>();
    const unique = recipients.filter((r) => {
      if (!r.userId || seen.has(r.userId)) return false;
      seen.add(r.userId);
      return true;
    });

    log("recipients_resolved", {
      event_type: body.event_type,
      order_id: body.order_id,
      count: unique.length,
    });

    const render = (tpl: string) =>
      tpl
        .replace(/{order}/g, shortId)
        .replace(/{item}/g, body.item_name ?? "item")
        .replace(/{customer}/g, customerName)
        .replace(/{amount}/g, body.amount != null ? String(body.amount) : "")
        .replace(/{status}/g, body.status ?? "")
        .replace(/{note}/g, body.note ?? "")
        .replace(/\s+/g, " ")
        .trim();

    const title = recipe.title;
    const message = render(recipe.message);
    const version = body.event_version ?? "v1";

    const created: {
      id: string;
      userId: string;
      link: string;
      duplicate: boolean;
    }[] = [];

    for (const r of unique) {
      const dedupeKey = `${body.event_type}:${body.order_id ?? "none"}:${r.userId}:${version}`;
      const link = linkFor(r.audience, body.order_id);

      const { data: inserted, error } = await admin
        .from("notifications")
        .insert({
          user_id: r.userId,
          title,
          message,
          type: body.event_type,
          event_type: body.event_type,
          order_id: body.order_id ?? null,
          link_url: link,
          dedupe_key: dedupeKey,
          metadata: {
            audience: r.audience,
            item_name: body.item_name ?? null,
            status: body.status ?? null,
          },
        })
        .select("id")
        .maybeSingle();

      if (error) {
        const duplicate = error.code === "23505";
        log(duplicate ? "duplicate_skipped" : "in_app_failed", {
          event_type: body.event_type,
          dedupe_key: dedupeKey,
          code: error.code,
        });
        await admin.from("notification_deliveries").insert({
          user_id: r.userId,
          channel: "in_app",
          status: duplicate ? "duplicate" : "failed",
          event_type: body.event_type,
          dedupe_key: dedupeKey,
          error: duplicate ? null : error.message,
        });
        continue;
      }

      log("in_app_created", { notification_id: inserted?.id, event_type: body.event_type });
      await admin.from("notification_deliveries").insert({
        notification_id: inserted?.id ?? null,
        user_id: r.userId,
        channel: "in_app",
        status: "created",
        event_type: body.event_type,
        dedupe_key: dedupeKey,
      });

      if (inserted?.id) {
        created.push({ id: inserted.id, userId: r.userId, link, duplicate: false });
      }
    }

    // ---- push fan-out (never blocks the business flow)
    let pushSent = 0;
    if (created.length) {
      const userIds = created.map((c) => c.userId);
      const { data: prefs } = await admin
        .from("notification_preferences")
        .select("user_id, push_enabled")
        .in("user_id", userIds);
      const pushDisabled = new Set(
        (prefs ?? []).filter((p: { push_enabled: boolean }) => !p.push_enabled)
          .map((p: { user_id: string }) => p.user_id),
      );

      const { data: subs } = await admin
        .from("push_subscriptions")
        .select("id, user_id, platform, endpoint, p256dh, auth")
        .in("user_id", userIds)
        .is("revoked_at", null);

      if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
        webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
      }

      const fcm = await getFcmAccessToken();

      for (const sub of subs ?? []) {
        const s = sub as {
          id: string;
          user_id: string;
          platform: string;
          endpoint: string;
          p256dh: string | null;
          auth: string | null;
        };
        if (pushDisabled.has(s.user_id)) {
          log("push_skipped_preference", { user_id: s.user_id });
          continue;
        }
        const target = created.find((c) => c.userId === s.user_id);
        if (!target) continue;

        const channel = s.platform === "web" ? "web_push" : "native_push";
        const payload = {
          title,
          body: message,
          url: target.link,
          notificationId: target.id,
          eventType: body.event_type,
        };

        try {
          if (s.platform === "web") {
            if (!VAPID_PRIVATE_KEY) {
              log("web_push_skipped_no_keys", {});
              continue;
            }
            await webpush.sendNotification(
              { endpoint: s.endpoint, keys: { p256dh: s.p256dh ?? "", auth: s.auth ?? "" } },
              JSON.stringify(payload),
            );
          } else {
            if (!fcm) {
              log("native_push_skipped_no_credentials", { platform: s.platform });
              await admin.from("notification_deliveries").insert({
                notification_id: target.id,
                user_id: s.user_id,
                channel,
                status: "skipped",
                event_type: body.event_type,
                error: "FCM credentials not configured",
              });
              continue;
            }
            const res = await fetch(
              `https://fcm.googleapis.com/v1/projects/${fcm.projectId}/messages:send`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${fcm.token}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  message: {
                    token: s.endpoint,
                    notification: { title, body: message },
                    data: {
                      url: target.link,
                      notificationId: target.id,
                      eventType: body.event_type,
                    },
                  },
                }),
              },
            );
            if (!res.ok) {
              const status = res.status;
              if (status === 404 || status === 400) {
                await admin.from("push_subscriptions")
                  .update({ revoked_at: new Date().toISOString() })
                  .eq("id", s.id);
                log("invalid_token_revoked", { platform: s.platform, status });
              }
              throw new Error(`FCM responded ${status}`);
            }
          }
          pushSent++;
          log("push_sent", { channel, user_id: s.user_id });
          await admin.from("notification_deliveries").insert({
            notification_id: target.id,
            user_id: s.user_id,
            channel,
            status: "sent",
            event_type: body.event_type,
          });
        } catch (e) {
          const msg = String((e as { message?: string })?.message ?? e);
          const statusCode = (e as { statusCode?: number })?.statusCode;
          if (statusCode === 404 || statusCode === 410) {
            await admin.from("push_subscriptions")
              .update({ revoked_at: new Date().toISOString() })
              .eq("id", s.id);
            log("invalid_subscription_revoked", { channel, statusCode });
          }
          log("push_failed", { channel, user_id: s.user_id, error: msg.slice(0, 200) });
          await admin.from("notification_deliveries").insert({
            notification_id: target.id,
            user_id: s.user_id,
            channel,
            status: "failed",
            event_type: body.event_type,
            error: msg.slice(0, 500),
          });
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        created: created.length,
        recipients: unique.length,
        push_sent: pushSent,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    log("unhandled_error", { message: String((e as Error)?.message ?? e) });
    return new Response(JSON.stringify({ error: "Notification failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
