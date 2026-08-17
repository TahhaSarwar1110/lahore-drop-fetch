import { useCallback, useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";

type Platform = "web" | "android" | "ios";

const isNative = () => Capacitor.isNativePlatform();

const nativePlatform = (): Platform =>
  Capacitor.getPlatform() === "ios" ? "ios" : "android";

const webPushSupported = () =>
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;

const urlBase64ToUint8Array = (base64: string) => {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(normalized);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
};

const LOCAL_PROMPT_KEY = "tabedaar_push_prompt_dismissed";

export const usePushNotifications = () => {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unknown">("unknown");
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [promptDismissed, setPromptDismissed] = useState(
    () => typeof localStorage !== "undefined" && localStorage.getItem(LOCAL_PROMPT_KEY) === "1",
  );

  useEffect(() => {
    const init = async () => {
      const isSupported = isNative() || webPushSupported();
      setSupported(isSupported);
      if (!isSupported) return;

      if (!isNative() && "Notification" in window) {
        setPermission(Notification.permission);
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("push_subscriptions")
        .select("id")
        .eq("user_id", user.id)
        .is("revoked_at", null)
        .limit(1);
      setSubscribed((data ?? []).length > 0);
    };
    init();
  }, []);

  const saveSubscription = useCallback(
    async (platform: Platform, endpoint: string, keys?: { p256dh: string; auth: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Subscriptions are always stored against the authenticated user; the same
      // user may have many devices/browsers.
      await supabase.from("push_subscriptions").upsert(
        {
          user_id: user.id,
          platform,
          endpoint,
          p256dh: keys?.p256dh ?? null,
          auth: keys?.auth ?? null,
          device_label: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 180) : null,
          last_seen_at: new Date().toISOString(),
          revoked_at: null,
        },
        { onConflict: "endpoint" },
      );

      await supabase
        .from("notification_preferences")
        .upsert({ user_id: user.id, push_enabled: true }, { onConflict: "user_id" });

      setSubscribed(true);
    },
    [],
  );

  /** Registers this device/browser. Only call after the user opts in. */
  const enable = useCallback(async () => {
    setBusy(true);
    try {
      if (isNative()) {
        const { PushNotifications } = await import("@capacitor/push-notifications");
        let status = await PushNotifications.checkPermissions();
        if (status.receive !== "granted") {
          status = await PushNotifications.requestPermissions();
        }
        if (status.receive !== "granted") {
          setPermission("denied");
          return { ok: false, reason: "permission_denied" as const };
        }
        setPermission("granted");

        const token = await new Promise<string | null>((resolve) => {
          const timeout = setTimeout(() => resolve(null), 15000);
          PushNotifications.addListener("registration", (t) => {
            clearTimeout(timeout);
            resolve(t.value);
          });
          PushNotifications.addListener("registrationError", () => {
            clearTimeout(timeout);
            resolve(null);
          });
          PushNotifications.register();
        });

        if (!token) return { ok: false, reason: "registration_failed" as const };
        await saveSubscription(nativePlatform(), token);
        return { ok: true as const };
      }

      if (!webPushSupported()) return { ok: false, reason: "unsupported" as const };

      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== "granted") return { ok: false, reason: "permission_denied" as const };

      const { data: config } = await supabase.functions.invoke("push-config");
      const vapidPublicKey = (config as { vapidPublicKey?: string })?.vapidPublicKey;
      if (!vapidPublicKey) return { ok: false, reason: "not_configured" as const };

      const registration = await navigator.serviceWorker.register("/push-sw.js");
      await navigator.serviceWorker.ready;

      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        }));

      const json = subscription.toJSON() as {
        endpoint?: string;
        keys?: { p256dh: string; auth: string };
      };
      if (!json.endpoint || !json.keys) return { ok: false, reason: "subscribe_failed" as const };

      await saveSubscription("web", json.endpoint, json.keys);
      return { ok: true as const };
    } catch (error) {
      console.error("Enable push failed:", error);
      return { ok: false, reason: "error" as const };
    } finally {
      setBusy(false);
    }
  }, [saveSubscription]);

  /** Removes this device's subscription and turns the push channel off. */
  const disable = useCallback(async () => {
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (!isNative() && webPushSupported()) {
        const registration = await navigator.serviceWorker.getRegistration("/push-sw.js");
        const subscription = await registration?.pushManager.getSubscription();
        if (subscription) {
          await supabase
            .from("push_subscriptions")
            .update({ revoked_at: new Date().toISOString() })
            .eq("endpoint", subscription.endpoint);
          await subscription.unsubscribe();
        }
      }

      await supabase
        .from("push_subscriptions")
        .update({ revoked_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .is("revoked_at", null);

      await supabase
        .from("notification_preferences")
        .upsert({ user_id: user.id, push_enabled: false }, { onConflict: "user_id" });

      setSubscribed(false);
    } catch (error) {
      console.error("Disable push failed:", error);
    } finally {
      setBusy(false);
    }
  }, []);

  const dismissPrompt = useCallback(() => {
    localStorage.setItem(LOCAL_PROMPT_KEY, "1");
    setPromptDismissed(true);
  }, []);

  return {
    supported,
    permission,
    subscribed,
    busy,
    promptDismissed,
    dismissPrompt,
    enable,
    disable,
    isNative: isNative(),
  };
};

/** Clears this device's subscription on sign-out. */
export const cleanupPushOnLogout = async () => {
  try {
    if (Capacitor.isNativePlatform() || !webPushSupported()) return;
    const registration = await navigator.serviceWorker.getRegistration("/push-sw.js");
    const subscription = await registration?.pushManager.getSubscription();
    if (subscription) {
      await supabase
        .from("push_subscriptions")
        .update({ revoked_at: new Date().toISOString() })
        .eq("endpoint", subscription.endpoint);
      await subscription.unsubscribe();
    }
  } catch (error) {
    console.error("Push cleanup on logout failed:", error);
  }
};
