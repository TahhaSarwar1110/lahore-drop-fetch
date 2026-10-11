# Restore admin order-status updates

## What will change
- Keep the existing status selector on the admin order details page and make it save reliably.
- Use the existing single database action that updates both the order and its status history together.
- Restrict that action to authenticated admins and reject unsupported status values.
- Refresh the order after a successful change and send the existing customer status notification without blocking the update.

## Technical details
- Harden the existing `update_order_status` database function with a server-side admin role check, order existence check, and status allowlist.
- Replace the two separate browser writes with one atomic function call to avoid partial updates and permission-policy conflicts.
- Keep current order workflow screens and status options unchanged.
- Verify type safety and the live build after implementation.
