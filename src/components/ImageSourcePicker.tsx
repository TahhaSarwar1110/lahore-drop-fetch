import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Image as ImageIcon } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { Camera as CapCamera, CameraResultType, CameraSource } from "@capacitor/camera";
import { toast } from "sonner";

interface ImageSourcePickerProps {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
  /** Accepted types for the web file inputs (native always returns images). */
  accept?: string;
  /** Allow selecting several images at once from the web gallery picker. */
  multiple?: boolean;
  cameraLabel?: string;
  galleryLabel?: string;
  className?: string;
}

const dataUrlToFile = (dataUrl: string, name: string): File => {
  const [meta, base64] = dataUrl.split(",");
  const mime = /data:(.*?);/.exec(meta)?.[1] || "image/jpeg";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], name, { type: mime });
};

/**
 * Every attachment step must always offer two ways to add a photo:
 * one button to pick an existing image from the gallery and one to take
 * a new picture with the camera. Works on native (Capacitor Camera) and
 * on the web (hidden file inputs, the camera one using `capture`).
 */
export function ImageSourcePicker({
  onFiles,
  disabled = false,
  accept = "image/*",
  multiple = false,
  cameraLabel = "Take Photo",
  galleryLabel = "Choose from Gallery",
  className = "",
}: ImageSourcePickerProps) {
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const isNative = Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("Camera");

  const pickNative = async (source: CameraSource) => {
    try {
      const photo = await CapCamera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source,
      });
      if (photo.dataUrl) {
        const file = dataUrlToFile(photo.dataUrl, `photo_${Date.now()}.${photo.format || "jpeg"}`);
        onFiles([file]);
      }
    } catch (error) {
      if (!/cancel/i.test(String(error))) {
        toast.error("Could not open the camera/photos. Please allow access in Settings and try again.");
      }
    }
  };

  const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) onFiles(files);
    e.target.value = "";
  };

  const handleCameraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFiles([file]);
    e.target.value = "";
  };

  return (
    <div className={className}>
      <input
        ref={galleryInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={handleGalleryChange}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleCameraChange}
      />
      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          disabled={disabled}
          onClick={() => (isNative ? void pickNative(CameraSource.Camera) : cameraInputRef.current?.click())}
        >
          <Camera className="h-4 w-4 mr-2" />
          {cameraLabel}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          disabled={disabled}
          onClick={() => (isNative ? void pickNative(CameraSource.Photos) : galleryInputRef.current?.click())}
        >
          <ImageIcon className="h-4 w-4 mr-2" />
          {galleryLabel}
        </Button>
      </div>
    </div>
  );
}
