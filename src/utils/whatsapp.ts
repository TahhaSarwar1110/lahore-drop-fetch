import { Capacitor } from "@capacitor/core";

/**
 * Builds a WhatsApp click-to-chat URL.
 *
 * - Web: `https://wa.me/<number>` — WhatsApp redirects this to `api.whatsapp.com`,
 *   which sends `X-Frame-Options`/CSP headers. That means it MUST be opened as a
 *   top-level navigation (a real anchor with `target="_blank"`), never inside an
 *   iframe — otherwise the browser reports `ERR_BLOCKED_BY_RESPONSE`.
 * - Native (Capacitor iOS/Android): the `whatsapp://` deep link opens the installed app directly.
 *
 * @param phone E.164 phone number (e.g., "+923044693863" or "923044693863")
 * @param message Optional pre-filled message (URL-encoded automatically)
 */
export const buildWhatsAppUrl = (phone: string, message?: string): string => {
  // Remove everything except digits. WhatsApp expects the number WITH country code but WITHOUT the leading +.
  let cleanPhone = phone.replace(/\D/g, "");

  // Normalize local Pakistani numbers (03xxxxxxxxx -> 923xxxxxxxxx)
  if (cleanPhone.startsWith("0")) {
    cleanPhone = `92${cleanPhone.slice(1)}`;
  }

  const isNative = Capacitor?.isNativePlatform?.() ?? false;

  if (isNative) {
    const base = `whatsapp://send?phone=${cleanPhone}`;
    return message ? `${base}&text=${encodeURIComponent(message)}` : base;
  }

  const base = `https://wa.me/${cleanPhone}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
};

/** Official Tabedaar.com business WhatsApp number (digits only, with country code). */
export const BUSINESS_WHATSAPP_NUMBER = "923044693863";

/** Display form of the business number, e.g. for tel: labels. */
export const BUSINESS_PHONE_DISPLAY = "+92 304 4693863";
