import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ImageSourcePicker } from "@/components/ImageSourcePicker";

interface AttachmentUploadProps {
  orderId: string;
  onUploadComplete: () => void;
}

export const AttachmentUpload = ({ orderId, onUploadComplete }: AttachmentUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFiles = (files: File[]) => {
    const selected = files[0];
    if (selected) {
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select or capture a photo");
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

      const { error: uploadError } = await supabase.storage
        .from('order-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Save attachment record to database
      const { error: dbError } = await supabase
        .from('order_attachments')
        .insert({
          order_id: orderId,
          uploaded_by: user.id,
          file_url: filePath,
          file_name: file.name,
        });

      if (dbError) throw dbError;

      toast.success("Attachment uploaded successfully");
      setFile(null);
      setPreviewUrl(null);
      onUploadComplete();
    } catch (error) {
      console.error("Error uploading attachment:", error);
      toast.error("Failed to upload attachment");
    } finally {
      setUploading(false);
    }
  };

  const clearSelection = () => {
    setFile(null);
    setPreviewUrl(null);
  };

  return (
    <div className="space-y-3">
      <Label>Upload Proof</Label>

      {/* Preview */}
      {previewUrl && (
        <div className="relative">
          <img
            src={previewUrl}
            alt="Preview"
            className="w-full max-h-48 object-contain rounded-lg border"
          />
          <Button
            variant="destructive"
            size="sm"
            className="absolute top-2 right-2"
            onClick={clearSelection}
          >
            Remove
          </Button>
        </div>
      )}

      {/* Always two options: take a new picture or pick one from the gallery */}
      <ImageSourcePicker
        onFiles={handleFiles}
        disabled={uploading}
        accept="image/*,.pdf"
        cameraLabel="Camera"
        galleryLabel="Gallery"
      />

      {/* Upload button */}
      {file && (
        <Button
          onClick={handleUpload}
          disabled={uploading}
          className="w-full"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Upload className="h-4 w-4 mr-2" />
          )}
          Upload
        </Button>
      )}
    </div>
  );
};
