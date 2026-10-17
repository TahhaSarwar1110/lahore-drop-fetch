import { useEffect, useState } from "react";
import { attachmentUrl } from "@/utils/attachmentStorage";
import type { AttachmentBucket } from "@/utils/storagePaths";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, RefreshCw } from "lucide-react";

interface Props { src: string; bucket: AttachmentBucket; alt: string; className?: string }

export function StorageImage({ src, bucket, alt, className }: Props) {
  const [url, setUrl] = useState("");
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let active = true;
    const load = async () => {
      setFailed(false);
      setUrl("");
      try {
        const next = src.startsWith("blob:") || src.startsWith("data:image/") ? src : await attachmentUrl(src, bucket);
        if (active) setUrl(next);
      } catch { if (active) setFailed(true); }
    };
    void load();
    const interval = setInterval(() => void load(), 50 * 60 * 1000);
    return () => { active = false; clearInterval(interval); };
  }, [src, bucket, attempt]);
  if (failed) return <div className="flex items-center gap-2 text-sm text-muted-foreground py-3"><span>Image unavailable</span><Button type="button" variant="outline" size="sm" onClick={() => setAttempt(a => a + 1)}><RefreshCw className="mr-1 h-4 w-4" />Retry</Button></div>;
  if (!url) return <div className="flex items-center gap-2 py-3 text-muted-foreground" role="status"><Loader2 className="h-4 w-4 animate-spin" />Loading image…</div>;
  return <>
    <Button type="button" variant="ghost" className="h-auto max-w-full p-0" aria-label={`View ${alt}`} onClick={() => setOpen(true)}>
      <img src={url} alt={alt} className={className} onError={() => setFailed(true)} />
    </Button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-3xl"><DialogHeader><DialogTitle>{alt}</DialogTitle></DialogHeader><img src={url} alt={alt} className="w-full max-h-[70dvh] object-contain" onError={() => setFailed(true)} /></DialogContent></Dialog>
  </>;
}