import { StorageImage } from "@/components/StorageImage";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Upload, CheckCircle, Clock, Truck } from "lucide-react";
import { toast } from "sonner";
import { ImageSourcePicker } from "@/components/ImageSourcePicker";
import { triggerNotification } from "@/utils/notify";
import { BankAccountDetails } from "./BankAccountDetails";

interface Props {
  orderId: string;
  totalWeightKg: number | null;
  deliveryCharges: number;
  deliveryPaymentStatus: string;
  deliveryPaymentProofUrl?: string | null;
  deliveryPaymentSubmittedAt?: string | null;
  deliveryPaymentConfirmedAt?: string | null;
  onUpdate: () => void;
}

export const DeliveryPaymentUpload = ({
  orderId,
  totalWeightKg,
  deliveryCharges,
  deliveryPaymentStatus,
  deliveryPaymentProofUrl,
  deliveryPaymentSubmittedAt,
  deliveryPaymentConfirmedAt,
  onUpdate,
}: Props) => {
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFiles = (files: File[]) => {
    const file = files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Please select a payment screenshot");
      return;
    }
    try {
      setUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const ext = selectedFile.name.split(".").pop();
      const path = `${user.id}/${orderId}/delivery-payment-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("payment-proofs").upload(path, selectedFile);
      if (upErr) throw upErr;


      const { error: updErr } = await supabase
        .from("orders")
        .update({
          delivery_payment_proof_url: path,
          delivery_payment_proof_name: selectedFile.name,
          delivery_payment_status: "submitted",
          delivery_payment_submitted_at: new Date().toISOString(),
        })
        .eq("id", orderId);
      if (updErr) throw updErr;

      await triggerNotification({
        event_type: "delivery_payment_submitted",
        order_id: orderId,
      });


      toast.success("Delivery payment proof uploaded");
      setSelectedFile(null);
      setPreviewUrl(null);
      onUpdate();
    } catch (error) {
      console.error("Error uploading delivery payment proof:", error);
      toast.error("Failed to upload payment proof");
    } finally {
      setUploading(false);
    }
  };

  const badge = () => {
    switch (deliveryPaymentStatus) {
      case "pending":
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Payment Pending</Badge>;
      case "submitted":
        return <Badge className="bg-yellow-500"><Upload className="h-3 w-3 mr-1" />Awaiting Verification</Badge>;
      case "confirmed":
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Confirmed</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Truck className="h-5 w-5 text-primary" />
          Delivery Charges
          <div className="ml-auto">{badge()}</div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-muted rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Total Weight</p>
            <p className="text-lg font-semibold">{totalWeightKg ?? "—"} kg</p>
          </div>
          <div className="bg-primary/5 rounded-lg p-3 border border-primary/20">
            <p className="text-xs text-muted-foreground">Amount to Pay</p>
            <p className="text-lg font-bold text-primary">PKR {Number(deliveryCharges).toLocaleString()}</p>
          </div>
        </div>

        <BankAccountDetails />

        {deliveryPaymentStatus === "pending" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Please transfer the delivery amount above and upload the payment screenshot.
            </p>
            <div className="space-y-2">
              <Label>Payment Screenshot</Label>
              <ImageSourcePicker onFiles={handleFiles} cameraLabel="Take Photo" galleryLabel="Choose from Gallery" />
            </div>
            {previewUrl && (
              <img src={previewUrl} alt="Preview" className="max-h-48 rounded-lg border" />
            )}
            <Button onClick={handleUpload} disabled={uploading || !selectedFile} className="w-full">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
              Submit Delivery Payment Proof
            </Button>
          </div>
        )}

        {deliveryPaymentStatus === "submitted" && (
          <div className="space-y-3">
            <div className="bg-yellow-50 dark:bg-yellow-950 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                Your delivery payment proof has been submitted and is awaiting verification.
              </p>
            </div>
            {deliveryPaymentProofUrl && (
              <StorageImage bucket="payment-proofs"
                src={deliveryPaymentProofUrl}
                alt="Proof"
                className="max-h-48 rounded-lg border cursor-pointer"
              />
            )}
            {deliveryPaymentSubmittedAt && (
              <p className="text-xs text-muted-foreground">
                Submitted: {new Date(deliveryPaymentSubmittedAt).toLocaleString()}
              </p>
            )}
          </div>
        )}

        {deliveryPaymentStatus === "confirmed" && (
          <div className="space-y-3">
            <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-sm text-green-800 dark:text-green-200">
                Delivery payment confirmed. Your order will be delivered shortly.
              </p>
            </div>
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
