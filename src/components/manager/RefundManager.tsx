import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StorageImage } from "@/components/StorageImage";
import { toast } from "sonner";
import { HandCoins, Upload } from "lucide-react";
import { REFUND_STATUS_LABELS } from "@/utils/orderFinancials";
import { triggerNotification } from "@/utils/notify";

interface RefundManagerProps {
  orderId: string;
  balance: number;
  refundStatus: string;
  refundMethod: string | null;
  refundReference: string | null;
  refundNotes: string | null;
  refundProofUrl: string | null;
  refundAccount?: { bank: string | null; title: string | null; number: string | null };
  onUpdate: () => void;
}

export const RefundManager = ({
  orderId,
  balance,
  refundStatus,
  refundMethod,
  refundReference,
  refundNotes,
  refundProofUrl,
  refundAccount,
  onUpdate,
}: RefundManagerProps) => {
  const [method, setMethod] = useState(refundMethod || "");
  const [reference, setReference] = useState(refundReference || "");
  const [notes, setNotes] = useState(refundNotes || "");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async (status: "pending" | "initiated" | "completed" | "failed") => {
    try {
      setSaving(true);

      let proofUrl: string | null = null;
      let proofName: string | null = null;
      if (proofFile) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not signed in");
        const ext = proofFile.name.split(".").pop();
        const path = `receipts/${user.id}/${orderId}/refund-${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("pickup-proofs").upload(path, proofFile);
        if (uploadError) throw uploadError;
        proofUrl = path;
        proofName = proofFile.name;
      }

      const { error } = await supabase.rpc("update_refund_status", {
        p_order_id: orderId,
        p_status: status,
        p_method: method || null,
        p_reference: reference.trim() || null,
        p_notes: notes.trim() || null,
        p_proof_url: proofUrl,
        p_proof_name: proofName,
      });
      if (error) throw error;
      if (status === "completed") {
        void triggerNotification({ event_type: "refund_completed", order_id: orderId });
      }
      toast.success(`Refund marked as ${REFUND_STATUS_LABELS[status]}`);
      setProofFile(null);
      onUpdate();
    } catch (error: any) {
      console.error("Refund update error:", error);
      toast.error(error?.message || "Failed to update refund");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <HandCoins className="h-5 w-5 text-primary" />
          Refund Management
          <Badge variant={refundStatus === "completed" ? "default" : refundStatus === "failed" ? "destructive" : "outline"} className="ml-2">
            {REFUND_STATUS_LABELS[refundStatus] || refundStatus}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Refund Due to Customer</span>
          <span className="font-semibold">Rs. {balance.toLocaleString()}</span>
        </div>

        <div className="rounded-md border p-3 text-sm space-y-1">
          <p className="font-medium">Customer Refund Account</p>
          {refundAccount?.number ? (
            <>
              <p><span className="text-muted-foreground">Bank / Wallet:</span> {refundAccount.bank}</p>
              <p><span className="text-muted-foreground">Account Title:</span> {refundAccount.title}</p>
              <p className="break-all"><span className="text-muted-foreground">Account / IBAN:</span> {refundAccount.number}</p>
            </>
          ) : (
            <p className="text-muted-foreground">The customer has not shared refund account details yet.</p>
          )}
        </div>

        {refundProofUrl && (
          <div>
            <p className="text-sm font-medium mb-2">Refund Proof</p>
            <StorageImage bucket="pickup-proofs" src={refundProofUrl} alt="Refund proof" className="max-h-40 rounded-md border" />
          </div>
        )}

        {refundStatus !== "completed" && (
          <div className="space-y-3 border-t pt-4">
            <div className="space-y-1">
              <Label>Refund Method</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="mobile_wallet">Mobile Wallet</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="refund-reference">Transaction Reference</Label>
              <Input
                id="refund-reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. bank transaction ID"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="refund-notes">Notes</Label>
              <Textarea id="refund-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="refund-proof">Refund Payment Screenshot (shown to the customer)</Label>
              <Input
                id="refund-proof"
                type="file"
                accept="image/*"
                onChange={(e) => setProofFile(e.target.files?.[0] || null)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {refundStatus === "pending" && (
                <Button variant="outline" onClick={() => save("initiated")} disabled={saving}>
                  Mark Initiated
                </Button>
              )}
              <Button onClick={() => save("completed")} disabled={saving}>
                Mark Completed
              </Button>
              {refundStatus !== "failed" && (
                <Button variant="destructive" onClick={() => save("failed")} disabled={saving}>
                  Mark Failed
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Completing a refund requires a transaction reference or proof image.
            </p>
          </div>
        )}

        {refundStatus === "completed" && (
          <div className="text-sm space-y-1 border-t pt-4">
            {refundMethod && <p><span className="text-muted-foreground">Method:</span> {refundMethod.replace(/_/g, " ")}</p>}
            {refundReference && <p><span className="text-muted-foreground">Reference:</span> {refundReference}</p>}
            {refundNotes && <p><span className="text-muted-foreground">Notes:</span> {refundNotes}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
