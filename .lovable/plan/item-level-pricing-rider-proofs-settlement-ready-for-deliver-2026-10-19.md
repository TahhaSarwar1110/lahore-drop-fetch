# Item-Level Pricing, Rider Proofs, Settlement & Ready-for-Delivery Flow

## The new order journey

```text
Customer places order (expected price per item)
  -> Manager reviews each item: approve/reject + sets "Manager Price"
  -> Customer sees manager price per item; order total = sum of manager prices + service/delivery charges
  -> Manager confirms order -> Customer pays -> Manager verifies payment
  -> Rider shops: per item enters Actual Paid Amount + pickup photo + receipt photo
  -> All items picked -> Manager gets in-app + email: "All items picked, please verify total bill"
  -> Manager verifies rider bill (total actual = sum of item actual amounts)
      - Bill > customer paid  -> Customer gets WhatsApp + email: outstanding amount to pay
                                 Customer uploads top-up -> Manager verifies
      - Bill < customer paid  -> Customer gets notification: balance will be refunded
                                 Manager refunds, uploads refund screenshot (visible to customer)
      - Equal                 -> settled
  -> Manager marks "Ready for Delivery" (only allowed when settled)
  -> Rider starts delivery, uploads delivery photo -> visible to customer + manager
```

## 1. Manager pricing per item
- In item review, each item gets a "Manager Price (PKR)" field next to the customer's expected price. Required before approving an item.
- Order total is recalculated automatically from approved items' manager prices plus service and delivery charges. Rejected items are excluded.
- Order cannot be confirmed until every approved item has a manager price.

## 2. Customer view of prices
- Order details shows each item with: Expected Price, Manager Price, and later the Actual Paid amount.
- Payment Summary uses the new manager-priced total.

## 3. Rider per-item shopping
- For each item the rider enters Actual Paid Amount and uploads two photos: the picked-up item and the receipt (Take Photo / Choose from Gallery, as today).
- An item counts as "picked" only when amount + both photos are saved.
- The total shopping bill = sum of item actual amounts (replaces the single expense entry; the existing order-level expense becomes this calculated sum).
- When the last item is picked, the manager gets an in-app notification and an email (to contact@tabedaar.com, which forwards to managers).

## 4. Manager bill verification and settlement
- Manager sees every item's actual amount and photos, then Verifies or Rejects (rider can correct rejected items).
- On verify, the balance is calculated against verified customer payments:
  - Customer owes: WhatsApp + email + in-app with the outstanding amount; payment upload reopens for the top-up.
  - Refund due: WhatsApp + email + in-app saying the balance will be refunded to their account.
- Refund: manager records method/reference and uploads the refund screenshot; customer sees it in order details.

## 5. Refund account details (new)
- Customers currently have no place to share refund account details. Add a "Refund Account" section on the order (bank/wallet name, account title, account/IBAN number) that the customer fills when a refund is due, shown to the manager in the refund card. Please confirm or tell me if you'd prefer it on the Profile page instead.

## 6. Ready for Delivery gate
- New manager button "Mark Ready for Delivery", enabled only when the bill is verified and settled (no outstanding, refund completed if due).
- Rider's "Start Delivery" stays locked until the order is Ready for Delivery (enforced on the server, not just hidden).
- New tracking stage "Ready for Delivery" shown to the customer.

## 7. Delivery proof
- Rider uploads a delivery photo to mark delivered (existing flow, kept mandatory).
- Delivery photo shown on both customer and manager order details.

## 8. Customer proof gallery
- Customer order details gets an "Shopping Proof" section showing each item's pickup photo and receipt, plus refund screenshot and delivery photo.

## WhatsApp note
Business-initiated WhatsApp messages need Meta-approved templates. Two new templates are needed: "outstanding payment" and "refund on the way". I'll create them for review; until Meta approves (up to 48 hours), those two messages go by email and in-app only.

## Technical details
- Migration (additive): `order_items` gets `manager_price_pkr`, `actual_paid_pkr`, `receipt_url/name`, `picked_amount_submitted_at`, `item_expense_status`. `orders` gets `ready_for_delivery_at/by` and refund account fields (or a small `order_refund_accounts` table). Status list gains `Ready for Delivery`.
- SECURITY DEFINER RPCs: `set_item_manager_price` (manager/admin; recalculates `order_total_pkr`), `submit_item_purchase` (assigned rider; amount + proofs; when all approved items are picked, sets `shopping_expense_pkr` = sum and `expense_status = pending_review`), `mark_ready_for_delivery` (requires settlement). Existing `verify_shopping_expense`, `verify_order_payment`, `update_refund_status` keep the audit trail in `order_financial_events`.
- Extend `enforce_settlement_before_delivery` so `In Delivery` requires `Ready for Delivery` first.
- Storage: receipts in the private `pickup-proofs` bucket; extend read policies so the order's customer can view their item proofs and refund proof.
- Notifications: new `notify` events `all_items_picked`, `outstanding_payment_due`, `refund_due`, `refund_completed`, `ready_for_delivery`; manager email via the existing staff email template, customer emails via app emails, WhatsApp via `send-whatsapp` templates.
- UI: `OrderItemApproval`, `ManagerOrderDetails`, `ExpenseReview` (per-item breakdown), `RefundManager`, `RiderOrderDetails` (per-item purchase form), `OrderDetails` + `PaymentSummary` (prices, proofs, refund account), `TrackOrder` stage.
- Legacy orders without manager prices keep current behavior.
- Tests: total from manager prices excludes rejected items; bill = sum of item actuals; owed/refund/settled cases; ready-for-delivery blocked until settled. Browser-test the full flow as manager, rider and customer.
