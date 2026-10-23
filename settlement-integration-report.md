# WhatsApp settlement integration — 23 October 2026

## Implemented
- Meta directly verified all templates as APPROVED, language `en`: order review/payment 6 body variables; refund due 4; outstanding balance 4; refund completed 5; existing payment confirmed 3.
- Existing `notify`, `send-whatsapp`, signed `whatsapp-webhook`, Inbox, credentials and business number preserved. Generic caller-supplied settlement templates are rejected by send-whatsapp; authoritative sends use notify.
- Final review fingerprints derive from item decisions, prices and feedback. Payment is due after order confirmation. Review-only is retained before payment is due or when all items are rejected. If a review was already sent, later payment uses the existing payment-only template rather than repeating review. Unsent review-only is superseded by the consolidated template.
- Balance remains verified funds minus actual goods expense minus bundle/service and additional delivery charges, each once. Durable refund/outstanding obligations are created or revised atomically; obsolete pending notices are suppressed.
- Per-payment approved amounts are stored on payment proof records and audited. Each distinct approval queues its exact approved amount, not cumulative funds. Duplicate approvals are rejected.
- Refund completion is manager/admin-only, requires method plus reference or proof, validates new private uploaded proof paths, prevents repeat completion, stores immutable completion amount, and generates a safe customer-visible reference for proof-only completion.
- Existing negative-balance delivery start/completion gates and delivery-proof requirement remain. Positive verified balances allow delivery without waiting for refund or Ready mark.

## Files/functions
Database migrations: `drizzle/migrations/0023_settlement_whatsapp_obligations.sql` through `0027_settlement_obligation_send_validity.sql`.
New table: `order_settlement_obligations` with authenticated scoped SELECT and service-role access. Reused: orders, order_items, order_payment_proofs, order_financial_events, whatsapp_events, whatsapp_messages, whatsapp_conversations, notification_deliveries.
RPCs/triggers: queue_settlement_whatsapp, queue_review_whatsapp, claim_settlement_whatsapp, capture_settlement_obligation, capture_settlement_audit_notification, review_confirmation_whatsapp, suppress_obsolete_settlement_messages; updated verify_order_payment, update_refund_status and invalidate_unsettled_delivery_release.
Code: `supabase/functions/notify/settlement.ts`, `notify/index.ts`, `notify/whatsapp.ts`, `send-whatsapp/index.ts`, `whatsapp-webhook/index.ts`; `src/components/manager/OrderItemApproval.tsx`, `PaymentVerification.tsx`, `src/pages/manager/ManagerOrderDetails.tsx`, `src/utils/whatsappTemplates.ts`, `AGENTS.md`.
Tests: `tests/settlementWhatsApp.test.ts`, `tests/settlementDatabase.sql`, `tests/settlementReview.sql`.

## Idempotency and retry
Durable whatsapp_events rows store templates/parameters, attempts, Meta IDs, statuses, safe errors and retry deadlines. Claims are atomic and concurrency-safe. Audit/obligation IDs identify money events. Database enqueue wakes existing notify using request authorization; foreground orchestration also drains pending sends. Explicit 429/5xx rejections get at most three attempts using bounded background processing, not permanent polling. Timeouts/ambiguous acceptance remain unknown and are not blindly resent. Notification failure cannot roll back financial changes. Signed Meta callbacks update settlement status and Inbox messages.

## Verification
- 51 automated assertions/tests passed across settlement, existing finances, item pricing and reports; preview build OK.
- Two live database transaction suites passed with all test data rolled back: review consolidation/rejection exclusion and deferred payment; partial/full top-ups, duplicate approval/refund prevention, proof requirement, pending-refund delivery exception.
- Signed-in manager dashboard, Inbox and real order details rendered correctly.
- Real manager UI approved a temporary Rs. 1,000 top-up: received became Rs. 6,000, remaining Rs. 1,000 stayed blocked, approval buttons disappeared. Its Payment Confirmed and revised Outstanding Balance both received actual delivered callbacks. Temporary order and related financial records removed; delivery evidence retained.
- Five direct template smoke tests using Meta example values received actual delivered callbacks. These verify provider contracts, not five full customer workflow tests.

## Remaining limitations
- Full customer signup/session → genuine payment screenshot declaration → manager verification → rider delivery and refund proof upload/completion were not all exercised end-to-end; user requested wrap-up.
- No permanent recovery processor exists. If an edge worker terminates before a retry deadline, a later notification dispatch must drain remaining rows. A stuck sending/unknown row requires reconciliation, not automatic resend.
- Existing obligations were backfilled without sending historical customer notices; completed historical refunds continue using their audit trail.
- Settlement changes after an already completed refund are blocked pending explicit reconciliation, preventing the current model from paying the same excess twice; a broader multi-refund correction workflow was not introduced.
- New website/app presentation changes require the usual website upload/mobile rebuild. Cloud functions and schema are already applied.