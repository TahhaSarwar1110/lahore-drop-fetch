import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, Upload, MapPin, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { LocationPickerMap } from "@/components/map/LocationPickerMap";

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
}

export const OrderItemForm = ({ onAddItem }: OrderItemFormProps) => {
  const [itemType, setItemType] = useState("");
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [pickupLocation, setPickupLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showPickupMap, setShowPickupMap] = useState(false);
  const { toast } = useToast();

  const itemTypeFields: Record<string, { label: string; type: string; placeholder: string; required?: boolean }[]> = {
    Cloth: [
      { label: "Shop/Store Name", type: "text", placeholder: "Name of store", required: true },
      { label: "Item Description", type: "text", placeholder: "What you want to buy", required: true },
      { label: "Brand", type: "text", placeholder: "Brand name (optional)" },
      { label: "Quantity", type: "number", placeholder: "1 (optional)" },
      { label: "Expected Price (PKR)", type: "number", placeholder: "0 (optional)" },
      { label: "Special Instructions", type: "textarea", placeholder: "Any specific requirements (optional)" },
    ],
    Food: [
      { label: "Restaurant/Shop Name", type: "text", placeholder: "Name of restaurant", required: true },
      { label: "Item Name", type: "text", placeholder: "What to order", required: true },
      { label: "Quantity", type: "number", placeholder: "1 (optional)" },
      { label: "Price (PKR)", type: "number", placeholder: "0 (optional)" },
      { label: "Special Instructions", type: "textarea", placeholder: "Extra spicy, no onions, etc. (optional)" },
    ],
    Commodities: [
      { label: "Shop Name", type: "text", placeholder: "Store name", required: true },
      { label: "Item Description", type: "text", placeholder: "What you need", required: true },
      { label: "Quantity", type: "number", placeholder: "1 (optional)" },
      { label: "Price (PKR)", type: "number", placeholder: "0 (optional)" },
      { label: "Instructions", type: "textarea", placeholder: "Any specific requirements (optional)" },
    ],
    Gifts: [
      { label: "Shop Name", type: "text", placeholder: "Gift shop name", required: true },
      { label: "Gift Description", type: "text", placeholder: "Flowers, Cake, etc.", required: true },
      { label: "Quantity", type: "number", placeholder: "1 (optional)" },
      { label: "Price (PKR)", type: "number", placeholder: "0 (optional)" },
      { label: "Instructions", type: "textarea", placeholder: "Message on card, etc. (optional)" },
    ],
    Others: [
      { label: "Shop/Location Name", type: "text", placeholder: "Where to get it from", required: true },
      { label: "Description", type: "textarea", placeholder: "Describe what you need", required: true },
      { label: "Price (PKR)", type: "number", placeholder: "0 (optional)" },
      { label: "Instructions", type: "textarea", placeholder: "Any specific requirements (optional)" },
    ],
  };

  const handleFieldChange = (label: string, value: string) => {
    setFormData({ ...formData, [label]: value });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Image must be less than 5MB",
          variant: "destructive",
        });
        return;
      }
      setImageFile(file);
    }
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

    let imageUrl = "";
    if (imageFile) {
      const fileExt = imageFile.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const { error: uploadError, data } = await supabase.storage
        .from("order-images")
        .upload(fileName, imageFile);

      if (uploadError) {
        toast({
          title: "Upload Failed",
          description: "Failed to upload image",
          variant: "destructive",
        });
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("order-images")
        .getPublicUrl(fileName);
      
      imageUrl = publicUrl;
    }

    const item: OrderItem = {
      id: Math.random().toString(36).substr(2, 9),
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
    setPickupLocation(null);
    setShowPickupMap(false);
    
    toast({
      title: "Item Added",
      description: "Item added to your order",
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
          {itemTypeFields[itemType].map((field) => (
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
              ) : (
                <Input
                  className="mobile-input w-full"
                  type={field.type}
                  placeholder={field.placeholder}
                  value={formData[field.label] || ""}
                  onChange={(e) => handleFieldChange(field.label, e.target.value)}
                />
              )}
            </div>
          ))}

          <div className="space-y-2 w-full">
            <label className="mobile-label">Attach Image (Optional)</label>
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
            </div>
          </div>

          <div className="border-t pt-4 space-y-4 w-full">
            <h4 className="text-sm font-semibold text-muted-foreground">Pickup Details (Optional)</h4>
            
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
            <Button 
              onClick={handleAddItem} 
              className="w-full mobile-button"
              disabled={!isFormValid()}
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Item to Order
            </Button>
          </div>
        </>
      )}
    </div>
  );
};
