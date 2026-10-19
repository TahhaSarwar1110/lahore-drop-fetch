import { describe, it, expect } from "bun:test";
import {
  getManagerItemsTotal,
  getShoppingBill,
  canMarkReadyForDelivery,
  getCustomerBalance,
  getGoodsOrderTotal,
  getSettlementTotal,
} from "../src/utils/orderFinancials";

describe("item-level pricing and settlement", () => {
  it("separates the reported order's bundle from goods and retains charges once in settlement", () => {
    expect(getGoodsOrderTotal(12699, 1499)).toBe(11200);
    expect(getSettlementTotal(10900, 1499)).toBe(12399);
    expect(getCustomerBalance(12700, 10900, 1499)).toBe(301);
  });
  it("requires a verified top-up when shopping plus charges exceeds received funds", () => {
    const balance = getCustomerBalance(12000, 10900, 1499);
    expect(balance).toBe(-399);
    expect(canMarkReadyForDelivery("verified", balance, "none")).toBe(false);
  });
  it("includes separate delivery once and permits release only after any refund", () => {
    expect(getSettlementTotal(10900, 1499, 500)).toBe(12899);
    expect(getCustomerBalance(12899, 10900, 1499, 500)).toBe(0);
    expect(canMarkReadyForDelivery("verified", 0, "none")).toBe(true);
    expect(canMarkReadyForDelivery("verified", 301, "pending")).toBe(false);
    expect(canMarkReadyForDelivery("verified", 301, "completed")).toBe(true);
  });
  it("order goods total uses manager prices and excludes rejected items", () => {
    const total = getManagerItemsTotal([
      { approval_status: "approved", manager_price_pkr: 5000 },
      { approval_status: "approved", manager_price_pkr: 3000 },
      { approval_status: "rejected", manager_price_pkr: 9000 },
    ]);
    expect(total).toBe(8000);
  });

  it("shopping bill is the sum of rider's actual item amounts", () => {
    expect(getShoppingBill([{ actual_paid_pkr: 4800 }, { actual_paid_pkr: 3500 }])).toBe(8300);
  });

  it("bill above payment means customer owes the difference", () => {
    expect(getCustomerBalance(8000, 8300)).toBe(-300);
    expect(canMarkReadyForDelivery("verified", -300, "none")).toBe(false);
  });

  it("bill below payment needs a completed refund before ready for delivery", () => {
    const balance = getCustomerBalance(8000, 7500);
    expect(balance).toBe(500);
    expect(canMarkReadyForDelivery("verified", balance, "pending")).toBe(false);
    expect(canMarkReadyForDelivery("verified", balance, "completed")).toBe(true);
  });

  it("exact payment can be marked ready once the bill is verified", () => {
    expect(canMarkReadyForDelivery("pending_review", 0, "none")).toBe(false);
    expect(canMarkReadyForDelivery("verified", 0, "none")).toBe(true);
  });
});
