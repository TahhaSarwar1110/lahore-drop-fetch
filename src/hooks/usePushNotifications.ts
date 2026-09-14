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
const LOCAL_ENDPOINT_KEY = "tabedaar_push_endpoint";
const LOCAL_PLATFORM_KEY = "tabedaar_push_platform";

/** Stores/refreshes this device's push subscription for the signed-in user. */
const upsertSubscription = async (
  platform: Platform,
  endpoint: string,
  keys?: { p256dh: string; auth: string },
  /** Only a deliberate opt-in may switch the push preference back on. */
  markPreferenceEnabled = true,
) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error: registrationError } = await supabase.functions.invoke("register-push", {
    body: {
      action: "register",
      platform,
      endpoint,
      p256dh: keys?.p256dh ?? null,
      auth: keys?.auth ?? null,
      device_label: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 180) : null,
    },
  });
  if (registrationError) {
    console.error("Push device registration failed:", registrationError);
    return false;
  }

  localStorage.setItem(LOCAL_ENDPOINT_KEY, endpoint);
  localStorage.setItem(LOCAL_PLATFORM_KEY, platform);

  if (markPreferenceEnabled) {
    await supabase
      .from("notification_preferences")
      .upsert({ user_id: user.id, push_enabled: true }, { onConflict: "user_id" });
  }

  return true;
};

/** Native: asks FCM/APNs for the current token and stores it. Permission must already be granted. */
const refreshNativeToken = async () => {
  const { PushNotifications } = await import("@capacitor/push-notifications");
  const token = await new Promise<string | null>((resolve) => {
    const timeout = setTimeout(() => resolve(null), 15000);
    void PushNotifications.addListener("registration", (t) => {
      clearTimeout(timeout);
      resolve(t.value);
    });
    void PushNotifications.addListener("registrationError", (error) => {
      clearTimeout(timeout);
      console.error("Native push registration failed:", error);
      resolve(null);
    });
    void PushNotifications.register();
  });
  if (!token) return false;
  return upsertSubscription(nativePlatform(), token, undefined, false);
};

/** Web: reuses/creates the browser push subscription and stores it. Permission must already be granted. */
const refreshWebSubscription = async () => {
  const { data: config } = await supabase.functions.invoke("push-config");
  const vapidPublicKey = (config as { vapidPublicKey?: string })?.vapidPublicKey;
  if (!vapidPublicKey) return false;

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
  if (!json.endpoint || !json.keys) return false;
  return upsertSubscription("web", json.endpoint, json.keys, false);
};

export const usePushNotifications = () => {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unknown">("unknown");
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [promptDismissed, setPromptDismissed] = useState(
    () => typeof localStorage !== "undefined" && localStorage.getItem(LOCAL_PROMPT_KEY) === "1",
  );

  useEffect(() => {
    let active = true;
    const init = async () => {
      const isSupported = isNative() || webPushSupported();
      if (active) setSupported(isSupported);
      if (!isSupported) return;

      if (!isNative() && "Notification" in window) {
        if (active) setPermission(Notification.permission);
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("push_subscriptions")
        .select("id")
        .eq("user_id", user.id)
        .is("revoked_at", null)
        .limit(1);
      const hasRow = (data ?? []).length > 0;

      const { data: pref } = await supabase
        .from("notification_preferences")
        .select("push_enabled")
        .eq("user_id", user.id)
        .maybeSingle();
      const pushOptedOut = pref ? pref.push_enabled === false : false;

      if (active) setSubscribed(hasRow && !pushOptedOut);

      // Respect an explicit opt-out: never silently re-register.
      if (pushOptedOut) return;

      // Device tokens rotate (reinstall, app data cleared, token refresh), so a
      // stored row can be stale. Silently re-register whenever permission is
      // already granted, keeping the current token on file for this user.
      try {
        if (isNative()) {
          const { PushNotifications } = await import("@capacitor/push-notifications");
          const status = await PushNotifications.checkPermissions();
          if (status.receive === "granted") {
            if (active) setPermission("granted");
            if (await refreshNativeToken() && active) setSubscribed(true);
          }
        } else if (Notification.permission === "granted") {
          if (await refreshWebSubscription() && active) setSubscribed(true);
        }
      } catch (error) {
        console.error("Push re-registration failed:", error);
      }
    };
    void init();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        // Run outside the auth callback to avoid blocking session persistence.
        setTimeout(() => void init(), 0);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveSubscription = useCallback(
    async (platform: Platform, endpoint: string, keys?: { p256dh: string; auth: string }) => {
      const ok = await upsertSubscription(platform, endpoint, keys);
      if (ok) setSubscribed(true);
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
          void PushNotifications.addListener("registration", (t) => {
            clearTimeout(timeout);
            resolve(t.value);
          });
          void PushNotifications.addListener("registrationError", (error) => {
            clearTimeout(timeout);
            console.error("Native push registration failed:", error);
            resolve(null);
          });
          void PushNotifications.register();
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
    let endpoint = localStorage.getItem(LOCAL_ENDPOINT_KEY);
    let platform = localStorage.getItem(LOCAL_PLATFORM_KEY) as Platform | null;

    if (!Capacitor.isNativePlatform() && webPushSupported()) {
      const registration = await navigator.serviceWorker.getRegistration("/push-sw.js");
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        endpoint = subscription.endpoint;
        platform = "web";
        await subscription.unsubscribe();
      }
    }

    if (endpoint && platform) {
      await supabase.functions.invoke("register-push", {
        body: { action: "unregister", platform, endpoint },
      });
    }
    localStorage.removeItem(LOCAL_ENDPOINT_KEY);
    localStorage.removeItem(LOCAL_PLATFORM_KEY);
  } catch (error) {
    console.error("Push cleanup on logout failed:", error);
  }
};
