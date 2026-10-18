import { describe, expect, it } from "bun:test";
import { splitCustomerOrders } from "../src/utils/customerOrders";

describe("customer home order groups", () => {
  it("keeps active orders separate from recent closed orders", () => {
    const result = splitCustomerOrders([{ status: "Order Confirmed" }, { status: "In Delivery" }, { status: "Delivered" }, { status: "Cancelled" }]);
    expect(result.active.map(o => o.status)).toEqual(["Order Confirmed", "In Delivery"]);
    expect(result.history.map(o => o.status)).toEqual(["Delivered", "Cancelled"]);
  });
});