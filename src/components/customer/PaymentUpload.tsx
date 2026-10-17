import { StorageImage } from "@/components/StorageImage";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Upload, CheckCircle, Clock, CreditCard, Image } from "lucide-react";
import { toast } from "sonner";
import { ImageSourcePicker } from "@/components/ImageSourcePicker";
import { triggerNotification } from "@/utils/notify";
import { BankAccountDetails } from "./BankAccountDetails";

interface PaymentUploadProps {
  orderId: string;
  paymentStatus: string;
  paymentProofUrl?: string | null;
  paymentSubmittedAt?: string | null;
  paymentConfirmedAt?: string | null;
  amountDue?: number;
  onUpdate: () => void;
}

export const PaymentUpload = ({
  orderId,
  paymentStatus,
  paymentProofUrl,
  paymentSubmittedAt,
  paymentConfirmedAt,
  amountDue,
  onUpdate,
}: PaymentUploadProps) => {
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

  const handleUploadPaymentProof = async () => {
    if (!selectedFile) {
      toast.error("Please select a payment screenshot");
      return;
    }

    try {
      setUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const fileExt = selectedFile.name.split(".").pop();
      const filePath = `${user.id}/${orderId}/payment-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("payment-proofs")
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      // Keep a history row so the manager can see every payment screenshot
      // (first payment and any later top-ups) side by side.
      const { error: proofError } = await supabase
        .from("order_payment_proofs")
        .insert({
          order_id: orderId,
          uploaded_by: user.id,
          file_url: filePath,
          file_name: selectedFile.name,
        });
      if (proofError) throw proofError;

      const { error: updateError } = await supabase
        .from("orders")
        .update({
          payment_proof_url: filePath,
          payment_proof_name: selectedFile.name,
          payment_status: "submitted",
          payment_submitted_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      if (updateError) throw updateError;

      // Server resolves manager/admin recipients, de-duplicates and fans out to push
      await triggerNotification({ event_type: "payment_submitted", order_id: orderId });


      toast.success("Payment proof uploaded successfully!");
      setSelectedFile(null);
      setPreviewUrl(null);
      onUpdate();
    } catch (error) {
      console.error("Error uploading payment proof:", error);
      toast.error("Failed to upload payment proof");
    } finally {
      setUploading(false);
    }
  };

  const getStatusBadge = () => {
    switch (paymentStatus) {
      case "pending":
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Payment Pending</Badge>;
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
          Payment Information
          <div className="ml-auto">{getStatusBadge()}</div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <BankAccountDetails />

        {paymentStatus === "pending" && (
          <div className="space-y-3">
            {amountDue && amountDue > 0 ? (
              <div className="bg-destructive/10 border border-destructive/30 p-3 rounded-lg">
                <p className="text-sm font-semibold text-destructive">
                  Remaining amount due: Rs. {amountDue.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  The actual shopping cost was higher than your payment. Please transfer only the remaining amount and upload the screenshot. Delivery starts after it is verified.
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Please transfer the total amount to the above bank account and upload the payment screenshot below.
              </p>
            )}
            
            <div className="space-y-2">
              <Label>Payment Screenshot</Label>
              <ImageSourcePicker onFiles={handleFiles} cameraLabel="Take Photo" galleryLabel="Choose from Gallery" />
            </div>

            {previewUrl && (
              <div className="relative">
                <img
                  src={previewUrl}
                  alt="Payment preview"
                  className="max-h-48 rounded-lg border"
                />
              </div>
            )}

            <Button
              onClick={handleUploadPaymentProof}
              disabled={uploading || !selectedFile}
              className="w-full"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Submit Payment Proof
            </Button>
          </div>
        )}

        {paymentStatus === "submitted" && (
          <div className="space-y-3">
            <div className="bg-yellow-50 dark:bg-yellow-950 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                Your payment proof has been submitted and is awaiting confirmation from our team.
              </p>
            </div>
            
            {paymentProofUrl && (
              <div>
                <p className="text-sm font-medium mb-2">Uploaded Proof:</p>
                <StorageImage bucket="payment-proofs"
                  src={paymentProofUrl}
                  alt="Payment proof"
                  className="max-h-48 rounded-lg border cursor-pointer"
                />
              </div>
            )}

            {paymentSubmittedAt && (
              <p className="text-xs text-muted-foreground">
                Submitted: {new Date(paymentSubmittedAt).toLocaleString()}
              </p>
            )}
          </div>
        )}

        {paymentStatus === "confirmed" && (
          <div className="space-y-3">
            <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-sm text-green-800 dark:text-green-200">
                Your payment has been confirmed. Your order is now being processed for delivery.
              </p>
            </div>
            
            {paymentProofUrl && (
              <div>
                <p className="text-sm font-medium mb-2">Payment Proof:</p>
                <StorageImage bucket="payment-proofs"
                  src={paymentProofUrl}
                  alt="Payment proof"
                  className="max-h-32 rounded-lg border cursor-pointer opacity-75"
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
