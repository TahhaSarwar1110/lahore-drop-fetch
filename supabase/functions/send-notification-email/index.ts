import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { sendTemplateEmail } from "../_shared/transactional-email-templates/send-email.ts";

const SITE_URL = "https://tabedaar.com";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

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
  return String(e?.[1] ?? "").trim().slice(0, 120) || type;
};
const rs = (n: number) => `Rs. ${Math.round(n).toLocaleString("en-PK")}`;
const clip = (s: unknown, max: number) => String(s ?? "").trim().slice(0, max);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const { data: { user }, error: userError } = await admin.auth.getUser(token);
    if (userError || !user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));

    // ---- Order confirmation: built entirely from saved order data ----
    if (body?.event === "order_received") {
      const orderId = body.orderId;
      if (typeof orderId !== "string" || !UUID_RE.test(orderId)) {
        return json({ error: "valid orderId is required" }, 400);
      }
      const { data: order } = await admin
        .from("orders")
        .select("id, user_id, additional_charges, delivery_charges")
        .eq("id", orderId)
        .maybeSingle();
      if (!order) return json({ error: "Order not found" }, 404);
      if (order.user_id !== user.id) return json({ error: "Forbidden" }, 403);

      const { data: items } = await admin
        .from("order_items")
        .select("item_type, item_data, approval_status")
        .eq("order_id", orderId)
        .order("created_at", { ascending: true });
      const live = (items ?? []).filter((i: any) => i.approval_status !== "rejected");
      if (!live.length) return json({ error: "Order has no items yet" }, 409);

      if (!user.email) return json({ success: false, skipped: "no_email" });
      const { data: profile } = await admin
        .from("profiles").select("full_name").eq("id", user.id).maybeSingle();

      let itemsTotal = 0;
      const lines = live.map((i: any) => {
        const d = (i.item_data ?? {}) as Record<string, unknown>;
        const q = qtyOf(d);
        const line = priceOf(d) * q;
        itemsTotal += line;
        return { label: `${nameOf(d, i.item_type)} x${q}`, amount: line ? rs(line) : undefined };
      });
      const extra = num(order.additional_charges) + num(order.delivery_charges);
      if (num(order.delivery_charges)) lines.push({ label: "Delivery charges", amount: rs(num(order.delivery_charges)) });
      if (num(order.additional_charges)) lines.push({ label: "Additional charges", amount: rs(num(order.additional_charges)) });

      const result = await sendTemplateEmail("order-confirmation", user.email, {
        templateData: {
          name: profile?.full_name || "Customer",
          orderNumber: orderId.slice(0, 8),
          items: lines,
          total: rs(itemsTotal + extra),
          orderLink: `${SITE_URL}/order/${orderId}`,
        },
        idempotencyKey: `order-confirmation-${orderId}`,
      });
      console.log(`[order_confirmation] order=${orderId} sent=${result.sent}`);
      return json({ success: true, ...result });
    }

    // ---- Generic order update (manager/admin actions) ----
    const title = clip(body?.title, 120);
    const message = clip(body?.message, 1500);
    if (!title || !message || typeof body?.userId !== "string" || !UUID_RE.test(body.userId)) {
      return json({ error: "userId, title and message are required" }, 400);
    }

    const { data: recipient } = await admin.auth.admin.getUserById(body.userId);
    const email = recipient?.user?.email;
    if (!email) return json({ error: "Recipient not found" }, 404);

    const { data: profile } = await admin
      .from("profiles").select("full_name").eq("id", body.userId).maybeSingle();

    let orderLink: string | undefined;
    if (typeof body.orderLink === "string" && body.orderLink.startsWith(SITE_URL)) {
      orderLink = body.orderLink.slice(0, 300);
    } else if (typeof body.orderLink === "string" && /^\/[\w\-/]*$/.test(body.orderLink)) {
      orderLink = SITE_URL + body.orderLink;
    }

    const result = await sendTemplateEmail("order-update", email, {
      templateData: { name: profile?.full_name || "Customer", title, message, orderLink },
    });
    console.log(`[order_update] sent=${result.sent}`);
    return json({ success: true, ...result });
  } catch (error: any) {
    console.error("send-notification-email failed:", error?.code ?? "", error?.message ?? error);
    return json({ error: "Email could not be sent" }, 500);
  }
});
