/**
 * Builds a WhatsApp click-to-chat (`wa.me`) URL.
 * @param phone E.164 phone number (e.g., "+923001234567" or "923001234567")
 * @param message Optional pre-filled message (URL-encoded automatically)
 * @returns Safe `https://wa.me/...` URL
 */
export const buildWhatsAppUrl = (phone: string, message?: string): string => {
  // Remove everything except digits. wa.me expects the number WITH country code but WITHOUT the leading +.
  const cleanPhone = phone.replace(/\D/g, "");
  const base = `https://wa.me/${cleanPhone}`;
  if (!message) return base;
  return `${base}?text=${encodeURIComponent(message)}`;
};
