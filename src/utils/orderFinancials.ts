// Shared financial reconciliation helpers (integer PKR amounts only).

export type PaymentVerification = "pending" | "verified" | "rejected";
export type ExpenseStatus = "pending_review" | "verified" | "rejected";
export type RefundStatus = "none" | "pending" | "initiated" | "completed" | "failed";

/** Amount still owed by the customer before the order can be approved. */
export const getOutstandingAmount = (orderTotal: number, paidAmount: number): number =>
  Math.max(0, orderTotal - paidAmount);

/** An order may only be approved when verified payment covers the order total. */
export const canApproveOrder = (
  orderTotal: number,
  paidAmount: number,
  verification: PaymentVerification | string | null | undefined
): boolean => verification === "verified" && paidAmount >= orderTotal;

/** Customer balance = verified payment − verified shopping expense. */
export const getCustomerBalance = (paidAmount: number, shoppingExpense: number): number =>
  paidAmount - shoppingExpense;

/** Refund is due only when the balance is positive. */
export const getRefundDue = (balance: number): number => Math.max(0, balance);

/** Negative balance means the rider spent more than the customer paid. */
export const hasUncoveredExpense = (balance: number): boolean => balance < 0;

/** Financially settled = expense verified AND (no refund due OR refund completed). */
export const isFinanciallySettled = (
  expenseStatus: ExpenseStatus | string | null | undefined,
  balance: number | null | undefined,
  refundStatus: RefundStatus | string | null | undefined
): boolean => {
  if (expenseStatus !== "verified" || balance === null || balance === undefined) return false;
  if (balance <= 0) return true;
  return refundStatus === "completed";
};

export const PAYMENT_VERIFICATION_LABELS: Record<string, string> = {
  pending: "Pending Verification",
  verified: "Verified",
  rejected: "Rejected",
};

export const EXPENSE_STATUS_LABELS: Record<string, string> = {
  pending_review: "Pending Manager Review",
  verified: "Verified",
  rejected: "Rejected",
};

export const REFUND_STATUS_LABELS: Record<string, string> = {
  none: "No Refund Due",
  pending: "Refund Pending",
  initiated: "Refund Initiated",
  completed: "Refunded",
  failed: "Refund Failed",
};
