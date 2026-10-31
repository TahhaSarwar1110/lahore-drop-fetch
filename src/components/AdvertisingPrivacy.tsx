import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { Button } from "@/components/ui/button";
import { CONSENT_EVENT, CONSENT_KEY, NOTICE, hasAdvertisingOptOut, readConsent, requiresConsent, resolveRegion, saveConsent } from "@/lib/advertisingConsent";
import { syncMetaPermission, trackPageView } from "@/lib/metaPixel";

export function openCookieSettings() { window.dispatchEvent(new Event("tabedaar-cookie-settings")); }

export function AdvertisingPrivacy() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [region, setRegion] = useState<string | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (Capacitor.isNativePlatform()) return;
    let active = true;
    void resolveRegion().then(value => {
      if (!active) return;
      setRegion(value);
      setOpen(requiresConsent(value) && !readConsent());
      void trackPageView();
    });
    const refresh = () => { void syncMetaPermission().then(() => trackPageView()); };
    const storage = (event: StorageEvent) => { if (event.key === CONSENT_KEY || event.key === null) refresh(); };
    const settings = () => setOpen(true);
    window.addEventListener(CONSENT_EVENT, refresh);
    window.addEventListener("storage", storage);
    window.addEventListener("tabedaar-cookie-settings", settings);
    return () => {
      active = false;
      window.removeEventListener(CONSENT_EVENT, refresh);
      window.removeEventListener("storage", storage);
      window.removeEventListener("tabedaar-cookie-settings", settings);
    };
  }, []);
  useEffect(() => { void trackPageView(); }, [location.pathname, location.search]);
  const choose = (accepted: boolean) => {
    try { saveConsent(accepted, region); setOpen(false); setError(""); }
    catch { setError("Your choice could not be saved. Advertising tracking remains off; please enable website storage and try again."); window.fbq?.("consent", "revoke"); }
  };
  if (!open || Capacitor.isNativePlatform()) return null;
  return (
    <section role="dialog" aria-modal="false" aria-labelledby="advertising-privacy-title" className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background text-foreground p-4 sm:p-6 safe-area-bottom">
      <div className="mx-auto max-w-4xl space-y-3">
        <h2 id="advertising-privacy-title" className="text-lg font-semibold">Advertising privacy</h2>
        <p className="text-sm leading-relaxed">{NOTICE.text} <Link to="/privacy" className="underline">Privacy Policy</Link></p>
        {hasAdvertisingOptOut() && <p className="text-sm">Your browser’s privacy preference blocks advertising tracking.</p>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => choose(false)}>Reject advertising</Button>
          <Button variant="outline" onClick={() => choose(true)} disabled={hasAdvertisingOptOut()}>Accept advertising</Button>
          {readConsent() && <Button variant="ghost" onClick={() => setOpen(false)}>Close</Button>}
        </div>
      </div>
    </section>
  );
}