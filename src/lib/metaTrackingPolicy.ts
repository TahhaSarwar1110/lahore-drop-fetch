const safePaths = new Set(["/", "/place-order", "/privacy", "/terms", "/contact"]);
const safeEntryPaths = new Set([...safePaths, "/login", "/signup"]);

export function isSafeTrackingLocation(url: URL, referrer: string, native: boolean) {
  if (native || !safePaths.has(url.pathname) || url.hash || [...url.searchParams.keys()].some(key => key !== "fbclid")) return false;
  if (!referrer) return true;
  try {
    const previous = new URL(referrer);
    return !previous.search && !previous.hash && (previous.origin !== url.origin || safeEntryPaths.has(previous.pathname));
  } catch { return false; }
}

// A visit is different from a pathname: returning from an excluded page is a new visit.
export class PageVisits {
  private current = "";
  private sent = false;
  enter(key: string) {
    if (this.current !== key) { this.current = key; this.sent = false; }
  }
  pending(key: string) { return this.current === key && !this.sent; }
  mark(key: string) { if (this.current === key) this.sent = true; }
}