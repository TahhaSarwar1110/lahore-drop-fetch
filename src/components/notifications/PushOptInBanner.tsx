import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { useAuth } from "@/hooks/useAuth";
import { usePushNotifications } from "@/hooks/usePushNotifications";

/**
 * In-app explanation shown BEFORE the browser/device permission prompt.
 * The real permission request only happens on "Enable notifications".
 */
export const PushOptInBanner = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const { supported, permission, subscribed, busy, promptDismissed, dismissPrompt, enable } =
    usePushNotifications();
  const navigate = useNavigate();
  const [hidden, setHidden] = useState(false);

  // Native push taps deep-link into the app.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let remove: (() => void) | undefined;
    (async () => {
      const { PushNotifications } = await import("@capacitor/push-notifications");
      const handle = await PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
        const url = (action.notification.data as { url?: string })?.url;
        if (url) navigate(url);
      });
      remove = () => handle.remove();
    })();
    return () => remove?.();
  }, [navigate]);

  if (
    isLoading ||
    !isAuthenticated ||
    !supported ||
    subscribed ||
    hidden ||
    promptDismissed ||
    permission === "denied"
  ) {
    return null;
  }

  const handleEnable = async () => {
    const result = await enable();
    if (result?.ok) {
      toast.success("Notifications enabled");
      setHidden(true);
    } else if (result?.reason === "permission_denied") {
      toast.error("Notifications blocked. You can enable them in your browser or device settings.");
      dismissPrompt();
    } else if (result?.reason === "not_configured") {
      toast.error("Push notifications are not configured yet.");
      dismissPrompt();
    } else {
      toast.error("Could not enable notifications. Please try again.");
    }
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-3">
      <Card className="pointer-events-auto w-full max-w-md border-primary/20 p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-primary/10 p-2">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Stay updated on your orders</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Enable notifications to receive order confirmations, payment updates and delivery alerts.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" onClick={handleEnable} disabled={busy}>
                {busy ? "Enabling..." : "Enable notifications"}
              </Button>
              <Button size="sm" variant="ghost" onClick={dismissPrompt}>
                Not now
              </Button>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 flex-shrink-0"
            aria-label="Dismiss"
            onClick={dismissPrompt}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
};
