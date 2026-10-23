/**
 * Central registry of Meta WhatsApp Cloud API message templates used for
 * business-initiated (automated) notifications.
 *
 * Business-initiated messages MUST use an APPROVED template — free-form text
 * only works inside the 24h customer service window. Each event below declares
 * its template name, language and the ordered {{1}}, {{2}}, ... body variables.
 *
 * The six order-lifecycle templates are sent server-side by the `notify` and
 * `send-whatsapp` edge functions with database-verified parameters:
 *
 *   tabedaar_order_received                {{1}} name {{2}} order no {{3}} items {{4}} total
 *   tabedaar_items_reviewed                {{1}} name {{2}} order no {{3}} approved {{4}} rejected {{5}} reasons
 *   tabedaar_payment_required_after_review {{1}} name {{2}} order no {{3}} approved {{4}} rejected {{5}} amount
 *   tabedaar_payment_confirmed             {{1}} name {{2}} order no {{3}} confirmed amount
 *   tabedaar_items_picked_up               {{1}} name {{2}} order no
 *   tabedaar_order_delivered               {{1}} name {{2}} order no {{3}} final amount
 *
 * If a template name changes in WhatsApp Manager, change it here only.
 */
export const WHATSAPP_TEMPLATES = {
  orderReviewPayment: { name: "tabedaar_order_review_payment", language: "en" },
  refundDue: { name: "tabedaar_refund_due", language: "en" },
  outstandingBalance: { name: "tabedaar_outstanding_balance", language: "en" },
  refundCompleted: { name: "tabedaar_refund_completed", language: "en" },
  orderReceived: { name: "tabedaar_order_received", language: "en" },
  itemsReviewed: { name: "tabedaar_items_reviewed", language: "en" },
  paymentRequiredAfterReview: { name: "tabedaar_payment_required_after_review", language: "en" },
  paymentConfirmed: { name: "tabedaar_payment_confirmed", language: "en" },
  itemsPickedUp: { name: "tabedaar_items_picked_up", language: "en" },
  orderDelivered: { name: "tabedaar_order_delivered", language: "en" },
  // "tabedaar_new_order_manager" is not approved in the WhatsApp account yet, so
  // manager alerts reuse the approved "order" template (no body variables).
  newOrderManager: { name: "order", language: "en" },
  orderConfirmed: { name: "tabedaar_order_confirmed", language: "en" },
  riderPickupReady: { name: "tabedaar_rider_pickup_ready", language: "en" },
} as const;

export type WhatsAppTemplateKey = keyof typeof WHATSAPP_TEMPLATES;
