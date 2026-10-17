import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { StorageImage } from "@/components/StorageImage";
import { toast } from "sonner";
import { Receipt, X } from "lucide-react";
import { EXPENSE_STATUS_LABELS } from "@/utils/orderFinancials";
import { ImageSourcePicker } from "@/components/ImageSourcePicker";

interface ReceiptRow {
  id: string;
  file_url: string;
  file_name: string;
}

interface ShoppingExpenseFormProps {
  orderId: string;
  expenseAmount: number | null;
  expenseStatus: string | null;
  expenseNotes: string | null;
  rejectionReason: string | null;
  onUpdate: () => void;
}


export const ShoppingExpenseForm = ({
  orderId,
  expenseAmount,
  expenseStatus,
  expenseNotes,
  rejectionReason,
  onUpdate,
}: ShoppingExpenseFormProps) => {
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [receipts, setReceipts] = useState<ReceiptRow[]>([]);
  const [saving, setSaving] = useState(false);

  const canEdit = !expenseStatus || expenseStatus === "rejected";

  const loadReceipts = async () => {
    const { data } = await supabase
      .from("order_expense_receipts")
      .select("id, file_url, file_name")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true });
    setReceipts(data || []);
  };

  useEffect(() => {
    loadReceipts();
  }, [orderId, expenseStatus]);

  useEffect(() => {
    if (expenseAmount !== null && expenseAmount !== undefined) setAmount(String(expenseAmount));
    if (expenseNotes) setNotes(expenseNotes);
  }, [expenseAmount, expenseNotes]);

  const pickNative = async (source: CameraSource) => {
    try {
      const photo = await CapCamera.getPhoto({
        quality: 80,
        resultType: CameraResultType.DataUrl,
        source,
      });
      if (photo.dataUrl) {
        setFiles((prev) => [...prev, dataUrlToFile(photo.dataUrl!, `receipt-${Date.now()}.${photo.format || "jpeg"}`)]);
      }
    } catch (error) {
      console.error("Camera error:", error);
      toast.error("Could not get the photo. Please try again.");
    }
  };

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    setFiles((prev) => [...prev, ...Array.from(list)]);
  };

  const submit = async () => {
    const parsed = parseInt(amount.replace(/[^0-9]/g, ""), 10);
    if (!Number.isFinite(parsed) || parsed < 0) {
      toast.error("Enter the actual amount you spent");
      return;
    }
    if (files.length === 0 && receipts.length === 0) {
      toast.error("Please attach at least one purchase receipt");
      return;
    }
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      // Upload receipts first so a failed upload doesn't leave a submitted expense without proof
      const uploaded: { path: string; name: string }[] = [];
      for (const file of files) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `receipts/${user.id}/${orderId}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("pickup-proofs").upload(path, file);
        if (uploadError) throw uploadError;
        uploaded.push({ path, name: file.name });
      }

      const { error: rpcError } = await supabase.rpc("submit_shopping_expense", {
        p_order_id: orderId,
        p_amount: parsed,
        p_notes: notes.trim() || null,
      });
      if (rpcError) throw rpcError;

      if (uploaded.length > 0) {
        const { error: receiptError } = await supabase.from("order_expense_receipts").insert(
          uploaded.map((u) => ({ order_id: orderId, rider_id: user.id, file_url: u.path, file_name: u.name }))
        );
        if (receiptError) throw receiptError;
      }

      toast.success("Shopping expense submitted for manager review");
      setFiles([]);
      onUpdate();
    } catch (error: any) {
      console.error("Expense submit error:", error);
      toast.error(error?.message || "Failed to submit expense");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Receipt className="h-5 w-5 text-primary" />
          Shopping Expense
          {expenseStatus && (
            <Badge
              variant={expenseStatus === "verified" ? "default" : expenseStatus === "rejected" ? "destructive" : "outline"}
              className="ml-2"
            >
              {EXPENSE_STATUS_LABELS[expenseStatus] || expenseStatus}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {expenseStatus === "rejected" && rejectionReason && (
          <p className="text-sm text-destructive">Manager feedback: {rejectionReason}</p>
        )}

        {receipts.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Uploaded Receipts ({receipts.length})</p>
            <div className="flex flex-wrap gap-3">
              {receipts.map((r) => (
                <StorageImage key={r.id} bucket="pickup-proofs" src={r.file_url} alt={r.file_name} className="h-24 w-24 object-cover rounded-md border" />
              ))}
            </div>
          </div>
        )}

        {canEdit ? (
          <>
            <div className="space-y-1">
              <Label htmlFor="expense-amount">Actual Amount Spent (PKR)</Label>
              <Input
                id="expense-amount"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 12000"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="expense-notes">Notes (price differences, substitutions, unavailable items)</Label>
              <Textarea id="expense-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Purchase Receipts</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => addFiles(e.target.files)}
              />
              <div className="flex flex-wrap gap-2">
                {Capacitor.isNativePlatform() ? (
                  <>
                    <Button type="button" variant="outline" size="sm" onClick={() => pickNative(CameraSource.Camera)}>
                      Take Photo
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => pickNative(CameraSource.Photos)}>
                      Choose from Gallery
                    </Button>
                  </>
                ) : (
                  <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="h-4 w-4 mr-1" />
                    Add Receipt Images
                  </Button>
                )}
              </div>
              {files.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {files.map((f, i) => (
                    <Badge key={i} variant="secondary" className="flex items-center gap-1">
                      {f.name}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <Button onClick={submit} disabled={saving} className="w-full">
              {saving ? "Submitting..." : expenseStatus === "rejected" ? "Resubmit Expense" : "Submit Expense for Review"}
            </Button>
          </>
        ) : (
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Actual Amount Spent</span>
              <span className="font-medium">Rs. {(expenseAmount ?? 0).toLocaleString()}</span>
            </div>
            {expenseNotes && (
              <div>
                <p className="text-muted-foreground">Notes</p>
                <p>{expenseNotes}</p>
              </div>
            )}
            {expenseStatus === "verified" && (
              <p className="text-xs text-muted-foreground">
                This expense is verified and locked. Contact a manager if a correction is needed.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
