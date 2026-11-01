import { beforeAll, expect, test } from "bun:test";
import { CONSENT_KEY, NOTICE } from "../src/lib/advertisingConsent";

const calls: unknown[][] = [];
const stored = new Map<string, string>();
const storage = {
  getItem: (key: string) => stored.get(key) ?? null,
  setItem: (key: string, value: string) => { stored.set(key, value); },
};
const pixel = Object.assign((...args: unknown[]) => { calls.push(args); }, {
  callMethod: (...args: unknown[]) => { calls.push(args); }, queue: [], loaded: true, version: "2.0", disablePushState: false,
});
let tracking: typeof import("../src/lib/metaPixel");
beforeAll(async () => {
  Object.assign(globalThis, {
    window: { fbq: pixel }, location: new URL("https://tabedaar.com/place-order"),
    document: { referrer: "https://tabedaar.com/login" },
    localStorage: storage, sessionStorage: storage,
    fetch: async () => new Response("h=tabedaar.com\nloc=PK"),
  });
  tracking = await import("../src/lib/metaPixel");
});

test("Pixel disables automatic history reporting before initializing with no customer data", async () => {
  await tracking.trackPageView("order-visit");
  expect(pixel.disablePushState).toBe(true);
  expect(calls).toContainEqual(["set", "autoConfig", false, "3679622928881260"]);
  expect(calls).toContainEqual(["init", "3679622928881260", {}, { agent: "lovable" }]);
  expect(calls.filter(c => c[2] === "PageView")).toHaveLength(1);
  await tracking.trackPageView("order-visit");
  expect(calls.filter(c => c[2] === "PageView")).toHaveLength(1);
});

test("an order dispatches one Lead with an event ID and never a Purchase or monetary value", async () => {
  await tracking.trackPlacedOrder("persisted-order-test");
  await tracking.trackPlacedOrder("persisted-order-test");
  expect(calls.filter(c => c[2] === "Lead")).toEqual([
    ["trackSingle", "3679622928881260", "Lead", {}, { eventID: "order_persisted-order-test" }],
  ]);
  expect(calls.some(c => c.includes("Purchase"))).toBe(false);
  expect(stored.has("tabedaar-meta-order-persisted-order-test")).toBe(true);
});

test("refused conversions are not dispatched or replayed by later acceptance", async () => {
  stored.set(CONSENT_KEY, JSON.stringify({ visitor: "test", advertising: false, timestamp: "2026-11-01", region: "PK", notice: NOTICE }));
  await tracking.trackPlacedOrder("blocked-order-test");
  expect(stored.has("tabedaar-meta-order-blocked-order-test")).toBe(false);
  expect(calls.filter(c => c[2] === "Lead")).toHaveLength(1);
  stored.delete(CONSENT_KEY);
  await tracking.trackPageView("new-allowed-visit");
  expect(calls.filter(c => c[2] === "Lead")).toHaveLength(1);
});