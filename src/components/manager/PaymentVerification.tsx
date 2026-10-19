import { useCallback, useEffect, useState } from "react";
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
import { getOutstandingAmount, getGoodsOrderTotal, getSettlementTotal, PAYMENT_VERIFICATION_LABELS } from "@/utils/orderFinancials";
import { triggerNotification } from "@/utils/notify";

interface PaymentVerificationProps {
  orderId: string;
  orderTotal: number;
  paidAmount: number;
  verification: string;
  rejectionReason: string | null;
  paymentProofUrl: string | null;
  paymentProofName: string | null;
  paymentSubmittedAt: string | null;
  shoppingExpense?: number | null;
  expenseStatus?: string | null;
  bundleCharges?: number;
  deliveryCharges?: number;
  chargesDescription?: string | null;
  onUpdate: () => void;
}

export function PaymentVerification(props: PaymentVerificationProps) {
  const {
    orderId,
    orderTotal,
    paidAmount,
    verification,
    rejectionReason,
    paymentProofUrl,
    paymentProofName,
    paymentSubmittedAt,
    shoppingExpense,
    expenseStatus,
    bundleCharges = 0,
    deliveryCharges = 0,
    chargesDescription,
    onUpdate,
  } = props;
  const [amount, setAmount] = useState<string>("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [proofs, setProofs] = useState<{ id: string; file_url: string; file_name: string; created_at: string; submitted_amount_pkr?: number | null }[]>([]);

  const loadProofs = useCallback(async () => {
    const { data } = await supabase
      .from("order_payment_proofs")
      .select("id, file_url, file_name, created_at, submitted_amount_pkr")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true });
    setProofs(data ?? []);
  }, [orderId, paymentSubmittedAt]);

  useEffect(() => {
    void loadProofs();
  }, [loadProofs]);

  const expenseVerified = expenseStatus === "verified" && typeof shoppingExpense === "number";
  const goodsTotal = getGoodsOrderTotal(orderTotal, bundleCharges);
  const settlementTarget = getSettlementTotal(expenseVerified ? shoppingExpense : goodsTotal, bundleCharges, deliveryCharges);
  const remainingToSettle = Math.max(0, settlementTarget - paidAmount);
  const settled = expenseVerified && paidAmount >= settlementTarget;

  // Merge the legacy proof stored on the order with the proof history,
  // so orders placed before proof history existed still show every payment.
  const allProofs = (() => {
    const list = proofs.map((p) => ({ ...p }));
    if (paymentProofUrl && !list.some((p) => p.file_url === paymentProofUrl)) {
      list.unshift({
        id: "legacy",
        file_url: paymentProofUrl,
        file_name: paymentProofName || "Payment proof",
        created_at: paymentSubmittedAt || new Date(0).toISOString(),
      });
    }
    return list;
  })();

  const parsedAmount = parseInt(amount.replace(/[^0-9]/g, ""), 10);
  const outstanding = getOutstandingAmount(settlementTarget, paidAmount);

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
      if (approved) {
        // Server reads the authoritative verified paid total; versioned by
        // amount so each distinct approved payment notifies exactly once.
        void triggerNotification({
          event_type: "payment_confirmed",
          order_id: orderId,
          event_version: `paid_${parsedAmount}`,
        });
      }
      toast.success(approved ? "Payment verified — settlement updated" : "Payment rejected");
      setAmount("");
      void loadProofs();
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
            <span className="font-medium">Rs. {goodsTotal.toLocaleString()}</span>
          </div>
          {expenseVerified && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Verified Shopping Expense</span>
              <span className="font-medium">Rs. {(shoppingExpense as number).toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Delivery & Service Charges (Bundle)</span>
            <span className="font-medium shrink-0">Rs. {bundleCharges.toLocaleString()}</span>
          </div>
          {chargesDescription && <p className="text-xs text-muted-foreground">{chargesDescription}</p>}
          {deliveryCharges > 0 && <div className="flex justify-between gap-3"><span className="text-muted-foreground">Additional Delivery Charges</span><span className="font-medium shrink-0">Rs. {deliveryCharges.toLocaleString()}</span></div>}
          <div className="flex justify-between gap-3"><span className="text-muted-foreground">{expenseVerified ? "Total Settlement Bill" : "Total Payable"}</span><span className="font-medium shrink-0">Rs. {settlementTarget.toLocaleString()}</span></div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Verified Amount Received</span>
            <span className="font-medium">Rs. {paidAmount.toLocaleString()}</span>
          </div>
          {expenseVerified ? (
            remainingToSettle > 0 ? (
              <div className="flex justify-between text-destructive">
                <span>Remaining settlement amount</span>
                <span className="font-medium">Rs. {remainingToSettle.toLocaleString()}</span>
              </div>
            ) : (
              <p className="text-xs text-green-700 dark:text-green-300">
                Payment covers shopping and delivery/service charges. Any excess must be refunded before delivery.
              </p>
            )
          ) : (
            (
              <div className="flex justify-between text-destructive">
                <span>Outstanding</span>
                <span className="font-medium">Rs. {outstanding.toLocaleString()}</span>
              </div>
            )
          )}
        </div>

        {allProofs.length > 0 ? (
          <div>
            <p className="text-sm font-medium mb-2">Payment Proofs ({allProofs.length})</p>
            <div className="grid grid-cols-2 gap-3">
              {allProofs.map((proof, index) => (
                <div key={proof.id} className="space-y-1">
                  <StorageImage
                    bucket="payment-proofs"
                    src={proof.file_url}
                    alt={proof.file_name || `Payment proof ${index + 1}`}
                    className="h-32 w-full object-cover rounded-md border"
                  />
                  <p className="text-xs text-muted-foreground">
                    {proof.submitted_amount_pkr ? `Customer submitted: Rs. ${proof.submitted_amount_pkr.toLocaleString()} · ` : ""}
                    {index === 0 ? "First payment" : `Top-up ${index}`} · {new Date(proof.created_at).toLocaleString()}
                  </p>
                  <Button type="button" variant="outline" size="sm" onClick={() => void openAttachment(proof.file_url, "payment-proofs")}>
                    <ExternalLink className="h-4 w-4 mr-1" />
                    View Full Size
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {verification === "rejected" && rejectionReason && (
          <p className="text-sm text-destructive">Rejection reason: {rejectionReason}</p>
        )}

        {verification === "pending" ? (
          <div className="space-y-3 border-t pt-4">
            <div className="space-y-1">
              <Label htmlFor="paid-amount">New Payment Received (PKR)</Label>
              <Input
                id="paid-amount"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 2500"
              />
              <p className="text-xs text-muted-foreground">
                Enter only the amount of this payment. It is added to the Rs. {paidAmount.toLocaleString()} already verified.
              </p>
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
              <Button onClick={() => submit(true)} disabled={saving} loading={saving} className="flex-1">
                <ShieldCheck className="h-4 w-4 mr-1" />
                Verify Payment
              </Button>
              <Button variant="destructive" onClick={() => submit(false)} disabled={saving} loading={saving} className="flex-1">
                <ShieldX className="h-4 w-4 mr-1" />
                Reject
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};
