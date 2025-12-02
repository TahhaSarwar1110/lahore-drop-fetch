import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, Clock, CreditCard, ExternalLink, Upload } from "lucide-react";
import { toast } from "sonner";
import { createNotification } from "@/utils/notificationHelper";

interface PaymentConfirmationProps {
  orderId: string;
  userId: string;
  paymentStatus: string;
  paymentProofUrl?: string | null;
  paymentProofName?: string | null;
  paymentSubmittedAt?: string | null;
  paymentConfirmedAt?: string | null;
  assignedRiderId?: string | null;
  onUpdate: () => void;
}

export const PaymentConfirmation = ({
  orderId,
  userId,
  paymentStatus,
  paymentProofUrl,
  paymentProofName,
  paymentSubmittedAt,
  paymentConfirmedAt,
  assignedRiderId,
  onUpdate,
}: PaymentConfirmationProps) => {
  const [confirming, setConfirming] = useState(false);

  const handleConfirmPayment = async () => {
    try {
      setConfirming(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("orders")
        .update({
          payment_status: "confirmed",
          payment_confirmed_at: new Date().toISOString(),
          payment_confirmed_by: user.id,
        })
        .eq("id", orderId);

      if (error) throw error;

      // Notify customer
      await createNotification({
        userId,
        title: "Payment Confirmed",
        message: `Your payment for order #${orderId.slice(0, 8)} has been confirmed. Your order is now being processed.`,
        type: "payment_confirmed",
        orderId,
      });

      // Notify assigned rider if exists
      if (assignedRiderId) {
        await createNotification({
          userId: assignedRiderId,
          title: "Payment Received - Ready for Pickup",
          message: `Payment for order #${orderId.slice(0, 8)} has been confirmed. You can now start the pickup and delivery process.`,
          type: "payment_confirmed_rider",
          orderId,
        });
      }

      toast.success("Payment confirmed successfully!");
      onUpdate();
    } catch (error) {
      console.error("Error confirming payment:", error);
      toast.error("Failed to confirm payment");
    } finally {
      setConfirming(false);
    }
  };

  const getStatusBadge = () => {
    switch (paymentStatus) {
      case "pending":
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Awaiting Payment</Badge>;
      case "submitted":
        return <Badge className="bg-yellow-500"><Upload className="h-3 w-3 mr-1" />Payment Submitted</Badge>;
      case "confirmed":
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Payment Confirmed</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          Payment Status
          <div className="ml-auto">{getStatusBadge()}</div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {paymentStatus === "pending" && (
          <div className="bg-muted p-3 rounded-lg">
            <p className="text-sm text-muted-foreground">
              Waiting for customer to submit payment proof.
            </p>
          </div>
        )}

        {paymentStatus === "submitted" && (
          <div className="space-y-4">
            <div className="bg-yellow-50 dark:bg-yellow-950 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">
                Customer has submitted payment proof. Please verify and confirm.
              </p>
            </div>

            {paymentProofUrl && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Payment Proof:</p>
                <div className="relative group">
                  <img
                    src={paymentProofUrl}
                    alt="Payment proof"
                    className="max-h-64 rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => window.open(paymentProofUrl, "_blank")}
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => window.open(paymentProofUrl, "_blank")}
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    View Full
                  </Button>
                </div>
                {paymentProofName && (
                  <p className="text-xs text-muted-foreground">{paymentProofName}</p>
                )}
              </div>
            )}

            {paymentSubmittedAt && (
              <p className="text-sm text-muted-foreground">
                Submitted: {new Date(paymentSubmittedAt).toLocaleString()}
              </p>
            )}

            <Button
              onClick={handleConfirmPayment}
              disabled={confirming}
              className="w-full"
            >
              {confirming ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Confirm Payment Received
            </Button>
          </div>
        )}

        {paymentStatus === "confirmed" && (
          <div className="space-y-3">
            <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-sm text-green-800 dark:text-green-200">
                Payment has been confirmed. Rider has been notified.
              </p>
            </div>

            {paymentProofUrl && (
              <div>
                <p className="text-sm font-medium mb-2">Payment Proof:</p>
                <img
                  src={paymentProofUrl}
                  alt="Payment proof"
                  className="max-h-32 rounded-lg border cursor-pointer opacity-75"
                  onClick={() => window.open(paymentProofUrl, "_blank")}
                />
              </div>
            )}

            {paymentConfirmedAt && (
              <p className="text-xs text-muted-foreground">
                Confirmed: {new Date(paymentConfirmedAt).toLocaleString()}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
