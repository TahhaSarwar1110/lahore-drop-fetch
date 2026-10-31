export const CONSENT_KEY = "tabedaar-advertising-consent-v1";
export const CONSENT_EVENT = "tabedaar-advertising-consent-change";
export const NOTICE = {
  version: "2026-10-31",
  text: "We use the Meta Pixel to share website visits and successful order submissions with Meta Platforms for advertising measurement and optimization. Meta receives device/browser information, IP address, page URL and advertising cookie identifiers. We do not send your contact details, item details, delivery address or payment information. Accept or reject advertising tracking; change your choice anytime in Cookie settings.",
};
export type ConsentRecord = {
  visitor: string;
  advertising: boolean;
  region: string | null;
  timestamp: string;
  notice: typeof NOTICE;
};
const regulated = new Set("AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE IS LI NO GB CH".split(" "));
export function requiresConsent(region: string | null) {
  return !region || !/^[A-Z]{2}$/.test(region) || region === "XX" || regulated.has(region);
}
export function advertisingAllowed(region: string | null, choice: boolean | undefined, optOut = false) {
  if (optOut || choice === false) return false;
  return choice === true || !requiresConsent(region);
}
export function parseTrace(text: string, host: string): string | null {
  const values = Object.fromEntries(text.trim().split("\n").map(line => line.split("=")));
  return values.h === host && /^[A-Z]{2}$/.test(values.loc ?? "") && !["XX", "T1"].includes(values.loc) ? values.loc : null;
}
export function readConsent(): ConsentRecord | null {
  try {
    const record = JSON.parse(localStorage.getItem(CONSENT_KEY) ?? "null");
    return record?.notice?.version === NOTICE.version && typeof record.advertising === "boolean" && typeof record.visitor === "string" && typeof record.timestamp === "string" ? record : null;
  } catch { return null; }
}
export function saveConsent(advertising: boolean, region: string | null) {
  const previous = readConsent();
  const record: ConsentRecord = { visitor: previous?.visitor ?? crypto.randomUUID(), advertising, region, timestamp: new Date().toISOString(), notice: NOTICE };
  // Preserve acceptance evidence when a later decision withdraws permission.
  const history = JSON.parse(localStorage.getItem(`${CONSENT_KEY}-history`) ?? "[]") as ConsentRecord[];
  localStorage.setItem(`${CONSENT_KEY}-history`, JSON.stringify([...history, record]));
  localStorage.setItem(CONSENT_KEY, JSON.stringify(record));
  window.dispatchEvent(new Event(CONSENT_EVENT));
}
let regionPromise: Promise<string | null> | undefined;
export function resolveRegion() {
  regionPromise ??= fetch("/cdn-cgi/trace", { signal: AbortSignal.timeout(2000), cache: "no-store" })
    .then(async response => response.ok ? parseTrace(await response.text(), location.host) : null).catch(() => null);
  return regionPromise;
}
export function hasAdvertisingOptOut() {
  return (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true || navigator.doNotTrack === "1";
}