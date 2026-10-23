import { describe, expect, it } from "bun:test";
import { canCancelManagerOrder } from "../src/utils/orderCancellation";

describe("manager cancellation", () => {
  it("allows managers to cancel pending and in-progress orders", () => {
    for (const status of ["Pending", "Order Confirmed", "Shopper Assigned", "Purchasing", "In Delivery"])
      expect(canCancelManagerOrder(status, true)).toBe(true);
  });
  it("does not offer manager cancellation to other roles", () => {
    expect(canCancelManagerOrder("Pending", false)).toBe(false);
  });
  it("does not cancel completed or already cancelled orders", () => {
    expect(canCancelManagerOrder("Delivered", true)).toBe(false);
    expect(canCancelManagerOrder("Cancelled", true)).toBe(false);
  });
});