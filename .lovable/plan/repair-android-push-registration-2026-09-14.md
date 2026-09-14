# Repair Android push registration

## Changes
- Add an authenticated device-registration function that securely assigns the current Android token to the signed-in account, even when that phone was previously used by another account.
- Update the app’s notification setup to use that function, report registration failures, and refresh rotated tokens.
- Remove the device registration during sign-out so notifications cannot remain attached to the previous account.
- Keep existing notification preferences and recipient rules unchanged.

## Validation
- Verify the app compiles.
- Deploy and test the registration function.
- Confirm delivery records are created once a registered recipient triggers an order event.

## Technical details
The current token is uniquely stored but client-side access rules prevent a newly signed-in account from taking ownership of a token created under a previous account. The new function validates the signed-in session and performs that reassignment server-side without exposing credentials.
