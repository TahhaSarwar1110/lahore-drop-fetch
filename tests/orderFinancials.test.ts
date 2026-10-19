import { describe, it, expect } from "bun:test";
import {
  getOutstandingAmount,
  canApproveOrder,
  getCustomerBalance,
  getRefundDue,
  hasUncoveredExpense,
  isFinanciallySettled,
  getAmountOwed,
  canRiderDeliver,
  hasVerifiedOrderPayment,
  getCustomerPaymentDisplay,
  isValidCustomerPaymentAmount,
} from "../src/utils/orderFinancials";

describe("order financial reconciliation rules", () => {
  it("requires separate delivery charges in verified assignment payment without doubling the bundle", () => {
    expect(hasVerifiedOrderPayment(12699, 12699, "verified", "confirmed", 500)).toBe(false);
    expect(hasVerifiedOrderPayment(12699, 13199, "verified", "confirmed", 500)).toBe(true);
  });
  it("updates customer amount paid and outstanding immediately without enabling unverified orders", () => {
    expect(getCustomerPaymentDisplay(7299, 0, 7299, "pending")).toEqual({ amountPaid: 7299, pendingAmount: 7299, outstanding: 0 });
    expect(hasVerifiedOrderPayment(7299, 0, "pending", "submitted")).toBe(false);
  });
  it("adds a pending top-up once and excludes it after review", () => {
    expect(getCustomerPaymentDisplay(18000, 16000, 2000, "pending").outstanding).toBe(0);
    expect(getCustomerPaymentDisplay(18000, 18000, 2000, "verified").amountPaid).toBe(18000);
    expect(getCustomerPaymentDisplay(18000, 16000, 2000, "rejected").outstanding).toBe(2000);
  });
  it("requires a positive whole-rupee customer payment", () => {
    expect(isValidCustomerPaymentAmount("7299")).toBe(true);
    for (const value of ["", "0", "-1", "1.5", "abc", "2147483648"]) expect(isValidCustomerPaymentAmount(value)).toBe(false);
  });
  it("shows zero outstanding for the reported Rs. 7,299 verified payment", () => {
    expect(getOutstandingAmount(7299, 7299)).toBe(0);
  });

  it("permits rider assignment for verified full payment despite stale submitted status", () => {
    expect(hasVerifiedOrderPayment(7299, 7299, "verified", "submitted")).toBe(true);
    expect(hasVerifiedOrderPayment(7299, 7298, "verified", "confirmed")).toBe(false);
    expect(hasVerifiedOrderPayment(7299, 7299, "pending", "confirmed")).toBe(false);
    expect(hasVerifiedOrderPayment(7299, 7299, "rejected", "confirmed")).toBe(false);
    expect(hasVerifiedOrderPayment(null, 0, "pending", "confirmed")).toBe(true);
  });
  it("blocks approval when the customer paid less than the order total (16,000 total / 14,000 paid)", () => {
    expect(canApproveOrder(16000, 14000, "verified")).toBe(false);
    expect(getOutstandingAmount(16000, 14000)).toBe(2000);
  });

  it("blocks approval while verification is pending or rejected, even if the amount suffices", () => {
    expect(canApproveOrder(16000, 16000, "pending")).toBe(false);
    expect(canApproveOrder(16000, 16000, "rejected")).toBe(false);
  });

  it("allows approval once verified payment covers the total", () => {
    expect(canApproveOrder(16000, 16000, "verified")).toBe(true);
    expect(canApproveOrder(16000, 17000, "verified")).toBe(true);
    expect(getOutstandingAmount(16000, 16000)).toBe(0);
  });

  it("computes the PKR 4,000 refund for the 16,000 paid / 12,000 expense scenario", () => {
    const balance = getCustomerBalance(16000, 12000);
    expect(balance).toBe(4000);
    expect(getRefundDue(balance)).toBe(4000);
    expect(hasUncoveredExpense(balance)).toBe(false);
  });

  it("settles with no refund when expense equals the verified payment", () => {
    const balance = getCustomerBalance(16000, 16000);
    expect(balance).toBe(0);
    expect(getRefundDue(balance)).toBe(0);
    expect(isFinanciallySettled("verified", balance, "none")).toBe(true);
  });

  it("flags an uncovered expense when the rider spent more than the customer paid", () => {
    const balance = getCustomerBalance(16000, 18000);
    expect(balance).toBe(-2000);
    expect(hasUncoveredExpense(balance)).toBe(true);
    expect(getRefundDue(balance)).toBe(0);
    expect(getAmountOwed(balance)).toBe(2000);
    expect(isFinanciallySettled("verified", balance, "none")).toBe(false);
    expect(canRiderDeliver(16000, "verified", balance, "none")).toBe(false);
  });

  it("lets the rider deliver once the top-up is verified (balance back to zero)", () => {
    const balance = getCustomerBalance(18000, 18000);
    expect(canRiderDeliver(16000, "verified", balance, "none")).toBe(true);
  });

  it("blocks delivery until the refund is completed", () => {
    expect(canRiderDeliver(16000, "verified", 4000, "initiated")).toBe(false);
    expect(canRiderDeliver(16000, "verified", 4000, "completed")).toBe(true);
  });

  it("blocks delivery while the expense is unverified", () => {
    expect(canRiderDeliver(16000, "pending_review", null, "none")).toBe(false);
  });

  it("is not financially settled while a refund is pending or only initiated", () => {
    expect(isFinanciallySettled("verified", 4000, "pending")).toBe(false);
    expect(isFinanciallySettled("verified", 4000, "initiated")).toBe(false);
    expect(isFinanciallySettled("verified", 4000, "failed")).toBe(false);
    expect(isFinanciallySettled("verified", 4000, "completed")).toBe(true);
  });

  it("is never settled before the expense is verified", () => {
    expect(isFinanciallySettled("pending_review", 4000, "completed")).toBe(false);
    expect(isFinanciallySettled(null, null, "none")).toBe(false);
  });
});
