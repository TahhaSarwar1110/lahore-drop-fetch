import { describe, it, expect } from "bun:test";
import {
  BUSINESS_WHATSAPP_NUMBER,
  BUSINESS_PHONE_DISPLAY,
  buildWhatsAppUrl,
} from "../src/utils/whatsapp";

describe("business WhatsApp support contact", () => {
  it("uses the support number 03013267622 in international form", () => {
    expect(BUSINESS_WHATSAPP_NUMBER).toBe("923013267622");
    expect(BUSINESS_PHONE_DISPLAY).toBe("+92 301 3267622");
  });

  it("normalizes a locally written support number to the same wa.me link", () => {
    expect(buildWhatsAppUrl("03013267622")).toBe("https://wa.me/923013267622");
    expect(buildWhatsAppUrl("+92 301 3267622")).toBe("https://wa.me/923013267622");
  });

  it("keeps the support message attached to the link", () => {
    expect(buildWhatsAppUrl(BUSINESS_WHATSAPP_NUMBER, "Hi Tabedaar!")).toBe(
      "https://wa.me/923013267622?text=Hi%20Tabedaar!",
    );
  });
});
