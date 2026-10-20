import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ImageSourcePicker } from "@/components/ImageSourcePicker";
import { toast } from "sonner";
import { X } from "lucide-react";

interface ItemPurchaseFormProps {
  orderId: string;
  itemId: string;
  initialAmount?: number | null;
  /** Called after save; `allPicked` is true when this completed the order's bill. */
  onSaved: (allPicked: boolean) => void;
}

const MAX_PHOTOS = 10;

/** Rider records one item: amount paid + one or more proof photos, or marks it not available. */
export const ItemPurchaseForm = ({ orderId, itemId, initialAmount, onSaved }: ItemPurchaseFormProps) => {
  const [amount, setAmount] = useState(initialAmount != null ? String(initialAmount) : "");
  const [photos, setPhotos] = useState<File[]>([]);
  const [notAvailable, setNotAvailable] = useState(false);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const addPhotos = (files: File[]) =>
    setPhotos((prev) => [...prev, ...files].slice(0, MAX_PHOTOS));

  const save = async () => {
    let value = 0;
    if (notAvailable) {
      if (!reason.trim()) return toast.error("Enter why the item was not available");
    } else {
      value = parseInt(amount.replace(/[^0-9]/g, ""), 10);
      if (!Number.isFinite(value) || value < 0) return toast.error("Enter the amount you actually paid for this item");
      if (photos.length === 0) return toast.error("Add at least one proof photo (item or receipt)");
    }
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const proofs: { path: string; name: string }[] = [];
      for (const file of photos) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${user.id}/${orderId}/proof-${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("pickup-proofs").upload(path, file);
        if (error) throw error;
        proofs.push({ path, name: file.name });
      }
      const { data, error } = await supabase.rpc("submit_item_pickup", {
        p_item_id: itemId,
        p_amount: value,
        p_proofs: proofs,
        p_not_available: notAvailable,
        p_reason: notAvailable ? reason.trim() : null,
      });
      if (error) throw error;
      toast.success(notAvailable ? "Item marked as not available" : "Item marked as picked");
      onSaved(Boolean(data));
    } catch (error: any) {
      console.error("Item purchase error:", error);
      toast.error(error?.message || "Failed to save item purchase");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 pt-2 border-t">
      <label className="flex items-center gap-2 text-sm font-medium">
        <Checkbox checked={notAvailable} onCheckedChange={(c) => setNotAvailable(c === true)} disabled={saving} />
        Item not available
      </label>

      {notAvailable ? (
        <div className="space-y-1">
          <Label htmlFor={`reason-${itemId}`}>Reason</Label>
          <Textarea
            id={`reason-${itemId}`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Out of stock at the shop"
            maxLength={300}
            disabled={saving}
          />
          <p className="text-xs text-muted-foreground">Paid amount will be recorded as Rs. 0. Photos are optional.</p>
        </div>
      ) : (
        <div className="space-y-1">
          <Label htmlFor={`paid-${itemId}`}>Actual Amount Paid (PKR)</Label>
          <Input
            id={`paid-${itemId}`}
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="e.g. 4500"
            disabled={saving}
          />
        </div>
      )}

      <div className="space-y-2">
        <p className="text-sm font-medium">
          Proof photos (item, receipt…) {photos.length > 0 && `· ${photos.length}`}
        </p>
        {photos.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {photos.map((f, i) => (
              <div key={i} className="relative">
                <img src={URL.createObjectURL(f)} alt={f.name} className="h-20 w-full object-cover rounded-md border" />
                <button
                  type="button"
                  aria-label="Remove photo"
                  className="absolute top-1 right-1 rounded-full bg-background/90 p-0.5 border"
                  onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))}
                  disabled={saving}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        {photos.length < MAX_PHOTOS && (
          <ImageSourcePicker multiple onFiles={addPhotos} disabled={saving} cameraLabel="Take Photo" galleryLabel="Gallery" />
        )}
      </div>
      <Button onClick={save} disabled={saving} className="w-full">
        {notAvailable ? "Mark Not Available" : "Mark Item Picked"}
      </Button>
    </div>
  );
};
