
## Overview

Today the delivery type (`within_city` / `out_of_city` / `out_of_country`) is only prepended into `delivery_address` string, and the delivery charge flow is identical for all types. We'll formalize it and add a second payment stage (delivery payment) that is required only for out-of-city / out-of-country orders.

## Data model (migration)

Add columns on `public.orders`:

- `delivery_type text default 'within_city'` — one of `within_city | out_of_city | out_of_country`
- `total_weight_kg numeric(10,2)` — set by manager
- `delivery_charges numeric(10,2) default 0` — set by manager (3rd-party delivery cost)
- `delivery_charges_set_at timestamptz` / `delivery_charges_set_by uuid`
- `delivery_payment_status text default 'not_required'` — one of `not_required | pending | submitted | confirmed`
- `delivery_payment_proof_url text`, `delivery_payment_proof_name text`
- `delivery_payment_submitted_at`, `delivery_payment_confirmed_at`, `delivery_payment_confirmed_by uuid`

Backfill `delivery_type` from the existing `[OUT OF CITY]` / `[OUT OF COUNTRY]` prefix in `delivery_address`, then strip the prefix (best-effort — safe UPDATE with regex).

For out-of-city/country orders, `delivery_payment_status` starts at `pending` (or moves to pending when manager sets charges).

Notifications: reuse existing `notifications` table + `type` values (`delivery_charges_set`, `delivery_payment_submitted`, `delivery_payment_confirmed`).

## Place Order screen (`src/pages/PlaceOrder.tsx`)

- Persist `delivery_type` in its own column (stop encoding it in the address string).
- When `deliveryType !== 'within_city'`, show a highlighted **disclaimer card** near the delivery-type selector: "Delivery charges will be calculated and shared by the manager after purchase, based on the weight of your items. You'll be notified to pay them before delivery."
- Order-summary section: keep showing bundle-based **service charges** exactly as today. Do **not** add any delivery-cost line here for out-of-city orders (label the row "Service Charges" instead of "Total"). Show a small note under the total: "Delivery charges billed separately."

## Manager Order Details (`src/pages/manager/ManagerOrderDetails.tsx` + new component)

For `delivery_type !== 'within_city'`:

- Add a new card `DeliveryChargesInput` between `AdditionalCharges` and `PaymentConfirmation` for the initial service payment (order remains as-is — items approved → confirm → service payment).
- After service payment is confirmed, show a **new** `DeliveryChargesInput` card allowing manager to input:
  - `total_weight_kg` (numeric, required)
  - `delivery_charges` (numeric PKR, required)
  - Save button → writes to `orders`, sets `delivery_payment_status='pending'`, creates a customer notification (`delivery_charges_set`) + email with the weight and amount, and shows a read-only summary afterwards. Manager can edit while `delivery_payment_status ∈ {pending, submitted}`.
- Add a second `DeliveryPaymentConfirmation` card (parallel to existing `PaymentConfirmation`) that shows the customer's uploaded delivery-payment proof and lets manager confirm/reject it. On confirm: set `delivery_payment_status='confirmed'`, notify customer, and notify assigned rider (if any) via `notifications`.
- Rider assignment gating (`canAssignRider`) stays keyed on the initial service payment, so managers can still assign a rider before delivery-payment is collected. That rider just won't be allowed to mark delivered until delivery payment is confirmed (or the order is within-city).

## Customer Order Details (`src/pages/OrderDetails.tsx`)

For out-of-city/country orders:

- New "Delivery Charges" section that appears once manager sets weight & charges. Shows weight, charge amount, and the current `delivery_payment_status`.
- When `delivery_payment_status === 'pending'`: show a `DeliveryPaymentUpload` component (mirrors existing `PaymentUpload`) — upload screenshot proof to `payment-proofs` bucket, submits and moves status to `submitted`.
- When `submitted`: show "Waiting for manager verification".
- When `confirmed`: show green confirmation.

## Rider (`src/pages/rider/RiderOrderDetails.tsx` + rider "mark delivered" flow)

- Add a gating check: rider can only mark an order as **Delivered** (and upload the delivery receipt attachment) when:
  - `delivery_type === 'within_city'`, OR
  - `delivery_payment_status === 'confirmed'`.
- If gated, show a disabled state with helper text: "Waiting for customer to pay delivery charges and manager to verify."
- Notification to rider on delivery-payment confirmation (already handled server-side by the manager action above).

## Notifications

Reuse `notificationHelper.createNotification` + `sendNotificationEmail`. New events:

- `delivery_charges_set` → customer
- `delivery_payment_submitted` → managers of the order (best-effort: notify `confirmed_by` if present)
- `delivery_payment_confirmed` → customer + assigned rider

## Files touched

- **Migration** (new): add columns + backfill.
- `src/pages/PlaceOrder.tsx` — disclaimer, store `delivery_type` column, summary label tweak.
- `src/pages/OrderDetails.tsx` — delivery-charges section + upload component.
- `src/pages/manager/ManagerOrderDetails.tsx` — wire new cards.
- New: `src/components/manager/DeliveryChargesInput.tsx`
- New: `src/components/manager/DeliveryPaymentConfirmation.tsx`
- New: `src/components/customer/DeliveryPaymentUpload.tsx`
- `src/pages/rider/RiderOrderDetails.tsx` (and/or delivered-action component) — gate "Mark Delivered".
- Types will regenerate from Supabase; no manual edit of `src/integrations/supabase/types.ts`.

## Out of scope / non-changes

- Bundle service pricing logic (`useBundlePricing`) — unchanged.
- Existing service `PaymentConfirmation` / `PaymentUpload` flow — unchanged.
- Admin/reports screens — unchanged (they read `delivery_address` which stays populated).
- No change to rider assignment flow.

Confirm and I'll implement.
