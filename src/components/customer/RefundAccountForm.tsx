import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StorageImage } from "@/components/StorageImage";
import { toast } from "sonner";
import { HandCoins } from "lucide-react";
import { REFUND_STATUS_LABELS } from "@/utils/orderFinancials";

interface RefundAccountFormProps {
  orderId: string;
  refundDue: number;
  refundStatus: string;
  bank: string | null;
  title: string | null;
  number: string | null;
  refundProofUrl: string | null;
  onUpdate: () => void;
}

export const RefundAccountForm = ({ orderId, refundDue, refundStatus, bank, title, number, refundProofUrl, onUpdate }: RefundAccountFormProps) => {
  const [b, setB] = useState(bank || "");
  const [t, setT] = useState(title || "");
  const [n, setN] = useState(number || "");
  const [saving, setSaving] = useState(false);
  const completed = refundStatus === "completed";

  const save = async () => {
    if (!b.trim() || !t.trim() || !n.trim()) return toast.error("Please fill in all refund account details");
    try {
      setSaving(true);
      const { error } = await supabase.rpc("save_refund_account", { p_order_id: orderId, p_bank: b, p_title: t, p_number: n });
      if (error) throw error;
      toast.success("Refund account saved");
      onUpdate();
    } catch (error: any) {
      toast.error(error?.message || "Failed to save refund account");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <HandCoins className="h-5 w-5 text-primary" />
          Your Refund — Rs. {refundDue.toLocaleString()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-muted-foreground">
          {completed
            ? "Your balance has been refunded. The payment screenshot is below."
            : `Your shopping cost was less than you paid. We will refund the balance to the account below. Status: ${REFUND_STATUS_LABELS[refundStatus] || refundStatus}.`}
        </p>
        {!completed && (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="refund-bank">Bank or Wallet (e.g. Meezan Bank, JazzCash)</Label>
              <Input id="refund-bank" value={b} onChange={(e) => setB(e.target.value)} maxLength={100} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="refund-title">Account Title</Label>
              <Input id="refund-title" value={t} onChange={(e) => setT(e.target.value)} maxLength={100} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="refund-number">Account Number / IBAN / Mobile Number</Label>
              <Input id="refund-number" value={n} onChange={(e) => setN(e.target.value)} maxLength={40} />
            </div>
            <Button onClick={save} disabled={saving}>{number ? "Update Refund Account" : "Save Refund Account"}</Button>
          </div>
        )}
        {completed && number && (
          <p className="break-all"><span className="text-muted-foreground">Sent to:</span> {bank} · {title} · {number}</p>
        )}
        {refundProofUrl && (
          <div>
            <p className="font-medium mb-1">Refund Payment Screenshot</p>
            <StorageImage bucket="pickup-proofs" src={refundProofUrl} alt="Refund payment screenshot" className="max-h-64 rounded-md border object-cover" />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
