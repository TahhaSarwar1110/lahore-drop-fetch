# Branded mobile side menu

## What will change
- Replace the plain white mobile menu with a branded drawer that uses Tabedaar’s navy, orange, and logo.
- Add a compact account area with profile access for signed-in users.
- Give every destination a matching icon and clearly highlight the current page in orange.
- Group operational links by account type while keeping the existing customer, rider, manager, and admin visibility rules unchanged.
- Keep logout separated at the bottom and preserve the signed-out login experience.

## Technical details
- Refactor only the mobile section of the shared header; desktop navigation and permissions remain unchanged.
- Use existing design tokens, button components, sheet behavior, and current routes.
- Ensure safe-area support, scrolling on short screens, touch-friendly row heights, and accessible labels.
- Verify the drawer visually at mobile width and confirm the app builds cleanly.
