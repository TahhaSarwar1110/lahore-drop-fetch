import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, Loader2, Camera, Image } from "lucide-react";
import { toast } from "sonner";
import { Capacitor } from "@capacitor/core";
import { Camera as CapCamera, CameraResultType, CameraSource } from "@capacitor/camera";

interface AttachmentUploadProps {
  orderId: string;
  onUploadComplete: () => void;
}

export const AttachmentUpload = ({ orderId, onUploadComplete }: AttachmentUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isNative = Capacitor.isNativePlatform();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

  const handleCameraCapture = async () => {
    try {
      const image = await CapCamera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
      });

      if (image.dataUrl) {
        // Convert base64 to File
        const response = await fetch(image.dataUrl);
        const blob = await response.blob();
        const capturedFile = new File([blob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
        setFile(capturedFile);
        setPreviewUrl(image.dataUrl);
      }
    } catch (error) {
      console.error("Camera error:", error);
      toast.error("Failed to capture photo");
    }
  };

  const handleGallerySelect = async () => {
    if (isNative) {
      try {
        const image = await CapCamera.getPhoto({
          quality: 80,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Photos,
        });

        if (image.dataUrl) {
          // Convert base64 to File
          const response = await fetch(image.dataUrl);
          const blob = await response.blob();
          const selectedFile = new File([blob], `gallery_${Date.now()}.jpg`, { type: 'image/jpeg' });
          setFile(selectedFile);
          setPreviewUrl(image.dataUrl);
        }
      } catch (error) {
        console.error("Gallery error:", error);
        toast.error("Failed to select photo");
      }
    } else {
      // Web fallback - trigger file input
      fileInputRef.current?.click();
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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-3">
      <Label>Upload Proof</Label>
      
      {/* Hidden file input for web */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileChange}
        accept="image/*,.pdf"
        disabled={uploading}
        className="hidden"
      />

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

      {/* Action buttons */}
      <div className="flex flex-col gap-2">
        {isNative ? (
          // Native mobile - show camera and gallery buttons
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleCameraCapture}
              disabled={uploading}
              className="flex-1"
            >
              <Camera className="h-4 w-4 mr-2" />
              Camera
            </Button>
            <Button
              variant="outline"
              onClick={handleGallerySelect}
              disabled={uploading}
              className="flex-1"
            >
              <Image className="h-4 w-4 mr-2" />
              Gallery
            </Button>
          </div>
        ) : (
          // Web - show file picker button
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full"
          >
            <Image className="h-4 w-4 mr-2" />
            Select File
          </Button>
        )}

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
    </div>
  );
};
