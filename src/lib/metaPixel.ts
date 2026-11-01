import { Capacitor } from "@capacitor/core";
import { advertisingAllowed, currentAdvertisingChoice, getResolvedRegion, hasAdvertisingOptOut, readConsent, resolveRegion } from "./advertisingConsent";
import { isSafeTrackingLocation, PageVisits } from "./metaTrackingPolicy";

export const META_PIXEL_ID = "3679622928881260";
type Pixel = {
  (...args: unknown[]): void;
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[][];
  push: Pixel;
  loaded: boolean;
  version: string;
  disablePushState?: boolean;
};
declare global { interface Window { fbq?: Pixel; _fbq?: Pixel; } }
let initialized = false;
let sdkReady: Promise<boolean> | undefined;
const visits = new PageVisits();
let currentVisit = "";
const sentOrders = new Set<string>();
export function canTrackPath() {
  return isSafeTrackingLocation(new URL(location.href), document.referrer, Capacitor.isNativePlatform());
}
function permittedNow() { return canTrackPath() && advertisingAllowed(getResolvedRegion(), currentAdvertisingChoice(), hasAdvertisingOptOut()); }
function loadSdk(): Promise<boolean> {
  if (window.fbq?.callMethod) return Promise.resolve(true);
  if (sdkReady) return sdkReady;
  sdkReady = new Promise<boolean>(resolve => {
    const existing = document.getElementById("tabedaar-meta-pixel");
    const script = existing instanceof HTMLScriptElement ? existing : document.createElement("script");
    const finish = (ready: boolean) => {
      clearTimeout(timer);
      script.removeEventListener("load", loaded);
      script.removeEventListener("error", failed);
      if (!ready) { script.remove(); sdkReady = undefined; }
      resolve(ready);
    };
    const loaded = () => finish(typeof window.fbq?.callMethod === "function");
    const failed = () => finish(false);
    const timer = setTimeout(failed, 8000);
    script.addEventListener("load", loaded);
    script.addEventListener("error", failed);
    if (!existing) {
      script.id = "tabedaar-meta-pixel"; script.async = true;
      script.src = "https://connect.facebook.net/en_US/fbevents.js";
      document.head.appendChild(script);
    }
  });
  return sdkReady;
}
export async function syncMetaPermission() {
  // Revoke immediately, including while geography or the SDK is still resolving.
  if (!permittedNow()) window.fbq?.("consent", "revoke");
  await resolveRegion();
  const permitted = permittedNow();
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
    // Own SPA reporting: the SDK otherwise sends before private-route gates run.
    window.fbq.disablePushState = true;
    window.fbq("consent", "grant");
    window.fbq("set", "autoConfig", false, META_PIXEL_ID);
    window.fbq("init", META_PIXEL_ID, {}, { agent: "lovable" });
    initialized = true;
  } else window.fbq?.("consent", "grant");
  const ready = await loadSdk();
  if (!permittedNow()) { window.fbq?.("consent", "revoke"); return false; }
  return ready;
}
export async function trackPageView(visitKey = currentVisit || location.pathname) {
  currentVisit = visitKey;
  visits.enter(visitKey);
  if (!await syncMetaPermission() || !permittedNow() || !visits.pending(visitKey)) return;
  const pixel = window.fbq;
  if (!pixel?.callMethod) return;
  pixel("trackSingle", META_PIXEL_ID, "PageView");
  visits.mark(visitKey);
}
export async function trackPlacedOrder(orderId: string) {
  // Never defer/replay a conversion that happened without permission.
  if (!orderId || !permittedNow() || !await syncMetaPermission() || !permittedNow() || sentOrders.has(orderId)) return;
  const key = `tabedaar-meta-order-${orderId}`;
  try { if (localStorage.getItem(key) || sessionStorage.getItem(key)) return; } catch { /* In-memory deduplication remains available. */ }
  const pixel = window.fbq;
  if (!pixel?.callMethod) return;
  // Only record dispatch after the SDK accepts the call; never replay blocked outcomes.
  pixel("trackSingle", META_PIXEL_ID, "Lead", {}, { eventID: `order_${orderId}` });
  sentOrders.add(orderId);
  try {
    const evidence = JSON.stringify({ eventId: `order_${orderId}`, region: getResolvedRegion(), consent: readConsent(), occurredAt: new Date().toISOString() });
    sessionStorage.setItem(key, evidence);
    localStorage.setItem(key, evidence);
  } catch { /* Tracking failure must not affect a persisted order. */ }
}