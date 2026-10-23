import { describe, expect, it } from "bun:test";
import postgres from "postgres";

// Exercises the deployed RPCs/triggers, but always rolls back test records.
// No request Authorization header is set, so test fixtures cannot send messages.
const run = process.env.RUN_PRIVILEGED_SETTLEMENT_TESTS === "1" ? it : it.skip;
describe("atomic live settlement rules (rolled back)", () => {
  run("creates/revises obligations, dedupes approved records and protects delivery/refunds", async () => {
    const url = process.env.SUPABASE_DB_URL;
    if (!url) return;
    const sql = postgres(url, { prepare: false, max: 1 });
    try {
      await sql.begin(async tx => {
        const [manager] = await tx`select user_id from public.user_roles where role='manager' limit 1`;
        const [customer] = await tx`select user_id from public.user_roles where role='customer' limit 1`;
        expect(Boolean(manager && customer)).toBe(true);
        await tx`select set_config('request.jwt.claims', ${JSON.stringify({ sub: manager.user_id, role: "authenticated" })}, true)`;
        const [order] = await tx`insert into public.orders(user_id,delivery_address,order_total_pkr,paid_amount_pkr,payment_verification,additional_charges,delivery_charges,status,payment_submitted_at,payment_proof_url) values(${customer.user_id},'Transactional settlement test',7000,5000,'pending',800,200,'Purchasing',now(),'legacy-test-proof') returning id`;
        await tx`update public.orders set shopping_expense_pkr=6000,expense_status='verified' where id=${order.id}`;
        let obs = await tx`select * from public.order_settlement_obligations where order_id=${order.id} and status='pending'`;
        expect(obs.length).toBe(1);
        expect(obs[0].kind).toBe("outstanding");
        expect(obs[0].amount_pkr).toBe(2000);
        let queue = await tx`select * from public.whatsapp_events where order_id=${order.id}`;
        expect(queue.length).toBe(1);
        expect(queue[0].template_name).toBe("tabedaar_outstanding_balance");
        expect(queue[0].template_params[2]).toBe("2,000");
        expect(queue[0].template_params[3]).toContain("6000");
        await tx`update public.orders set expense_notes='View/recalculation test' where id=${order.id}`;
        expect((await tx`select * from public.whatsapp_events where order_id=${order.id}`).length).toBe(1);
        await expect(tx.savepoint(async sp => { await sp`update public.orders set status='In Delivery' where id=${order.id}`; })).rejects.toThrow();
        await tx`select public.verify_order_payment(${order.id},1000,true,null)`;
        let [current] = await tx`select * from public.orders where id=${order.id}`;
        expect(current.customer_balance_pkr).toBe(-1000);
        expect(current.paid_amount_pkr).toBe(6000);
        await expect(tx.savepoint(async sp => { await sp`select public.verify_order_payment(${order.id},1000,true,null)`; })).rejects.toThrow("already reviewed");
        queue = await tx`select * from public.whatsapp_events where order_id=${order.id} and template_name='tabedaar_payment_confirmed'`;
        expect(queue.length).toBe(1);
        expect(queue[0].template_params[2]).toBe("1,000");
        await tx`update public.orders set payment_submitted_at=clock_timestamp(),payment_verification='pending' where id=${order.id}`;
        await tx`select public.verify_order_payment(${order.id},1000,true,null)`;
        [current] = await tx`select * from public.orders where id=${order.id}`;
        expect(current.customer_balance_pkr).toBe(0);
        expect((await tx`select * from public.order_settlement_obligations where order_id=${order.id} and status='pending'`).length).toBe(0);
        await tx`select public.mark_ready_for_delivery(${order.id})`;
        await tx`update public.orders set status='In Delivery' where id=${order.id}`;
        await expect(tx.savepoint(async sp => { await sp`update public.orders set status='Delivered' where id=${order.id}`; })).rejects.toThrow("proof");
        const [refund] = await tx`insert into public.orders(user_id,delivery_address,order_total_pkr,paid_amount_pkr,payment_verification,status) values(${customer.user_id},'Transactional refund test',7000,8500,'verified','Purchasing') returning id`;
        await tx`update public.orders set shopping_expense_pkr=7000,expense_status='verified' where id=${refund.id}`;
        obs = await tx`select * from public.order_settlement_obligations where order_id=${refund.id}`;
        expect(obs[0].amount_pkr).toBe(1500);
        await tx`update public.orders set status='In Delivery' where id=${refund.id}`;
        await tx`select public.update_refund_status(${refund.id},'initiated','bank_transfer',null,null,null,null)`;
        expect((await tx`select * from public.whatsapp_events where order_id=${refund.id} and template_name='tabedaar_refund_completed'`).length).toBe(0);
        await expect(tx.savepoint(async sp => { await sp`select public.update_refund_status(${refund.id},'completed','bank_transfer',null,null,null,null)`; })).rejects.toThrow("reference or proof");
        await tx`select public.update_refund_status(${refund.id},'completed','bank_transfer','TXN-SETTLEMENT-TEST',null,null,null)`;
        queue = await tx`select * from public.whatsapp_events where order_id=${refund.id} and template_name='tabedaar_refund_completed'`;
        expect(queue.length).toBe(1);
        expect(queue[0].template_params[2]).toBe("1,500");
        expect(queue[0].template_params[4]).toBe("TXN-SETTLEMENT-TEST");
        await expect(tx.savepoint(async sp => { await sp`select public.update_refund_status(${refund.id},'completed','bank_transfer','TXN-SETTLEMENT-TEST',null,null,null)`; })).rejects.toThrow("already completed");
        // Rollback returns all production records to their initial state.
        throw new Error("ROLLBACK_TEST_OK");
      });
    } catch (e) {
      if ((e as Error).message !== "ROLLBACK_TEST_OK") throw e;
    } finally { await sql.end(); }
  });
});