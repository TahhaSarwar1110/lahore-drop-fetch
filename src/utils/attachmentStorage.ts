import { supabase } from "@/integrations/supabase/client";
import { storagePath, type AttachmentBucket } from "./storagePaths";

export async function attachmentUrl(value: string, bucket: AttachmentBucket) {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(storagePath(value, bucket), 3600);
  if (error || !data?.signedUrl) throw new Error("Unable to open this attachment. Please retry.");
  return data.signedUrl;
}

export async function openAttachment(value: string, bucket: AttachmentBucket) {
  // Open synchronously while still in the user's gesture (including Safari).
  const tab = window.open("about:blank", "_blank");
  if (tab) tab.opener = null;
  try {
    const url = await attachmentUrl(value, bucket);
    if (tab) tab.location.href = url;
    else window.location.assign(url);
  } catch (error) {
    tab?.close();
    const { toast } = await import("sonner");
    toast.error(error instanceof Error ? error.message : "Unable to open attachment");
  }
}