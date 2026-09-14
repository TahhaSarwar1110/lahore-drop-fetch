/**
 * Central registry of Meta WhatsApp Cloud API message templates used for
 * business-initiated (automated) notifications.
 *
 * Business-initiated messages MUST use an APPROVED template — free-form text
 * only works inside the 24h customer service window. Each event below declares
 * its template name, language and the ordered {{1}}, {{2}}, ... body variables.
 *
 * If a template name changes in WhatsApp Manager, change it here only.
 */
export const WHATSAPP_TEMPLATES = {
  orderReceived: { name: "order", language: "en" },
  // "tabedaar_new_order_manager" is not approved in the WhatsApp account yet, so
  // manager alerts reuse the approved "order" template (no body variables).
  // Once a dedicated manager template is approved, set its name here.
  newOrderManager: { name: "order", language: "en" },
  itemApproved: { name: "tabedaar_item_approved", language: "en" },
  itemRejected: { name: "tabedaar_item_rejected", language: "en" },
  orderConfirmed: { name: "tabedaar_order_confirmed", language: "en" },
  paymentConfirmed: { name: "tabedaar_payment_confirmed", language: "en" },
  riderPickupReady: { name: "tabedaar_rider_pickup_ready", language: "en" },
} as const;

export type WhatsAppTemplateKey = keyof typeof WHATSAPP_TEMPLATES;
