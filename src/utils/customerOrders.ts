export const isActiveCustomerOrder = (status: string): boolean =>
  !["delivered", "cancelled", "canceled"].includes(status.trim().toLowerCase());

export const splitCustomerOrders = <T extends { status: string }>(orders: T[]) => ({
  active: orders.filter((order) => isActiveCustomerOrder(order.status)),
  history: orders.filter((order) => !isActiveCustomerOrder(order.status)).slice(0, 6),
});