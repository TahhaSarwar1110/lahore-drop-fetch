import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Upload, CheckCircle, Clock, CreditCard, Image } from "lucide-react";
import { toast } from "sonner";
import { createNotification } from "@/utils/notificationHelper";

interface PaymentUploadProps {
  orderId: string;
  paymentStatus: string;
  paymentProofUrl?: string | null;
  paymentSubmittedAt?: string | null;
  paymentConfirmedAt?: string | null;
  onUpdate: () => void;
}

export const PaymentUpload = ({
  orderId,
  paymentStatus,
  paymentProofUrl,
  paymentSubmittedAt,
  paymentConfirmedAt,
  onUpdate,
}: PaymentUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
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

      const { data: { publicUrl } } = supabase.storage
        .from("payment-proofs")
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("orders")
        .update({
          payment_proof_url: publicUrl,
          payment_proof_name: selectedFile.name,
          payment_status: "submitted",
          payment_submitted_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      if (updateError) throw updateError;

      // Notify managers about payment submission
      const { data: managers } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", ["manager", "admin"]);

      if (managers) {
        for (const manager of managers) {
          await createNotification({
            userId: manager.user_id,
            title: "Payment Submitted",
            message: `Customer has submitted payment proof for order #${orderId.slice(0, 8)}. Please verify and confirm.`,
            type: "payment_submitted",
            orderId,
          });
        }
      }

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
        {/* Bank Details */}
        <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
          <h4 className="font-semibold mb-2">Desi Drop Bank Details</h4>
          <div className="space-y-1 text-sm">
            <p><span className="font-medium">Bank:</span> HBL Bank</p>
            <p><span className="font-medium">Account Title:</span> Desi Drop Services</p>
            <p><span className="font-medium">Account Number:</span> 1234567890123</p>
            <p><span className="font-medium">IBAN:</span> PK12HABB1234567890123</p>
          </div>
        </div>

        {paymentStatus === "pending" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Please transfer the total amount to the above bank account and upload the payment screenshot below.
            </p>
            
            <div className="space-y-2">
              <Label htmlFor="payment-proof">Payment Screenshot</Label>
              <Input
                id="payment-proof"
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="cursor-pointer"
              />
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
                <img
                  src={paymentProofUrl}
                  alt="Payment proof"
                  className="max-h-48 rounded-lg border cursor-pointer"
                  onClick={() => window.open(paymentProofUrl, "_blank")}
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
