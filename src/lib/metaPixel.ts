import { Capacitor } from "@capacitor/core";
import { advertisingAllowed, hasAdvertisingOptOut, readConsent, resolveRegion } from "./advertisingConsent";

export const META_PIXEL_ID = "3679622928881260";
type Pixel = {
  (...args: unknown[]): void;
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[][];
  push: Pixel;
  loaded: boolean;
  version: string;
};
declare global { interface Window { fbq?: Pixel; _fbq?: Pixel; } }
const safePaths = new Set(["/", "/place-order", "/privacy", "/terms", "/contact"]);
let initialized = false;
let lastPage: string | undefined;
const sentOrders = new Set<string>();
export function canTrackPath() {
  return !Capacitor.isNativePlatform() && safePaths.has(location.pathname) && !location.hash && [...new URLSearchParams(location.search).keys()].every(key => key === "fbclid");
}
export async function syncMetaPermission() {
  const region = await resolveRegion();
  const permitted = canTrackPath() && advertisingAllowed(region, readConsent()?.advertising, hasAdvertisingOptOut());
  if (!permitted) { window.fbq?.("consent", "revoke"); return false; }
  if (!initialized) {
    if (!window.fbq) {
      const pixel = function (...args: unknown[]) {
        if (pixel.callMethod) pixel.callMethod.apply(pixel, args);
        else pixel.queue.push(args);
      } as Pixel;
      pixel.queue = []; pixel.push = pixel; pixel.loaded = true; pixel.version = "2.0";
      window.fbq = pixel; window._fbq = pixel;
    }
    window.fbq("consent", "grant");
    window.fbq("set", "autoConfig", false, META_PIXEL_ID);
    window.fbq("init", META_PIXEL_ID, {}, { agent: "lovable" });
    if (!document.getElementById("tabedaar-meta-pixel")) {
      const script = document.createElement("script");
      script.id = "tabedaar-meta-pixel"; script.async = true;
      script.src = "https://connect.facebook.net/en_US/fbevents.js";
      document.head.appendChild(script);
    }
    initialized = true;
  } else window.fbq?.("consent", "grant");
  return true;
}
export async function trackPageView() {
  if (!await syncMetaPermission() || lastPage === location.pathname) return;
  lastPage = location.pathname;
  window.fbq?.("track", "PageView");
}
export async function trackPlacedOrder(orderId: string) {
  // Never defer/replay a conversion that happened without permission.
  if (!await syncMetaPermission() || sentOrders.has(orderId)) return;
  const key = `tabedaar-meta-order-${orderId}`;
  try { if (sessionStorage.getItem(key)) return; } catch { /* In-memory deduplication remains available. */ }
  sentOrders.add(orderId);
  try {
    sessionStorage.setItem(key, JSON.stringify({ eventId: `order_${orderId}`, region: await resolveRegion(), consent: readConsent(), occurredAt: new Date().toISOString() }));
  } catch { /* Tracking failure must not affect a persisted order. */ }
  window.fbq?.("track", "Lead", {}, { eventID: `order_${orderId}` });
}