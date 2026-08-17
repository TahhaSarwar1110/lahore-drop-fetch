import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, Clock, Truck, ExternalLink, Upload } from "lucide-react";
import { toast } from "sonner";
import { triggerNotification } from "@/utils/notify";

interface Props {
  orderId: string;
  userId: string;
  deliveryPaymentStatus: string;
  deliveryPaymentProofUrl?: string | null;
  deliveryPaymentProofName?: string | null;
  deliveryPaymentSubmittedAt?: string | null;
  deliveryPaymentConfirmedAt?: string | null;
  assignedRiderId?: string | null;
  onUpdate: () => void;
}

export const DeliveryPaymentConfirmation = ({
  orderId,
  userId,
  deliveryPaymentStatus,
  deliveryPaymentProofUrl,
  deliveryPaymentProofName,
  deliveryPaymentSubmittedAt,
  deliveryPaymentConfirmedAt,
  assignedRiderId,
  onUpdate,
}: Props) => {
  const [confirming, setConfirming] = useState(false);

  const handleConfirm = async () => {
    try {
      setConfirming(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("orders")
        .update({
          delivery_payment_status: "confirmed",
          delivery_payment_confirmed_at: new Date().toISOString(),
          delivery_payment_confirmed_by: user.id,
        })
        .eq("id", orderId);

      if (error) throw error;

      await triggerNotification({
        event_type: "delivery_payment_confirmed",
        order_id: orderId,
      });


      toast.success("Delivery payment confirmed");
      onUpdate();
    } catch (error) {
      console.error("Error confirming delivery payment:", error);
      toast.error("Failed to confirm delivery payment");
    } finally {
      setConfirming(false);
    }
  };

  const badge = () => {
    switch (deliveryPaymentStatus) {
      case "pending":
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Awaiting Customer Payment</Badge>;
      case "submitted":
        return <Badge className="bg-yellow-500"><Upload className="h-3 w-3 mr-1" />Proof Submitted</Badge>;
      case "confirmed":
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Confirmed</Badge>;
      default:
        return <Badge variant="secondary">—</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Truck className="h-5 w-5 text-primary" />
          Delivery Payment
          <div className="ml-auto">{badge()}</div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {deliveryPaymentStatus === "pending" && (
          <div className="bg-muted p-3 rounded-lg">
            <p className="text-sm text-muted-foreground">
              Waiting for customer to upload delivery payment proof.
            </p>
          </div>
        )}

        {deliveryPaymentStatus === "submitted" && (
          <div className="space-y-4">
            <div className="bg-yellow-50 dark:bg-yellow-950 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">
                Customer has submitted delivery payment proof. Please verify.
              </p>
            </div>

            {deliveryPaymentProofUrl && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Payment Proof:</p>
                <img
                  src={deliveryPaymentProofUrl}
                  alt="Delivery payment proof"
                  className="max-h-64 rounded-lg border cursor-pointer hover:opacity-90"
                  onClick={() => window.open(deliveryPaymentProofUrl, "_blank")}
                />
                {deliveryPaymentProofName && (
                  <p className="text-xs text-muted-foreground">{deliveryPaymentProofName}</p>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(deliveryPaymentProofUrl, "_blank")}
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  View Full
                </Button>
              </div>
            )}

            {deliveryPaymentSubmittedAt && (
              <p className="text-xs text-muted-foreground">
                Submitted: {new Date(deliveryPaymentSubmittedAt).toLocaleString()}
              </p>
            )}

            <Button onClick={handleConfirm} disabled={confirming} className="w-full">
              {confirming ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
              Confirm Delivery Payment Received
            </Button>
          </div>
        )}

        {deliveryPaymentStatus === "confirmed" && (
          <div className="space-y-3">
            <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-sm text-green-800 dark:text-green-200">
                Delivery payment confirmed. Rider has been notified and can mark the order as delivered.
              </p>
            </div>
            {deliveryPaymentProofUrl && (
              <img
                src={deliveryPaymentProofUrl}
                alt="Delivery payment proof"
                className="max-h-32 rounded-lg border cursor-pointer opacity-75"
                onClick={() => window.open(deliveryPaymentProofUrl, "_blank")}
              />
            )}
            {deliveryPaymentConfirmedAt && (
              <p className="text-xs text-muted-foreground">
                Confirmed: {new Date(deliveryPaymentConfirmedAt).toLocaleString()}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
