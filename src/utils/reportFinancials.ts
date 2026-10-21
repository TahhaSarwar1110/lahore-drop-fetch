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
}

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
    completedRefund: order.refund_status === "completed" ? refund : 0,
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