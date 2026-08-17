import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Truck, CheckCircle, Pencil } from "lucide-react";
import { toast } from "sonner";
import { sendNotificationEmail } from "@/utils/notificationHelper";
import { triggerNotification } from "@/utils/notify";

interface DeliveryChargesInputProps {
  orderId: string;
  userId: string;
  deliveryType: string;
  totalWeightKg: number | null;
  deliveryCharges: number;
  deliveryChargesSetAt: string | null;
  deliveryPaymentStatus: string;
  onUpdate: () => void;
}

export const DeliveryChargesInput = ({
  orderId,
  userId,
  deliveryType,
  totalWeightKg,
  deliveryCharges,
  deliveryChargesSetAt,
  deliveryPaymentStatus,
  onUpdate,
}: DeliveryChargesInputProps) => {
  const alreadySet = !!deliveryChargesSetAt;
  const [editing, setEditing] = useState(!alreadySet);
  const [weight, setWeight] = useState<string>(totalWeightKg ? String(totalWeightKg) : "");
  const [charges, setCharges] = useState<string>(deliveryCharges ? String(deliveryCharges) : "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setWeight(totalWeightKg ? String(totalWeightKg) : "");
    setCharges(deliveryCharges ? String(deliveryCharges) : "");
    setEditing(!deliveryChargesSetAt);
  }, [totalWeightKg, deliveryCharges, deliveryChargesSetAt]);

  const canEdit =
    deliveryPaymentStatus === "not_required" ||
    deliveryPaymentStatus === "pending" ||
    deliveryPaymentStatus === "submitted";

  const handleSave = async () => {
    const w = parseFloat(weight);
    const c = parseFloat(charges);
    if (!Number.isFinite(w) || w <= 0) {
      toast.error("Enter a valid total weight (kg)");
      return;
    }
    if (!Number.isFinite(c) || c <= 0) {
      toast.error("Enter a valid delivery charge amount");
      return;
    }

    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("orders")
        .update({
          total_weight_kg: w,
          delivery_charges: c,
          delivery_charges_set_at: new Date().toISOString(),
          delivery_charges_set_by: user.id,
          delivery_payment_status: "pending",
        })
        .eq("id", orderId);

      if (error) throw error;

      await triggerNotification({
        event_type: "delivery_payment_requested",
        order_id: orderId,
        amount: c,
        note: `${w} kg`,
      });

      // Best-effort email (edge function resolves recipient server-side)
      try {
        await sendNotificationEmail({
          userId,
          title: "Delivery Charges Available",
          message: `Delivery charges for your order #${orderId.slice(0, 8)} are PKR ${c.toLocaleString()} for ${w} kg. Please log in and pay to proceed.`,
          orderLink: `${window.location.origin}/order-details?orderId=${orderId}`,
        });
      } catch (e) {
        console.warn("Skipping delivery-charges email:", e);
      }

      toast.success("Delivery charges shared with customer");
      setEditing(false);
      onUpdate();
    } catch (error) {
      console.error("Error saving delivery charges:", error);
      toast.error("Failed to save delivery charges");
    } finally {
      setSaving(false);
    }
  };

  const label = deliveryType === "out_of_country" ? "Out of Country" : "Out of City";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Truck className="h-5 w-5 text-primary" />
          Delivery Charges ({label})
          {alreadySet && (
            <Badge className="ml-auto bg-green-500">
              <CheckCircle className="h-3 w-3 mr-1" />
              Shared
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!editing && alreadySet ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Total Weight</p>
                <p className="text-lg font-semibold">{totalWeightKg} kg</p>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Delivery Charges</p>
                <p className="text-lg font-semibold">PKR {Number(deliveryCharges).toLocaleString()}</p>
              </div>
            </div>
            {deliveryChargesSetAt && (
              <p className="text-xs text-muted-foreground">
                Shared with customer: {new Date(deliveryChargesSetAt).toLocaleString()}
              </p>
            )}
            {canEdit && (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4 mr-1" />
                Edit
              </Button>
            )}
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Enter the total weight of the goods and the 3rd-party delivery charge. The customer will be notified to pay this amount.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="weight">Total Weight (kg)</Label>
                <Input
                  id="weight"
                  type="text"
                  inputMode="decimal"
                  placeholder="e.g. 5.5"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value.replace(/[^0-9.]/g, ""))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="charges">Delivery Charges (PKR)</Label>
                <Input
                  id="charges"
                  type="text"
                  inputMode="numeric"
                  placeholder="e.g. 1500"
                  value={charges}
                  onChange={(e) => setCharges(e.target.value.replace(/[^0-9.]/g, ""))}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {alreadySet ? "Update & Notify Customer" : "Share with Customer"}
              </Button>
              {alreadySet && (
                <Button variant="outline" onClick={() => setEditing(false)} disabled={saving}>
                  Cancel
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
