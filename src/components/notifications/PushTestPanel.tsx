import { useState } from "react";
import { Capacitor } from "@capacitor/core";
import { CheckCircle2, XCircle, CircleDashed } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { usePushNotifications } from "@/hooks/usePushNotifications";

type Step = { label: string; ok: boolean | null; detail?: string };

/** Sends a test push to the signed-in user's own phones and shows each step's result. */
export const PushTestPanel = () => {
  const { enable } = usePushNotifications();
  const [steps, setSteps] = useState<Step[]>([]);
  const [running, setRunning] = useState(false);
  const [received, setReceived] = useState<boolean | null>(null);

  if (!Capacitor.isNativePlatform()) return null;

  const run = async () => {
    setRunning(true);
    setReceived(null);
    const out: Step[] = [];
    const push = (s: Step) => { out.push(s); setSteps([...out]); };
    try {
      const result = await enable();
      const reason = result && !result.ok ? result.reason : null;
      push({ label: "Notification permission granted", ok: reason !== "permission_denied" });
      if (reason === "permission_denied") return;
      push({ label: "Device token obtained from Firebase", ok: reason !== "registration_failed" && reason !== "error",
        detail: reason === "registration_failed" ? "No token. The app build may be missing Firebase setup." : undefined });
      if (reason === "registration_failed" || reason === "error") return;
      push({ label: "Token saved to your account", ok: reason !== "store_failed" });
      if (reason === "store_failed") return;

      const { data, error } = await supabase.functions.invoke("test-push", { body: {} });
      const res = data as { configured?: boolean; devices?: { platform: string; token_suffix: string; accepted: boolean; reason: string | null }[] };
      if (error || !res?.configured) {
        push({ label: "Firebase accepted the push", ok: false, detail: "Push sending is not set up on the server." });
        return;
      }
      for (const d of res.devices ?? []) {
        push({ label: `Firebase ${d.accepted ? "accepted" : "rejected"} push (${d.platform} …${d.token_suffix})`,
          ok: d.accepted, detail: d.reason ?? undefined });
      }
      if (!res.devices?.length) push({ label: "Firebase accepted the push", ok: false, detail: "No registered phones found." });
    } finally {
      setRunning(false);
    }
  };

  const Icon = ({ ok }: { ok: boolean | null }) =>
    ok === null ? <CircleDashed className="h-4 w-4 text-muted-foreground" />
    : ok ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <XCircle className="h-4 w-4 text-destructive" />;

  return (
    <Card className="space-y-3 p-4">
      <div>
        <Label className="text-base">Test push notification</Label>
        <p className="text-sm text-muted-foreground">
          Sends a test alert only to your own phone(s). Try it with the app open, in the background, and closed.
        </p>
      </div>
      <Button size="sm" onClick={run} disabled={running}>{running ? "Testing..." : "Send test notification"}</Button>
      {steps.length > 0 && (
        <ul className="space-y-1 text-sm">
          {steps.map((s, i) => (
            <li key={i} className="flex items-start gap-2">
              <Icon ok={s.ok} />
              <span>{s.label}{s.detail && <span className="block text-xs text-muted-foreground">{s.detail}</span>}</span>
            </li>
          ))}
        </ul>
      )}
      {!running && steps.some((s) => s.label.startsWith("Firebase accepted")) && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span>Did the notification arrive?</span>
          <Button size="sm" variant={received === true ? "default" : "outline"} onClick={() => setReceived(true)}>Yes</Button>
          <Button size="sm" variant={received === false ? "default" : "outline"} onClick={() => setReceived(false)}>No</Button>
          {received === false && (
            <p className="w-full text-xs text-muted-foreground">
              Check the phone's notification settings for Tabedaar.com and battery saver, then try again with the app closed.
            </p>
          )}
        </div>
      )}
    </Card>
  );
};
