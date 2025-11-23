import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface AttachmentUploadProps {
  orderId: string;
  onUploadComplete: () => void;
}

export const AttachmentUpload = ({ orderId, onUploadComplete }: AttachmentUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a file");
      return;
    }

    try {
      setUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Not authenticated");
        return;
      }

      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${orderId}_${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from('order-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('order-images')
        .getPublicUrl(filePath);

      // Save attachment record to database
      const { error: dbError } = await supabase
        .from('order_attachments')
        .insert({
          order_id: orderId,
          uploaded_by: user.id,
          file_url: publicUrl,
          file_name: file.name,
        });

      if (dbError) throw dbError;

      toast.success("Attachment uploaded successfully");
      setFile(null);
      onUploadComplete();
    } catch (error) {
      console.error("Error uploading attachment:", error);
      toast.error("Failed to upload attachment");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <Label htmlFor="attachment">Upload Proof</Label>
      <div className="flex gap-2">
        <Input
          id="attachment"
          type="file"
          onChange={handleFileChange}
          accept="image/*,.pdf"
          disabled={uploading}
        />
        <Button
          onClick={handleUpload}
          disabled={uploading || !file}
          size="sm"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
};