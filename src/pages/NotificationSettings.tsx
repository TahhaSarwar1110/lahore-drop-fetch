import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePushNotifications } from "@/hooks/usePushNotifications";

interface Prefs {
  in_app_enabled: boolean;
  push_enabled: boolean;
  whatsapp_enabled: boolean;
}

const NotificationSettings = () => {
  const navigate = useNavigate();
  const { supported, permission, subscribed, busy, enable, disable } = usePushNotifications();
  const [prefs, setPrefs] = useState<Prefs>({
    in_app_enabled: true,
    push_enabled: true,
    whatsapp_enabled: true,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }
      const { data } = await supabase
        .from("notification_preferences")
        .select("in_app_enabled, push_enabled, whatsapp_enabled")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) setPrefs(data as Prefs);
      setLoading(false);
    };
    load();
  }, [navigate]);

  const savePref = async (key: keyof Prefs, value: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setPrefs((prev) => ({ ...prev, [key]: value }));
    const { error } = await supabase
      .from("notification_preferences")
      .upsert({ user_id: user.id, [key]: value }, { onConflict: "user_id" });
    if (error) {
      toast.error("Could not save your preference");
      setPrefs((prev) => ({ ...prev, [key]: !value }));
      return;
    }
    toast.success("Preferences updated");
  };

  const handlePushToggle = async (value: boolean) => {
    if (value) {
      const result = await enable();
      if (result?.ok) {
        setPrefs((prev) => ({ ...prev, push_enabled: true }));
        toast.success("Push notifications enabled");
      } else if (result?.reason === "permission_denied") {
        toast.error("Notifications are blocked in your browser/device settings.");
      } else {
        toast.error("Could not enable push notifications");
      }
      return;
    }
    await disable();
    setPrefs((prev) => ({ ...prev, push_enabled: false }));
    toast.success("Push notifications disabled");
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="container mx-auto flex-1 px-3 py-6 md:px-4 md:py-10">
        <div className="mx-auto max-w-2xl space-y-4">
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">Notification settings</h1>
            <p className="text-sm text-muted-foreground">
              Choose how Tabedaar.com keeps you updated about your orders.
            </p>
          </div>

          {loading ? (
            <Card className="p-6 text-sm text-muted-foreground">Loading preferences...</Card>
          ) : (
            <>
              <Card className="flex items-center justify-between gap-4 p-4">
                <div>
                  <Label className="text-base">In-app notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Show updates in the notification centre inside the app.
                  </p>
                </div>
                <Switch
                  checked={prefs.in_app_enabled}
                  onCheckedChange={(v) => savePref("in_app_enabled", v)}
                />
              </Card>

              <Card className="flex items-center justify-between gap-4 p-4">
                <div>
                  <Label className="text-base">Push notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    {supported
                      ? subscribed
                        ? "This device is registered for push notifications."
                        : "Register this browser or device to receive push alerts."
                      : "Push notifications are not supported on this device."}
                  </p>
                  {permission === "denied" && (
                    <p className="mt-1 text-xs text-destructive">
                      Notifications are blocked. Allow them in your browser/device settings, then try again.
                    </p>
                  )}
                </div>
                <Switch
                  checked={prefs.push_enabled && subscribed}
                  disabled={!supported || busy}
                  onCheckedChange={handlePushToggle}
                />
              </Card>

              <Card className="flex items-center justify-between gap-4 p-4">
                <div>
                  <Label className="text-base">WhatsApp notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive order updates on the WhatsApp number in your profile.
                  </p>
                </div>
                <Switch
                  checked={prefs.whatsapp_enabled}
                  onCheckedChange={(v) => savePref("whatsapp_enabled", v)}
                />
              </Card>

              <Button variant="outline" onClick={() => navigate("/notifications")}>
                Back to notifications
              </Button>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default NotificationSettings;
