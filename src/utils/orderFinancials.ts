// Shared financial reconciliation helpers (integer PKR amounts only).

export type PaymentVerification = "pending" | "verified" | "rejected";
export type ExpenseStatus = "pending_review" | "verified" | "rejected";
export type RefundStatus = "none" | "pending" | "initiated" | "completed" | "failed";

/** Amount still owed by the customer before the order can be approved. */
export const getOutstandingAmount = (orderTotal: number, paidAmount: number): number =>
  Math.max(0, orderTotal - paidAmount);

/** The stored initial payable includes the bundle; the displayed Order Total is goods only. */
export const getGoodsOrderTotal = (initialPayable: number, bundleCharges: number = 0): number =>
  Math.max(0, initialPayable - Math.round(bundleCharges));

/** Bundle and third-party delivery charges are separate from goods and counted once. */
export const getSettlementTotal = (goods: number, bundleCharges: number = 0, deliveryCharges: number = 0): number =>
  goods + Math.round(bundleCharges) + Math.round(deliveryCharges);

/** Declared funds affect the customer display only; never operational readiness. */
export const getCustomerPaymentDisplay = (target: number, verified: number, submitted: number, verification: string) => {
  const pendingAmount = verification === "pending" ? Math.max(0, submitted) : 0;
  const amountPaid = verified + pendingAmount;
  return { amountPaid, pendingAmount, outstanding: getOutstandingAmount(target, amountPaid) };
};

export const isValidCustomerPaymentAmount = (value: string): boolean =>
  /^\d+$/.test(value.trim()) && Number.isSafeInteger(Number(value)) && Number(value) > 0 && Number(value) <= 2147483647;

/** An order may only be approved when verified payment covers the order total. */
export const canApproveOrder = (
  orderTotal: number,
  paidAmount: number,
  verification: PaymentVerification | string | null | undefined
): boolean => verification === "verified" && paidAmount >= orderTotal;

/** Reconciled orders use verified totals; only legacy orders use payment_status. */
export const hasVerifiedOrderPayment = (
  orderTotal: number | null | undefined,
  paidAmount: number,
  verification: string | null | undefined,
  legacyStatus: string | null | undefined,
  deliveryCharges: number = 0
): boolean => orderTotal == null
  ? legacyStatus === "confirmed"
  : canApproveOrder(orderTotal + Math.round(deliveryCharges), paidAmount, verification);

/** Customer balance = verified payment − verified shopping expense. */
export const getCustomerBalance = (paidAmount: number, shoppingExpense: number, bundleCharges: number = 0, deliveryCharges: number = 0): number =>
  paidAmount - getSettlementTotal(shoppingExpense, bundleCharges, deliveryCharges);

/** Refund is due only when the balance is positive. */
export const getRefundDue = (balance: number): number => Math.max(0, balance);

/** Negative balance means the rider spent more than the customer paid. */
export const hasUncoveredExpense = (balance: number): boolean => balance < 0;

/** Amount the customer still has to pay when the expense exceeded their payment. */
export const getAmountOwed = (balance: number | null | undefined): number =>
  balance === null || balance === undefined ? 0 : Math.max(0, -balance);

/**
 * Financially settled = expense verified AND balance is zero, or a positive
 * balance has been refunded. A negative balance (customer owes) is never settled.
 */
export const isFinanciallySettled = (
  expenseStatus: ExpenseStatus | string | null | undefined,
  balance: number | null | undefined,
  refundStatus: RefundStatus | string | null | undefined
): boolean => {
  if (expenseStatus !== "verified" || balance === null || balance === undefined) return false;
  if (balance < 0) return false;
  if (balance === 0) return true;
  return refundStatus === "completed";
};

/** Rider may deliver only after settlement (legacy orders without a total are exempt). */
export const canRiderDeliver = (
  orderTotal: number | null | undefined,
  expenseStatus: ExpenseStatus | string | null | undefined,
  balance: number | null | undefined,
  refundStatus: RefundStatus | string | null | undefined
): boolean =>
  orderTotal === null || orderTotal === undefined
    ? true
    : isFinanciallySettled(expenseStatus, balance, refundStatus);

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

/** Goods total from manager-verified item prices (rejected items excluded). */
export const getManagerItemsTotal = (
  items: { approval_status?: string | null; manager_price_pkr?: number | null }[]
): number =>
  items
    .filter((i) => i.approval_status === "approved")
    .reduce((sum, i) => sum + (i.manager_price_pkr ?? 0), 0);

/** Rider shopping bill = sum of actual amounts paid per item. */
export const getShoppingBill = (pickups: { actual_paid_pkr?: number | null }[]): number =>
  pickups.reduce((sum, p) => sum + (p.actual_paid_pkr ?? 0), 0);

/** Manager may release the order for delivery only once money is settled. */
export const canMarkReadyForDelivery = (
  expenseStatus: string | null | undefined,
  balance: number | null | undefined,
  refundStatus: string | null | undefined
): boolean => isFinanciallySettled(expenseStatus, balance, refundStatus);
