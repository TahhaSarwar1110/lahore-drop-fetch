import { describe, expect, test } from "bun:test";
import { isSafeTrackingLocation, PageVisits } from "../src/lib/metaTrackingPolicy";

describe("Meta website privacy and visit reliability", () => {
  const page = new URL("https://tabedaar.com/place-order");
  test("clean signup/login arrivals permit order-page measurement", () => {
    expect(isSafeTrackingLocation(page, "https://tabedaar.com/login", false)).toBe(true);
    expect(isSafeTrackingLocation(page, "https://tabedaar.com/signup", false)).toBe(true);
  });
  test("auth, private pages and native apps stay untracked", () => {
    for (const path of ["/login", "/signup", "/reset-password", "/order-details", "/profile", "/manager"]) {
      expect(isSafeTrackingLocation(new URL(path, page), "", false)).toBe(false);
    }
    expect(isSafeTrackingLocation(page, "", true)).toBe(false);
  });
  test("sensitive URLs/referrers remain blocked, with only ad-click query allowed", () => {
    expect(isSafeTrackingLocation(new URL("?fbclid=example", page), "", false)).toBe(true);
    expect(isSafeTrackingLocation(new URL("?email=example", page), "", false)).toBe(false);
    expect(isSafeTrackingLocation(new URL("#access_token=example", page), "", false)).toBe(false);
    expect(isSafeTrackingLocation(page, "https://tabedaar.com/login?email=example", false)).toBe(false);
    expect(isSafeTrackingLocation(page, "https://tabedaar.com/order-details", false)).toBe(false);
  });
  test("each visit reports once, including returning through an untracked page", () => {
    const visits = new PageVisits();
    visits.enter("home-1"); expect(visits.pending("home-1")).toBe(true);
    visits.mark("home-1"); visits.enter("home-1"); expect(visits.pending("home-1")).toBe(false);
    visits.enter("login"); visits.enter("home-2"); expect(visits.pending("home-2")).toBe(true);
    expect(visits.pending("home-1")).toBe(false);
  });
});