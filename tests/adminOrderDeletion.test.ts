import { test, expect } from "bun:test";
import { createClient } from "@supabase/supabase-js";

// Opt-in integration check against the real permission boundary; no customer orders are deleted.
const sessionPath = process.env.ADMIN_DELETION_SESSION_FILE;
test.skipIf(!sessionPath)("admin deletion is available for Purchasing orders and rejects anonymous callers", async () => {
  if (!sessionPath) return;
  const minted = await Bun.file(sessionPath).json();
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("App connection settings required");
  const admin = createClient(url, key, { auth: { persistSession: false } });
  await admin.auth.setSession(minted.session);
  const id = crypto.randomUUID();
  const { error: insertError } = await admin.from("orders").insert({
    id, user_id: minted.session.user.id, status: "Purchasing",
    delivery_address: "Temporary deletion regression check",
  });
  expect(insertError).toBeNull();
  try {
    const anonymous = createClient(url, key, { auth: { persistSession: false } });
    const denied = await anonymous.rpc("admin_delete_order", { p_order_id: id });
    expect(denied.error).not.toBeNull();
    const existing = await admin.from("orders").select("status").eq("id", id).single();
    expect(existing.data?.status).toBe("Purchasing");
    const removed = await admin.rpc("admin_delete_order", { p_order_id: id });
    expect(removed.error).toBeNull();
    const readBack = await admin.from("orders").select("id").eq("id", id);
    expect(readBack.data).toEqual([]);
  } finally {
    await admin.rpc("admin_delete_order", { p_order_id: id });
    await admin.auth.stopAutoRefresh();
  }
});