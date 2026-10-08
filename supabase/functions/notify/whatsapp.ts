// Server-side WhatsApp template notifications for the order lifecycle.
// Every value is read from the database; nothing from the caller is trusted
// except the event name, order id and (for riders) which assignment to check.
const PHONE_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") ?? "";
const TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN") ?? "";
const LANGUAGE = "en";

const log = (event: string, data: Record<string, unknown> = {}) =>
  console.log(JSON.stringify({ scope: "notify-whatsapp", event, ...data }));

export const normalizePhone = (raw: string): string | null => {
  const d = (raw || "").replace(/\D/g, "");
  if (d.length < 10) return null;
  return d.startsWith("0") ? `92${d.slice(1)}` : d;
};
const clean = (s: string, max = 200) =>
  (s || "").replace(/[\r\n\t]+/g, " ").replace(/ {4,}/g, "   ").trim().slice(0, max) || "-";
const num = (v: unknown) => {
  const n = parseFloat(String(v ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : 0;
};
const rs = (n: number) => `Rs. ${Math.round(n).toLocaleString("en-PK")}`;
const qtyOf = (d: Record<string, unknown>) => {
  const e = Object.entries(d || {}).find(([k]) => /quantity|^qty$/i.test(k));
  const q = parseInt(String(e?.[1] ?? "").replace(/[^0-9]/g, ""), 10);
  return Number.isFinite(q) && q > 0 ? q : 1;
};
const priceOf = (d: Record<string, unknown>) =>
  num(Object.entries(d || {}).find(([k]) => k.toLowerCase().includes("price"))?.[1]);

// deno-lint-ignore no-explicit-any
type Db = any;

async function itemsTotal(db: Db, orderId: string) {
  const { data } = await db.from("order_items").select("item_data, approval_status").eq("order_id", orderId);
  return (data ?? [])
    .filter((i: { approval_status: string }) => i.approval_status !== "rejected")
    .reduce((s: number, i: { item_data: Record<string, unknown> }) => s + priceOf(i.item_data) * qtyOf(i.item_data), 0);
}

interface Plan { template: string; key: string; params: string[] }

/** Builds the template + params only if the database confirms the event really happened. */
async function plan(db: Db, event: string, orderId: string, version: string | undefined, name: string): Promise<Plan | null> {
  const { data: o } = await db.from("orders")
    .select("id, status, confirmed_at, payment_status, additional_charges, delivery_charges, delivery_payment_status, delivered_at")
    .eq("id", orderId).maybeSingle();
  if (!o) return null;
  const no = orderId.slice(0, 8);
  const goods = async () => (await itemsTotal(db, orderId)) + num(o.additional_charges);

  switch (event) {
    case "order_confirmed":
      if (!o.confirmed_at) return null;
      return { template: "tabedaar_payment_pending", key: `${orderId}:payment_pending:order`, params: [name, no, rs(await goods()), "Order payment"] };
    case "delivery_payment_requested":
      if (o.delivery_payment_status !== "pending" || num(o.delivery_charges) <= 0) return null;
      return { template: "tabedaar_payment_pending", key: `${orderId}:payment_pending:delivery`, params: [name, no, rs(num(o.delivery_charges)), "Delivery charges"] };
    case "payment_confirmed":
      if (o.payment_status !== "confirmed") return null;
      return { template: "tabedaar_payment_confirmed", key: `${orderId}:payment_confirmed:order`, params: [name, no, rs(await goods())] };
    case "delivery_payment_confirmed":
      if (o.delivery_payment_status !== "confirmed") return null;
      return { template: "tabedaar_payment_confirmed", key: `${orderId}:payment_confirmed:delivery`, params: [name, no, rs(num(o.delivery_charges))] };
    case "rider_assigned": {
      let q = db.from("order_assignments").select("rider_id").eq("order_id", orderId).order("assigned_at", { ascending: false }).limit(1);
      if (version) q = db.from("order_assignments").select("rider_id").eq("order_id", orderId).eq("rider_id", version).limit(1);
      const { data: a } = await q;
      const riderId = a?.[0]?.rider_id;
      if (!riderId) return null;
      const { data: rp } = await db.from("profiles").select("full_name").eq("id", riderId).maybeSingle();
      return { template: "tabedaar_rider_assigned", key: `${orderId}:rider_assigned:${riderId}`, params: [name, no, clean(rp?.full_name || "Tabedaar rider", 60)] };
    }
    case "order_picked_up": {
      const { data: items } = await db.from("order_items").select("id").eq("order_id", orderId);
      const ids = (items ?? []).map((i: { id: string }) => i.id);
      if (!ids.length) return null;
      const { count } = await db.from("item_pickups").select("id", { count: "exact", head: true }).in("order_item_id", ids);
      if (!count) return null;
      return { template: "tabedaar_items_picked_up", key: `${orderId}:items_picked_up`, params: [name, no] };
    }
    case "order_delivered":
      if (o.status !== "delivered" && !o.delivered_at) return null;
      return { template: "tabedaar_order_delivered", key: `${orderId}:order_delivered`, params: [name, no, rs((await goods()) + num(o.delivery_charges))] };
  }
  return null;
}

export const WHATSAPP_EVENTS = new Set([
  "order_confirmed", "delivery_payment_requested", "payment_confirmed",
  "delivery_payment_confirmed", "rider_assigned", "order_picked_up", "order_delivered",
]);

/** Never throws. */
export async function sendOrderWhatsApp(db: Db, event: string, orderId: string, customerId: string, version?: string) {
  try {
    if (!WHATSAPP_EVENTS.has(event)) return;
    if (!PHONE_ID || !TOKEN) return log("not_configured", { event });

    const { data: prefs } = await db.from("notification_preferences").select("whatsapp_enabled").eq("user_id", customerId).maybeSingle();
    if (prefs && prefs.whatsapp_enabled === false) return log("opted_out", { event, order: orderId.slice(0, 8) });

    const { data: profile } = await db.from("profiles").select("full_name, phone").eq("id", customerId).maybeSingle();
    const to = normalizePhone(profile?.phone ?? "");
    if (!to) return log("no_phone", { event, order: orderId.slice(0, 8) });

    const p = await plan(db, event, orderId, version, clean(profile?.full_name || "Customer", 60));
    if (!p) return log("state_not_met", { event, order: orderId.slice(0, 8) });

    const { error: claimErr } = await db.from("whatsapp_events").insert({ event_id: p.key, event_type: `${p.template}_sent` });
    if (claimErr) {
      if (claimErr.code === "23505") return log("duplicate_skipped", { key: p.key });
      return log("claim_failed", { key: p.key, message: claimErr.message });
    }

    const res = await fetch(`https://graph.facebook.com/v20.0/${PHONE_ID}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp", to, type: "template",
        template: {
          name: p.template, language: { code: LANGUAGE },
          components: [{ type: "body", parameters: p.params.map((text) => ({ type: "text", text })) }],
        },
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      return log("sent", { key: p.key, template: p.template, to: `***${to.slice(-4)}`, msg: data?.messages?.[0]?.id });
    }
    await db.from("whatsapp_events").delete().eq("event_id", p.key); // allow retry
    const err = data?.error ?? {};
    log("failed", { key: p.key, template: p.template, to: `***${to.slice(-4)}`, status: res.status, code: err.code, subcode: err.error_subcode, message: err.message, details: err.error_data?.details });
  } catch (e) {
    log("error", { event, message: String((e as Error)?.message ?? e) });
  }
}
