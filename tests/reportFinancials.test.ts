import { describe, expect, it } from "bun:test";
import { getReportFinancialTotals, getReportOrderFinancials, type ReportFinancialOrder } from "../src/utils/reportFinancials";

const order: ReportFinancialOrder = {
  paid_amount_pkr: 12700, shopping_expense_pkr: 10900, expense_status: "verified",
  order_total_pkr: 12699, additional_charges: 1499, delivery_charges: 0,
  customer_balance_pkr: 301, refund_status: "pending",
};

describe("admin financial reports", () => {
  it("sales count actual received payments, not quoted order totals", () => {
    expect(getReportFinancialTotals([order, { ...order, paid_amount_pkr: 0 }]).received).toBe(12700);
  });
  it("actual spending excludes delivery and service charges", () => {
    expect(getReportFinancialTotals([order]).shopping).toBe(10900);
  });
  it("counts completed refunds only, not cancelled or pending values", () => {
    expect(getReportFinancialTotals([order, { ...order, refund_status: "completed" }]).completedRefund).toBe(301);
  });
  it("counts bundle service and separate delivery exactly once", () => {
    expect(getReportFinancialTotals([{ ...order, delivery_charges: 500 }]).charges).toBe(1999);
  });
  it("shows pending refunds separately and removes completed ones", () => {
    expect(getReportFinancialTotals([order, { ...order, refund_status: "completed" }]).pendingRefund).toBe(301);
  });
  it("customer shortfalls include actual shopping and both charges", () => {
    expect(getReportOrderFinancials({ ...order, paid_amount_pkr: 12000, delivery_charges: 500, customer_balance_pkr: -899 }).outstanding).toBe(899);
  });
  it("uses initial payable before bill verification without doubling the bundle", () => {
    expect(getReportOrderFinancials({ ...order, shopping_expense_pkr: null, expense_status: null, paid_amount_pkr: 10000, delivery_charges: 500 }).outstanding).toBe(3199);
  });
  it("retains previously verified funds and ignores unreviewed refund estimates", () => {
    const result = getReportOrderFinancials({ ...order, expense_status: "pending_review" });
    expect(result.received).toBe(12700);
    expect(result.pendingRefund).toBe(0);
  });
});