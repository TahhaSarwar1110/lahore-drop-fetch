// Phone-based auth helpers.
// Accounts created with a mobile number use a deterministic synthetic email
// derived from the normalized phone number, so Supabase Auth (which requires
// an email) can sign them up and in without SMS verification.

const SYNTHETIC_DOMAIN = "tabedaar.local";

/**
 * Normalize a phone number to digits-only international form without '+'.
 * Defaults to Pakistan (+92) when no country code is present:
 *   "03001234567" -> "923001234567"
 *   "3001234567"  -> "923001234567"
 *   "+923001234567" -> "923001234567"
 */
export const normalizePhoneDigits = (raw: string): string => {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = `92${digits.slice(1)}`;
  else if (digits.length === 10 && digits.startsWith("3")) digits = `92${digits}`;
  return digits;
};

export const phoneToSyntheticEmail = (rawPhone: string): string =>
  `${normalizePhoneDigits(rawPhone)}@${SYNTHETIC_DOMAIN}`;

export const isSyntheticEmail = (email: string): boolean =>
  email.endsWith(`@${SYNTHETIC_DOMAIN}`);

/**
 * Resolve a login identifier (email or phone) to the email Supabase expects.
 * Anything containing '@' is treated as a real email; otherwise as a phone.
 */
export const resolveLoginEmail = (identifier: string): string => {
  const trimmed = identifier.trim();
  if (trimmed.includes("@")) return trimmed.toLowerCase();
  return phoneToSyntheticEmail(trimmed);
};
