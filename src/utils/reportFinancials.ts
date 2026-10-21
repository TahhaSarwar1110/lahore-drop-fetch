import { getGoodsOrderTotal, getSettlementTotal } from "./orderFinancials";

export interface ReportFinancialOrder {
  paid_amount_pkr: number;
  shopping_expense_pkr: number | null;
  expense_status: string | null;
  order_total_pkr: number | null;
  additional_charges: number | null;
  delivery_charges: number;
  customer_balance_pkr: number | null;
  refund_status: string;
  completed_refund_pkr?: number;
}

export interface ReportFinancialEvent {
  order_id: string;
  event_type: string;
  old_value: unknown;
  new_value: unknown;
}

/** Recover completed amounts from the recorded balance at completion, never today's mutable balance. */
export const getCompletedRefundsFromEvents = (events: ReportFinancialEvent[]) => {
  const balances = new Map<string, number>();
  const totals = new Map<string, number>();
  let unknownAmounts = 0;
  for (const event of events) {
    const next = event.new_value && typeof event.new_value === "object" ? event.new_value as Record<string, unknown> : {};
    const previous = event.old_value && typeof event.old_value === "object" ? event.old_value as Record<string, unknown> : {};
    if (typeof next.customer_balance_pkr === "number") balances.set(event.order_id, next.customer_balance_pkr);
    if (event.event_type !== "refund_completed" || previous.refund_status === "completed") continue;
    const amount = typeof next.refund_amount_pkr === "number" ? next.refund_amount_pkr : balances.get(event.order_id);
    if (amount === undefined) { unknownAmounts++; continue; }
    totals.set(event.order_id, (totals.get(event.order_id) ?? 0) + Math.max(0, amount));
  }
  return { totals, unknownAmounts };
};

export const getReportOrderFinancials = (order: ReportFinancialOrder) => {
  const received = Math.max(0, order.paid_amount_pkr || 0);
  const shopping = Math.max(0, order.shopping_expense_pkr ?? 0);
  const service = Math.round(order.additional_charges ?? 0);
  const delivery = Math.round(order.delivery_charges || 0);
  const refund = Math.max(0, order.customer_balance_pkr ?? 0);
  const target = order.expense_status === "verified" && order.shopping_expense_pkr !== null
    ? getSettlementTotal(shopping, service, delivery)
    : order.order_total_pkr === null ? null
    : getSettlementTotal(getGoodsOrderTotal(order.order_total_pkr, service), service, delivery);
  return {
    received,
    shopping,
    service,
    delivery,
    charges: service + delivery,
    completedRefund: order.completed_refund_pkr ?? 0,
    pendingRefund: order.expense_status === "verified" && order.refund_status !== "completed" ? refund : 0,
    outstanding: target === null ? 0 : Math.max(0, target - received),
    target,
  };
};

export const getReportFinancialTotals = (orders: ReportFinancialOrder[]) => orders.reduce((total, order) => {
  const amounts = getReportOrderFinancials(order);
  return {
    received: total.received + amounts.received,
    shopping: total.shopping + amounts.shopping,
    charges: total.charges + amounts.charges,
    service: total.service + amounts.service,
    delivery: total.delivery + amounts.delivery,
    completedRefund: total.completedRefund + amounts.completedRefund,
    pendingRefund: total.pendingRefund + amounts.pendingRefund,
    outstanding: total.outstanding + amounts.outstanding,
  };
}, { received: 0, shopping: 0, charges: 0, service: 0, delivery: 0, completedRefund: 0, pendingRefund: 0, outstanding: 0 });