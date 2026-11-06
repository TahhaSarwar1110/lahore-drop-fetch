import { describe, it, expect } from "bun:test";
import { isCustomerFacingPath } from "../src/components/WhatsAppSupportButton";

describe("floating WhatsApp support shortcut visibility", () => {
  it("shows the shortcut on every customer screen", () => {
    for (const path of [
      "/",
      "/place-order",
      "/order-history",
      "/order-details",
      "/order-details?orderId=abc",
      "/track",
      "/track?orderId=abc",
      "/profile",
      "/notifications",
      "/settings/notifications",
      "/contact",
      "/privacy",
      "/terms",
      "/data-deletion",
      "/login",
      "/signup",
    ]) {
      expect(isCustomerFacingPath(path)).toBe(true);
    }
  });

  it("hides the shortcut inside rider, manager and admin workspaces", () => {
    for (const path of [
      "/orders",
      "/orders/",
      "/rider/order/123",
      "/manager",
      "/manager/orders/123",
      "/manager/whatsapp",
      "/manager/pricing",
      "/manager/assign-rider/123",
      "/admin",
      "/admin/orders/123",
      "/admin/reports/settlements",
    ]) {
      expect(isCustomerFacingPath(path)).toBe(false);
    }
  });

  it("keeps customer order routes visible even though /orders is the rider dashboard", () => {
    expect(isCustomerFacingPath("/orders")).toBe(false);
    expect(isCustomerFacingPath("/order-history")).toBe(true);
    expect(isCustomerFacingPath("/order-details")).toBe(true);
  });
});
