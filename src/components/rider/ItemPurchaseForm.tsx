import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageSourcePicker } from "@/components/ImageSourcePicker";
import { toast } from "sonner";
import { Check } from "lucide-react";

interface ItemPurchaseFormProps {
  orderId: string;
  itemId: string;
  initialAmount?: number | null;
  /** Called after save; `allPicked` is true when this completed the order's bill. */
  onSaved: (allPicked: boolean) => void;
}

/** Rider records one item: actual amount paid + item photo + receipt photo. */
export const ItemPurchaseForm = ({ orderId, itemId, initialAmount, onSaved }: ItemPurchaseFormProps) => {
  const [amount, setAmount] = useState(initialAmount != null ? String(initialAmount) : "");
  const [itemPhoto, setItemPhoto] = useState<File | null>(null);
  const [receiptPhoto, setReceiptPhoto] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const upload = async (userId: string, file: File, kind: string) => {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${userId}/${orderId}/${kind}-${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("pickup-proofs").upload(path, file);
    if (error) throw error;
    return path;
  };

  const save = async () => {
    const value = parseInt(amount.replace(/[^0-9]/g, ""), 10);
    if (!Number.isFinite(value) || value < 0) return toast.error("Enter the amount you actually paid for this item");
    if (!itemPhoto) return toast.error("Add a photo of the picked item");
    if (!receiptPhoto) return toast.error("Add a photo of the receipt");
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const pickupPath = await upload(user.id, itemPhoto, "pickup");
      const receiptPath = await upload(user.id, receiptPhoto, "receipt");
      const { data, error } = await supabase.rpc("submit_item_purchase", {
        p_item_id: itemId,
        p_amount: value,
        p_pickup_path: pickupPath,
        p_pickup_name: itemPhoto.name,
        p_receipt_path: receiptPath,
        p_receipt_name: receiptPhoto.name,
      });
      if (error) throw error;
      toast.success("Item marked as picked");
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
      <div className="space-y-1">
        <p className="text-sm font-medium flex items-center gap-1">
          Picked item photo {itemPhoto && <Check className="h-4 w-4 text-primary" />}
        </p>
        {itemPhoto && <p className="text-xs text-muted-foreground break-all">{itemPhoto.name}</p>}
        <ImageSourcePicker onFiles={(f) => f[0] && setItemPhoto(f[0])} disabled={saving} cameraLabel="Take Photo" galleryLabel="Gallery" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium flex items-center gap-1">
          Receipt photo {receiptPhoto && <Check className="h-4 w-4 text-primary" />}
        </p>
        {receiptPhoto && <p className="text-xs text-muted-foreground break-all">{receiptPhoto.name}</p>}
        <ImageSourcePicker onFiles={(f) => f[0] && setReceiptPhoto(f[0])} disabled={saving} cameraLabel="Take Photo" galleryLabel="Gallery" />
      </div>
      <Button onClick={save} disabled={saving} className="w-full">
        Mark Item Picked
      </Button>
    </div>
  );
};
