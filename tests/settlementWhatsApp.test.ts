import { describe, expect, it } from "bun:test";
import { SETTLEMENT_TEMPLATES, normalizeSettlementPhone, settlementRetryStatus } from "../supabase/functions/notify/settlement";
import { getCustomerBalance, canRiderDeliver, canSkipReadyForDelivery } from "../src/utils/orderFinancials";

describe("approved settlement template contracts", () => {
  it("uses six variables for merged review/payment", () => expect(SETTLEMENT_TEMPLATES.tabedaar_order_review_payment).toBe(6));
  it("uses four variables for refund due", () => expect(SETTLEMENT_TEMPLATES.tabedaar_refund_due).toBe(4));
  it("uses four variables for outstanding balance", () => expect(SETTLEMENT_TEMPLATES.tabedaar_outstanding_balance).toBe(4));
  it("uses five variables for completed refund", () => expect(SETTLEMENT_TEMPLATES.tabedaar_refund_completed).toBe(5));
  it("retains three variables for approved payment", () => expect(SETTLEMENT_TEMPLATES.tabedaar_payment_confirmed).toBe(3));
});
describe("settlement and delivery rules", () => {
  it("negative 2000 is an outstanding balance with charges counted once", () => expect(getCustomerBalance(5000, 6000, 800, 200)).toBe(-2000));
  it("pending declarations do not bypass a negative verified balance", () => expect(canRiderDeliver(7000, "verified", -2000, "none")).toBe(false));
  it("partial top-up leaves delivery blocked", () => expect(canRiderDeliver(7000, "verified", getCustomerBalance(6000, 6000, 800, 200), "none")).toBe(false));
  it("full verified top-up removes the financial gate", () => expect(canRiderDeliver(7000, "verified", getCustomerBalance(7000, 6000, 800, 200), "none")).toBe(true));
  it("pending refund allows delivery and bypasses Ready alone", () => {
    expect(canRiderDeliver(7000, "verified", 1500, "pending")).toBe(true);
    expect(canSkipReadyForDelivery("verified", 1500)).toBe(true);
  });
  it("still requires bill verification even with positive funds", () => expect(canRiderDeliver(7000, "pending_review", 1500, "pending")).toBe(false));
  it("normalizes Pakistani and international numbers", () => {
    expect(normalizeSettlementPhone("03013267622")).toBe("923013267622");
    expect(normalizeSettlementPhone("0092 301 3267622")).toBe("923013267622");
    expect(normalizeSettlementPhone("+44 7700 900123")).toBe("447700900123");
    expect(normalizeSettlementPhone("123")).toBe(null);
  });
  it("only retries explicit transient rejections, bounded to three attempts", () => {
    expect(settlementRetryStatus(429, 1)).toBe("retry");
    expect(settlementRetryStatus(500, 3)).toBe("failed");
    expect(settlementRetryStatus(400, 1)).toBe("failed");
  });
});