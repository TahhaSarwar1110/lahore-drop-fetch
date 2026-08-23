import { useState, useEffect, useRef } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, Upload, MapPin, ChevronDown, ChevronUp, Camera, Image as ImageIcon, Eye, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { LocationPickerMap } from "@/components/map/LocationPickerMap";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Capacitor } from "@capacitor/core";
import { Camera as CapCamera, CameraResultType, CameraSource } from "@capacitor/camera";

export interface OrderItem {
  id: string;
  itemType: string;
  itemData: Record<string, string>;
  imageFile?: File;
  imageUrl?: string;
  pickupLat?: number;
  pickupLng?: number;
}

interface OrderItemFormProps {
  onAddItem: (item: OrderItem) => void;
  initialItem?: OrderItem | null;
  submitLabel?: string;
  onCancel?: () => void;
}

export const OrderItemForm = ({ onAddItem, initialItem, submitLabel, onCancel }: OrderItemFormProps) => {
  const [itemType, setItemType] = useState("");
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string>("");
  const [viewImageOpen, setViewImageOpen] = useState(false);
  const [pickupLocation, setPickupLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showPickupMap, setShowPickupMap] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const isNative = Capacitor.isNativePlatform();
  const previewSrc = localPreviewUrl || existingImageUrl || "";

  const resetFields = () => {
    setFormData({});
    setImageFile(null);
    setLocalPreviewUrl(null);
    setExistingImageUrl("");
    setPickupLocation(null);
    setShowPickupMap(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const handleItemTypeChange = (value: string) => {
    if (value === itemType) return;
    setItemType(value);
    resetFields();
  };

  useEffect(() => {
    if (initialItem) {
      setItemType(initialItem.itemType);
      setFormData(initialItem.itemData || {});
      setExistingImageUrl(initialItem.imageUrl || "");
      setImageFile(null);
      setLocalPreviewUrl(null);
      if (initialItem.pickupLat != null && initialItem.pickupLng != null) {
        setPickupLocation({ lat: initialItem.pickupLat, lng: initialItem.pickupLng });
      } else {
        setPickupLocation(null);
      }
    }
  }, [initialItem]);


  const itemTypeFields: Record<string, { label: string; type: string; placeholder: string; required?: boolean; min?: number }[]> = {
    Cloth: [
      { label: "Shop/Store Name", type: "text", placeholder: "Name of store", required: true },
      { label: "Item Description", type: "text", placeholder: "What you want to buy", required: true },
      { label: "Brand", type: "text", placeholder: "Brand name (optional)" },
      { label: "Quantity", type: "number", placeholder: "1 (optional)", min: 1 },
      { label: "Expected Price (PKR)", type: "number", placeholder: "Expected price", required: true, min: 0 },
      { label: "Approx. Weight (kg)", type: "number", placeholder: "e.g. 0.5 (optional)", min: 0 },
      { label: "Special Instructions", type: "textarea", placeholder: "Any specific requirements (optional)" },
    ],
    Food: [
      { label: "Restaurant/Shop Name", type: "text", placeholder: "Name of restaurant", required: true },
      { label: "Item Name", type: "text", placeholder: "What to order", required: true },
      { label: "Quantity", type: "number", placeholder: "1 (optional)", min: 1 },
      { label: "Price (PKR)", type: "number", placeholder: "Expected price", required: true, min: 0 },
      { label: "Special Instructions", type: "textarea", placeholder: "Extra spicy, no onions, etc. (optional)" },
    ],
    Commodities: [
      { label: "Shop Name", type: "text", placeholder: "Store name", required: true },
      { label: "Item Description", type: "text", placeholder: "What you need", required: true },
      { label: "Quantity", type: "number", placeholder: "1 (optional)", min: 1 },
      { label: "Price (PKR)", type: "number", placeholder: "Expected price", required: true, min: 0 },
      { label: "Approx. Weight (kg)", type: "number", placeholder: "e.g. 2 (optional)", min: 0 },
      { label: "Instructions", type: "textarea", placeholder: "Any specific requirements (optional)" },
    ],
    Gifts: [
      { label: "Shop Name", type: "text", placeholder: "Gift shop name", required: true },
      { label: "Gift Description", type: "text", placeholder: "Flowers, Cake, etc.", required: true },
      { label: "Quantity", type: "number", placeholder: "1 (optional)", min: 1 },
      { label: "Price (PKR)", type: "number", placeholder: "Expected price", required: true, min: 0 },
      { label: "Approx. Weight (kg)", type: "number", placeholder: "e.g. 1 (optional)", min: 0 },
      { label: "Instructions", type: "textarea", placeholder: "Message on card, etc. (optional)" },
    ],
    Others: [
      { label: "Shop/Location Name", type: "text", placeholder: "Where to get it from", required: true },
      { label: "Description", type: "textarea", placeholder: "Describe what you need", required: true },
      { label: "Price (PKR)", type: "number", placeholder: "Expected price", required: true, min: 0 },
      { label: "Approx. Weight (kg)", type: "number", placeholder: "e.g. 1 (optional)", min: 0 },
      { label: "Instructions", type: "textarea", placeholder: "Any specific requirements (optional)" },
    ],
  };

  const handleFieldChange = (label: string, value: string) => {
    setFormData({ ...formData, [label]: value });
  };

  const setSelectedFile = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Image must be less than 5MB",
        variant: "destructive",
      });
      return;
    }
    setImageFile(file);
    setLocalPreviewUrl(URL.createObjectURL(file));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const nativePick = async (source: CameraSource) => {
    try {
      const image = await CapCamera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source,
      });
      if (image.dataUrl) {
        const blob = await (await fetch(image.dataUrl)).blob();
        const file = new File([blob], `photo_${Date.now()}.jpg`, { type: "image/jpeg" });
        setSelectedFile(file);
      }
    } catch (error) {
      console.error("Image pick error:", error);
    }
  };

  const handleTakePhoto = () => {
    if (isNative) return nativePick(CameraSource.Camera);
    cameraInputRef.current?.click();
  };

  const handleChooseFromGallery = () => {
    if (isNative) return nativePick(CameraSource.Photos);
    fileInputRef.current?.click();
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setLocalPreviewUrl(null);
    setExistingImageUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };


  const isFormValid = () => {
    if (!itemType) return false;
    const fields = itemTypeFields[itemType];
    if (!fields) return false;

    // Only check required fields
    for (const field of fields) {
      if (field.required) {
        const value = formData[field.label];
        if (!value || value.trim() === "") return false;
      }
    }

    // Cloth requires an attached image
    if (itemType === "Cloth" && !imageFile && !existingImageUrl) return false;

    return true;
  };

  const handleAddItem = async () => {
    if (!isFormValid()) {
      toast({
        title: "Incomplete Form",
        description: "Please fill all required fields",
        variant: "destructive",
      });
      return;
    }

    let imageUrl = existingImageUrl || "";
    if (imageFile) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Not signed in",
          description: "Please sign in again to attach images",
          variant: "destructive",
        });
        return;
      }

      const fileExt = imageFile.name.split(".").pop()?.toLowerCase() || "jpg";
      // Storage policy requires the first folder to be the uploader's user id
      const filePath = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("order-images")
        .upload(filePath, imageFile, {
          contentType: imageFile.type || undefined,
          upsert: false,
        });

      if (uploadError) {
        console.error("Order image upload failed:", uploadError);
        toast({
          title: "Upload Failed",
          description: uploadError.message || "Failed to upload image",
          variant: "destructive",
        });
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("order-images")
        .getPublicUrl(filePath);

      imageUrl = publicUrl;
    }


    const item: OrderItem = {
      id: initialItem?.id || Math.random().toString(36).substr(2, 9),
      itemType,
      itemData: formData,
      imageFile: imageFile || undefined,
      imageUrl,
      pickupLat: pickupLocation?.lat,
      pickupLng: pickupLocation?.lng,
    };

    onAddItem(item);
    
    // Reset form
    setItemType("");
    setFormData({});
    setImageFile(null);
    setExistingImageUrl("");
    setPickupLocation(null);
    setShowPickupMap(false);
    
    toast({
      title: initialItem ? "Item Updated" : "Item Added",
      description: initialItem ? "Item updated in your order" : "Item added to your order",
    });
  };

  return (
    <div className="space-y-5 w-full max-w-full overflow-hidden">
      <div className="space-y-2 w-full">
        <label className="mobile-label">Item Type</label>
        <Select value={itemType} onValueChange={setItemType}>
          <SelectTrigger className="mobile-input w-full">
            <SelectValue placeholder="Select item type" />
          </SelectTrigger>
          <SelectContent className="bg-background border border-border z-50">
            <SelectItem value="Cloth">Cloth</SelectItem>
            <SelectItem value="Food">Food</SelectItem>
            <SelectItem value="Commodities">Commodities</SelectItem>
            <SelectItem value="Gifts">Gifts</SelectItem>
            <SelectItem value="Others">Others</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {itemType && itemTypeFields[itemType] && (
        <>
          {itemTypeFields[itemType].map((field) => {
            const isPrice = field.label.toLowerCase().includes("price");
            const isQuantity = field.label.toLowerCase().includes("quantity");
            return (
              <div key={field.label} className="space-y-2 w-full">
                <label className="mobile-label">
                  {field.label}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </label>
                {field.type === "textarea" ? (
                  <Textarea
                    className="mobile-input min-h-[100px] py-3 w-full"
                    placeholder={field.placeholder}
                    value={formData[field.label] || ""}
                    onChange={(e) => handleFieldChange(field.label, e.target.value)}
                    rows={3}
                  />
                ) : isPrice || isQuantity ? (
                  <Input
                    className="mobile-input w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    type="text"
                    inputMode="numeric"
                    placeholder={field.placeholder}
                    value={formData[field.label] || ""}
                    onChange={(e) => {
                      // Strip anything that's not a digit (removes '-', letters, spinners not applicable)
                      const cleaned = e.target.value.replace(/[^0-9]/g, "");
                      handleFieldChange(field.label, cleaned);
                    }}
                  />
                ) : (
                  <Input
                    className="mobile-input w-full"
                    type={field.type}
                    placeholder={field.placeholder}
                    value={formData[field.label] || ""}
                    onChange={(e) => handleFieldChange(field.label, e.target.value)}
                    min={field.min}
                  />
                )}
              </div>
            );
          })}

          <div className="space-y-2 w-full">
            <label className="mobile-label">
              Attach Image {itemType === "Cloth" ? <span className="text-destructive ml-1">*</span> : "(Optional)"}
            </label>
            <div className="flex flex-col gap-2 w-full">
              <Input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="mobile-input w-full file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-primary/10 file:text-primary"
              />
              {imageFile && (
                <span className="text-sm text-muted-foreground flex items-center">
                  <Upload className="h-4 w-4 mr-1 shrink-0" />
                  <span className="truncate">{imageFile.name}</span>
                </span>
              )}
              {!imageFile && existingImageUrl && (
                <span className="text-sm text-muted-foreground">Current image attached (upload to replace)</span>
              )}
              {itemType === "Cloth" && !imageFile && !existingImageUrl && (
                <span className="text-xs text-destructive">Image is required for clothing items</span>
              )}
            </div>
          </div>


          <div className="border-t pt-4 space-y-4 w-full">
            
            <div className="space-y-2 w-full">
              <label className="mobile-label">Pickup Address (Optional)</label>
              <Input
                className="mobile-input w-full"
                placeholder="Enter pickup address for this item"
                value={formData["Pickup Address"] || ""}
                onChange={(e) => handleFieldChange("Pickup Address", e.target.value)}
              />
            </div>

            <Collapsible open={showPickupMap} onOpenChange={setShowPickupMap}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-12 rounded-xl">
                  <span className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span className="text-sm">Select Pickup on Map</span>
                  </span>
                  {showPickupMap ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4">
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Click on the map to mark pickup location</p>
                  <LocationPickerMap
                    onLocationSelect={(lat, lng) => setPickupLocation({ lat, lng })}
                    label="Pickup Location"
                  />
                  {pickupLocation && (
                    <p className="text-sm text-green-600 font-medium">
                      ✓ Location: {pickupLocation.lat.toFixed(4)}, {pickupLocation.lng.toFixed(4)}
                    </p>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          <div className="space-y-3 pt-2">
            {!isFormValid() && (
              <div className="p-3 bg-accent/10 border border-accent/20 rounded-xl">
                <p className="text-sm text-accent-foreground">
                  ⚠️ Please fill all required fields (marked with *)
                </p>
              </div>
            )}
            <div className="flex gap-2">
              <Button
                onClick={handleAddItem}
                className="flex-1 mobile-button"
                disabled={!isFormValid()}
              >
                <Plus className="h-5 w-5 mr-2" />
                {submitLabel || (initialItem ? "Update Item" : "Add Item to Order")}
              </Button>
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel} className="mobile-button">
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
