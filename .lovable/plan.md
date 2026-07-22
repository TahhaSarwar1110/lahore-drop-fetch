# QA Fix Plan — Tabedaar.com

I've grouped the 18 issues into 4 phases so we can ship and QA one area at a time without regressions. Each phase is a self-contained batch — you approve, I build, we test, then move on.

---

## Phase 1 — Global & Foundational (3 issues)

Low-risk, app-wide fixes. Landing these first prevents rework in later phases.

1. **Password show/hide toggle** — reusable `<PasswordInput>` with eye icon; swap into Login, Signup, and any admin/manager password fields.
2. **Logo consistency** — audit `Header` vs `Footer` logo asset + sizing tokens; standardise on the same source file and aspect ratio.
3. **Sticky notifications bug** — investigate the toast + realtime `useNotifications` flow. Give order toasts an auto-dismiss timeout and de-dupe on the same `notification.id` so they don't stack forever.

---

## Phase 2 — Admin Dashboard (6 issues)

Biggest cluster; needs the most regression care.

4. **Responsiveness + status filter break** — fix the `OrdersTable` / filter row overflow on small widths; wrap in horizontal scroll container.
5. **Logout bar break on Orders / Tracking / Permissions / Users tabs** — root cause is likely a layout container inside `Tabs` shrinking the header; contain to `Header` only.
6. **Order list scroll** — add virtualised/native scroll wrapper with a max-height on the orders table body.
7. **Rider assignment blocker** — trace the current failure in `AssignOrderDialog` (approved-items gate + edge function status check) and unblock the happy path.
8. **"Shopper Assigned" must be dynamic** — remove "Shopper Assigned" from the manual `OrderStatusSelect` options; it is only set automatically by the assign-order edge function.
9. **Pickup location visibility for Admin** — surface the customer's pinned pickup coords/address on `AdminOrderDetails` (map preview + copyable address).

---

## Phase 3 — Manager & Approval Flow (5 issues)

10. **Manager ↔ Admin assignment parity** — reuse the same `AssignOrderDialog` component (already used by Admin) in the Manager flow instead of the current custom `AssignRider` page logic.
11. **"Rider already assigned" vs "approve details first" mismatch** — single source of truth: derive assignment/approval state from `order_assignments` + `order_items.status`, not stale local props. Fix both entry points (list badge + detail page CTA).
12. **Missing "Save" on item approval** — add an explicit **Save Changes** button on `OrderItemApproval` that commits pending approve/reject changes; remove the misleading toast.
13. **Mobile ↔ Web approval sync** — the mobile approval writes are likely not updating `order_items.status` in a way the web query reads. Align both platforms to the same mutation + realtime refresh.
14. **Pickup address visibility for Manager** — same treatment as #9 on `ManagerOrderDetails`.

---

## Phase 4 — Customer Flow (3 issues)

15. **Map delivery-address picker bug** — debug `LocationPickerMap`: reverse-geocode + write back to the address field on marker drop; validate on submit.
16. **Item weight field** — add optional `weight_kg` + `weight_unit` inputs to `OrderItemForm`, persist to `order_items`, show in item cards on Manager / Rider / Order details.
17. **Customer notifications end-to-end** — ensure a `notifications` row + email is created for: payment received/rejected, every status transition, delivery-charge request, delivery payment confirmed, and final delivery (with proof URL link). Centralise in an `order-events` edge function.

---

## Suggested Order of Delivery

`Phase 1 → Phase 2 → Phase 3 → Phase 4`

Reasoning: Phase 1's password + notifications work touches components used everywhere. Phase 2 unblocks Admin QA. Phase 3 depends on Phase 2's assignment fixes. Phase 4 is mostly additive and safe to land last.

---

## Technical Notes (for reference)

- No schema changes needed for Phase 1–2. Phase 3 may add a `notes` column to `order_items` if approval requires reasons. Phase 4 adds `weight_kg`, `weight_unit` to `order_items`.
- Notification hardening will use `toast.dismiss(id)` + `duration` in Sonner and a `Set<string>` guard in `useNotifications` to prevent duplicate realtime toasts.
- Assignment parity will consolidate on `AssignOrderDialog` + the existing `assign-order` edge function; the Manager page becomes a thin wrapper.
- Pickup location visibility reuses `SingleRiderMap` styling with a static pin.

Shall I start with **Phase 1**?
