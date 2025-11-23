import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface OrderItem {
  id: string;
  itemType: string;
  itemData: Record<string, string>;
  imageFile?: File;
  imageUrl?: string;
}

interface OrderItemFormProps {
  onAddItem: (item: OrderItem) => void;
}

export const OrderItemForm = ({ onAddItem }: OrderItemFormProps) => {
  const [itemType, setItemType] = useState("");
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [imageFile, setImageFile] = useState<File | null>(null);
  const { toast } = useToast();

  const itemTypeFields: Record<string, { label: string; type: string; placeholder: string }[]> = {
    Cloth: [
      { label: "Dress Code", type: "text", placeholder: "e.g., Casual, Formal" },
      { label: "Brand", type: "text", placeholder: "Brand name" },
      { label: "Quantity", type: "number", placeholder: "1" },
      { label: "Expected Price (PKR)", type: "number", placeholder: "0" },
      { label: "Special Instructions", type: "textarea", placeholder: "Any specific requirements..." },
    ],
    Food: [
      { label: "Restaurant/Shop Name", type: "text", placeholder: "Name of restaurant" },
      { label: "Item Name", type: "text", placeholder: "What to order" },
      { label: "Quantity", type: "number", placeholder: "1" },
      { label: "Price (PKR)", type: "number", placeholder: "0" },
      { label: "Special Instructions", type: "textarea", placeholder: "Extra spicy, no onions, etc." },
    ],
    Commodities: [
      { label: "Shop Name", type: "text", placeholder: "Store name" },
      { label: "Commodity", type: "text", placeholder: "Item name" },
      { label: "Quantity", type: "number", placeholder: "1" },
      { label: "Price (PKR)", type: "number", placeholder: "0" },
      { label: "Instructions", type: "textarea", placeholder: "Any specific requirements..." },
    ],
    Gifts: [
      { label: "Shop Name", type: "text", placeholder: "Gift shop name" },
      { label: "Gift Type", type: "text", placeholder: "Flowers, Cake, etc." },
      { label: "Quantity", type: "number", placeholder: "1" },
      { label: "Price (PKR)", type: "number", placeholder: "0" },
      { label: "Instructions", type: "textarea", placeholder: "Message on card, etc." },
    ],
    Others: [
      { label: "Description", type: "textarea", placeholder: "Describe what you need..." },
      { label: "Price (PKR)", type: "number", placeholder: "0" },
      { label: "Instructions", type: "textarea", placeholder: "Any specific requirements..." },
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
    
    for (const field of fields) {
      const value = formData[field.label];
      if (!value || value.trim() === "") return false;
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
    };

    onAddItem(item);
    
    // Reset form
    setItemType("");
    setFormData({});
    setImageFile(null);
    
    toast({
      title: "Item Added",
      description: "Item added to your order",
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Item Type</Label>
        <Select value={itemType} onValueChange={setItemType}>
          <SelectTrigger>
            <SelectValue placeholder="Select item type" />
          </SelectTrigger>
          <SelectContent>
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
            <div key={field.label} className="space-y-2">
              <Label>{field.label}</Label>
              {field.type === "textarea" ? (
                <Textarea
                  placeholder={field.placeholder}
                  value={formData[field.label] || ""}
                  onChange={(e) => handleFieldChange(field.label, e.target.value)}
                  rows={3}
                />
              ) : (
                <Input
                  type={field.type}
                  placeholder={field.placeholder}
                  value={formData[field.label] || ""}
                  onChange={(e) => handleFieldChange(field.label, e.target.value)}
                />
              )}
            </div>
          ))}

          <div className="space-y-2">
            <Label>Attach Image (Optional)</Label>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="flex-1"
              />
              {imageFile && (
                <span className="text-sm text-muted-foreground">
                  <Upload className="h-4 w-4 inline mr-1" />
                  {imageFile.name}
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            {!isFormValid() && (
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  ⚠️ Please fill all required fields above to add this item
                </p>
              </div>
            )}
            <Button 
              onClick={handleAddItem} 
              className="w-full"
              disabled={!isFormValid()}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Item to Order
            </Button>
          </div>
        </>
      )}
    </div>
  );
};
