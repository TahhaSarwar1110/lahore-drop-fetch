/** Managers can cancel an open order, including one already assigned to a rider. */
export const canCancelManagerOrder = (status: string, isManager: boolean): boolean =>
  isManager && !["Delivered", "Cancelled"].includes(status);