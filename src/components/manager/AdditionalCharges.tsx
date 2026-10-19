import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign } from "lucide-react";
import { triggerNotification } from "@/utils/notify";

interface AdditionalChargesProps {
  orderId: string;
  currentCharges: number;
  currentDescription: string | null;
  onUpdate: () => void;
}

export const AdditionalCharges = ({
  orderId,
  currentCharges,
  currentDescription,
  onUpdate,
}: AdditionalChargesProps) => {
  const [charges, setCharges] = useState(currentCharges.toString());
  const [description, setDescription] = useState(currentDescription || "");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);

      const { error } = await supabase
        .from("orders")
        .update({
          additional_charges: parseFloat(charges) || 0,
          charges_description: description || null,
        })
        .eq("id", orderId);

      if (error) throw error;

      const { data: order } = await supabase.from("orders").select("expense_status, customer_balance_pkr").eq("id", orderId).single();
      const balance = order?.customer_balance_pkr ?? 0;
      if (order?.expense_status === "verified" && balance !== 0) {
        void triggerNotification({ event_type: balance < 0 ? "outstanding_payment_due" : "refund_due", order_id: orderId, event_version: `b${balance}` });
      }

      toast.success("Additional charges updated successfully");
      onUpdate();
    } catch (error) {
      console.error("Error updating charges:", error);
      toast.error("Failed to update additional charges");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Delivery & Service Charges (Bundle)
        </CardTitle>
        <CardDescription>
          {currentDescription || "Applied pricing bundle"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="charges">Amount (PKR)</Label>
            <Input
              id="charges"
              type="number"
              step="0.01"
              value={charges}
              onChange={(e) => setCharges(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the additional charges..."
            />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? "Updating..." : "Update Charges"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
