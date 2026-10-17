import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { StorageImage } from "@/components/StorageImage";
import { toast } from "sonner";
import { Banknote, ShieldCheck, ShieldX, ExternalLink } from "lucide-react";
import { openAttachment } from "@/utils/attachmentStorage";
import { getOutstandingAmount, PAYMENT_VERIFICATION_LABELS } from "@/utils/orderFinancials";

interface PaymentVerificationProps {
  orderId: string;
  orderTotal: number;
  paidAmount: number;
  verification: string;
  rejectionReason: string | null;
  paymentProofUrl: string | null;
  paymentProofName: string | null;
  paymentSubmittedAt: string | null;
  onUpdate: () => void;
}

export const PaymentVerification = ({
  orderId,
  orderTotal,
  paidAmount,
  verification,
  rejectionReason,
  paymentProofUrl,
  paymentProofName,
  paymentSubmittedAt,
  onUpdate,
}: PaymentVerificationProps) => {
  const [amount, setAmount] = useState<string>(paidAmount > 0 ? String(paidAmount) : "");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const parsedAmount = parseInt(amount.replace(/[^0-9]/g, ""), 10);
  const outstanding = Number.isFinite(parsedAmount) ? getOutstandingAmount(orderTotal, parsedAmount) : orderTotal;

  const submit = async (approved: boolean) => {
    if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
      toast.error("Enter the amount actually received from the customer");
      return;
    }
    if (!approved && !reason.trim()) {
      toast.error("A rejection reason is required");
      return;
    }
    try {
      setSaving(true);
      const { error } = await supabase.rpc("verify_order_payment", {
        p_order_id: orderId,
        p_paid_amount: parsedAmount,
        p_approved: approved,
        p_reason: approved ? null : reason.trim(),
      });
      if (error) throw error;
      toast.success(approved ? "Payment verified" : "Payment rejected");
      onUpdate();
    } catch (error: any) {
      console.error("Payment verification error:", error);
      toast.error(error?.message || "Failed to save payment verification");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Banknote className="h-5 w-5 text-primary" />
          Payment Verification
          <Badge variant={verification === "verified" ? "default" : verification === "rejected" ? "destructive" : "outline"} className="ml-2">
            {PAYMENT_VERIFICATION_LABELS[verification] || verification}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Order Total</span>
            <span className="font-medium">Rs. {orderTotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Verified Amount Received</span>
            <span className="font-medium">Rs. {paidAmount.toLocaleString()}</span>
          </div>
          {outstanding > 0 && verification !== "rejected" && (
            <div className="flex justify-between text-destructive">
              <span>Outstanding</span>
              <span className="font-medium">Rs. {outstanding.toLocaleString()}</span>
            </div>
          )}
        </div>

        {paymentProofUrl && (
          <div>
            <p className="text-sm font-medium mb-2">Payment Proof</p>
            <StorageImage
              bucket="payment-proofs"
              src={paymentProofUrl}
              alt={paymentProofName || "Payment proof"}
              className="max-h-96 w-auto rounded-md border"
            />
            <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => void openAttachment(paymentProofUrl, "payment-proofs")}>
              <ExternalLink className="h-4 w-4 mr-1" />
              View Full Size
            </Button>
            {paymentSubmittedAt && (
              <p className="text-xs text-muted-foreground mt-1">
                Submitted {new Date(paymentSubmittedAt).toLocaleString()}
              </p>
            )}
          </div>
        )}

        {verification === "rejected" && rejectionReason && (
          <p className="text-sm text-destructive">Rejection reason: {rejectionReason}</p>
        )}

        <div className="space-y-3 border-t pt-4">
          <div className="space-y-1">
            <Label htmlFor="paid-amount">Amount Actually Received (PKR)</Label>
            <Input
              id="paid-amount"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 16000"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="rejection-reason">Rejection Reason (only when rejecting)</Label>
            <Textarea
              id="rejection-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why the payment is rejected"
              rows={2}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={() => submit(true)} disabled={saving} className="flex-1">
              <ShieldCheck className="h-4 w-4 mr-1" />
              Verify Payment
            </Button>
            <Button variant="destructive" onClick={() => submit(false)} disabled={saving} className="flex-1">
              <ShieldX className="h-4 w-4 mr-1" />
              Reject
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
