# Order Payment Reconciliation, Expense Proof & Refunds

## What this adds

A full money trail per order: what the customer paid, what the rider actually spent, the automatic balance, and refund tracking — visible to customer, manager and rider with role-appropriate controls.

## Database changes (one additive migration)

**New columns on `orders` (all nullable/defaulted — existing orders unaffected):**
- `order_total_pkr integer` — grand total snapshot saved at order placement (goods + service charges). Backfilled for existing orders from item data + additional_charges.
- `paid_amount_pkr integer` — amount the customer actually paid (entered by manager from the payment proof, default 0).
- `payment_verification text` — `pending` / `verified` / `rejected` (default `pending`), plus `payment_verified_by`, `payment_verified_at`, `payment_rejection_reason`.
- `shopping_expense_pkr integer` — rider's actual spend; `expense_status text` — `pending_review` / `verified` / `rejected`; `expense_notes text`; `expense_submitted_by/at`, `expense_verified_by/at`, `expense_rejection_reason`.
- `customer_balance_pkr integer` — computed as verified payment − verified expense (written by server logic, never edited by rider/customer).
- `refund_status text` — `none` / `pending` / `initiated` / `completed` / `failed`; `refund_method text`; `refund_reference text`; `refund_proof_url/name`; `refund_notes text`; `refund_completed_by/at`.

**New table `order_expense_receipts`** — rider uploads multiple receipt images per order (id, order_id, rider_id, file path, uploaded_at). Private storage in the existing `pickup-proofs` bucket, same path/signed-URL pattern as current proofs.

**New table `order_financial_events`** — audit trail: every payment verification, rejection, expense submission/verification, balance calculation, refund status change, with actor, timestamp, old/new values. Corrections after verification insert new events instead of overwriting.

**Server-side validation:** a `SECURITY DEFINER` function enforces the rules (order can only be approved when verified payment ≥ order total; balance only from verified values; refund completion only by manager/admin; verified expense locked unless a manager reopens it). Grants follow the standard pattern (authenticated + service_role, RLS enabled, manager/admin policies).

## Order placement (PlaceOrder.tsx)
- Save the grand total (goods + service charges) as `order_total_pkr` at placement.
- Fix the customer Order Details total to include service charges so it matches checkout.

## Manager module (ManagerOrderDetails.tsx + new components)
- **Payment verification card**: shows order total, payment proof, manager enters the actual paid amount and marks Verified or Rejected (with reason). If paid < total, the outstanding amount is shown and the order stays payment-pending; the customer is asked to pay the difference (existing payment upload stays open for top-up payments — each new submission resets verification to pending).
- **Approval gate**: "Confirm Order" stays disabled until payment is verified AND paid amount ≥ order total (in addition to the existing all-items-approved rule).
- **Expense review card**: shows rider's submitted expense, notes and receipts; Verify or Reject with reason. On verify, balance is calculated automatically.
- **Refund card**: appears when balance > 0. Manager sets method (bank transfer / mobile wallet / cash), reference, notes, attaches proof, and moves status Pending → Initiated → Completed (or Failed). Completed requires proof or reference.
- Full financial summary + audit history (who did what, when).

## Rider module (RiderOrderDetails.tsx)
- New "Shopping Expense" section: enter actual amount spent, optional notes, upload one or more receipt photos (camera/gallery, same pattern as pickup proofs).
- Submit → status "Pending Manager Review". After verification the section locks; a rejected expense can be corrected and resubmitted. A manager can reopen a verified expense (logged in the audit trail).
- Rider sees order total, verified amount received, expense status, and the resulting balance/refund status — read-only.

## Customer module (OrderDetails.tsx)
- New "Payment Summary" card with friendly labels: Order Total, Amount Paid, Payment Status (Pending Verification / Verified / Rejected with reason), Actual Shopping Cost (once verified), Refund Due / Refund Completed, refund status.
- If payment is short, shows the outstanding amount and keeps the upload open for the difference.
- No internal notes or manager-only data exposed.

## Status handling
- Existing order statuses are untouched. Financial settlement is tracked separately via the new fields, so an order can be Delivered while its refund is still pending. "Financially settled" = expense verified AND (balance ≤ 0 OR refund completed).

## Notifications
- Reuse the existing notify/WhatsApp/email helpers for: payment rejected / shortfall requested, expense rejected, refund completed. Fire-and-forget, never blocking.

## Verification
- Add tests for the money rules (insufficient payment blocks approval; 16,000 paid − 12,000 expense = 4,000 refund; zero balance settles; over-spend flags discrepancy; refund completion requires manager).
- Browser-test the 16,000/12,000/4,000 scenario across manager and rider flows in the preview.

## Out of scope
- No changes to delivery-charge flow, WhatsApp automation, or unrelated screens.
