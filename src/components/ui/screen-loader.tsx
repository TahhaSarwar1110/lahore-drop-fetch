import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Loader2 } from "lucide-react";
import { screenLoading } from "@/lib/screenLoading";

export function ScreenLoader() {
  const busy = useSyncExternalStore(screenLoading.subscribe, screenLoading.getSnapshot, () => false);
  if (!busy) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex touch-none items-center justify-center bg-background/80 backdrop-blur-sm" role="status" aria-live="polite" aria-label="Processing" aria-busy="true">
      <div className="flex flex-col items-center gap-3 text-foreground">
        <Loader2 className="h-12 w-12 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
        <span className="text-sm font-medium">Processing…</span>
      </div>
    </div>,
    document.body,
  );
}