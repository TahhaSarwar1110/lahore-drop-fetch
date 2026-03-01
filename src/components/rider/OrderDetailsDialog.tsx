import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Package, Check, Upload, Image as ImageIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RiderMapView } from "@/components/map/RiderMapView";

interface OrderItem {
  id: string;
  item_type: string;
  item_data: any;
  image_url: string | null;
  pickup_latitude: number | null;
  pickup_longitude: number | null;
  pickup?: {
    id: string;
    picked_at: string;
    pickup_proof_url: string | null;
    pickup_proof_name: string | null;
  };
}

interface OrderDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  orderNumber: string;
  onPickupComplete: () => void;
}

export const OrderDetailsDialog = ({
  open,
  onOpenChange,
  orderId,
  orderNumber,
  onPickupComplete,
}: OrderDetailsDialogProps) => {
  const [items, setItems] = useState<OrderItem[]>([]);
  const [deliveryLocation, setDeliveryLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchOrderItems();
    }
  }, [open, orderId]);

  const fetchOrderItems = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch order delivery location
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("delivery_address, delivery_latitude, delivery_longitude")
        .eq("id", orderId)
        .single();

      if (orderError) throw orderError;
      
      if (orderData?.delivery_latitude && orderData?.delivery_longitude) {
        setDeliveryLocation({
          lat: orderData.delivery_latitude,
          lng: orderData.delivery_longitude,
          address: orderData.delivery_address,
        });
      }

      // Fetch order items
      const { data: itemsData, error: itemsError } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", orderId);

      if (itemsError) throw itemsError;

      // Fetch pickup status for each item
      const { data: pickupsData, error: pickupsError } = await supabase
        .from("item_pickups")
        .select("*")
        .eq("rider_id", user.id)
        .in("order_item_id", itemsData?.map(item => item.id) || []);

      if (pickupsError) throw pickupsError;

      // Merge pickup data with items
      const itemsWithPickups = itemsData?.map(item => ({
        ...item,
        pickup: pickupsData?.find(p => p.order_item_id === item.id),
      })) || [];

      setItems(itemsWithPickups);
    } catch (error) {
      console.error("Error fetching order items:", error);
      toast.error("Failed to load order items");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (itemId: string, file: File) => {
    try {
      setUploading(itemId);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("pickup-proofs")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("pickup-proofs")
        .getPublicUrl(fileName);

      // Create pickup record
      const { error: insertError } = await supabase
        .from("item_pickups")
        .insert({
          order_item_id: itemId,
          rider_id: user.id,
          pickup_proof_url: publicUrl,
          pickup_proof_name: file.name,
        });

      if (insertError) throw insertError;

      toast.success("Item marked as picked with proof uploaded");
      await fetchOrderItems();
      onPickupComplete();
    } catch (error) {
      console.error("Error uploading pickup proof:", error);
      toast.error("Failed to upload pickup proof");
    } finally {
      setUploading(null);
    }
  };

  // Removed handleMarkAsPicked - pickup proof is now mandatory

  const allItemsPicked = items.length > 0 && items.every(item => item.pickup);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Order Details - #{orderNumber}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No items found for this order
          </div>
        ) : (
          <div className="space-y-4">
            {/* Map View */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Route Map</CardTitle>
              </CardHeader>
              <CardContent>
                <RiderMapView
                  locations={[
                    ...items
                      .filter(item => item.pickup_latitude && item.pickup_longitude)
                      .map((item, index) => ({
                        lat: item.pickup_latitude!,
                        lng: item.pickup_longitude!,
                        label: `Pickup: ${item.item_type}`,
                        type: "pickup" as const,
                      })),
                    ...(deliveryLocation ? [{
                      lat: deliveryLocation.lat,
                      lng: deliveryLocation.lng,
                      label: `Delivery: ${deliveryLocation.address}`,
                      type: "delivery" as const,
                    }] : []),
                  ]}
                  height="300px"
                />
              </CardContent>
            </Card>

            {allItemsPicked && (
              <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <p className="text-sm text-green-800 dark:text-green-200 flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  All items picked! You can now mark the order as delivered.
                </p>
              </div>
            )}

            {items.map((item) => (
              <Card key={item.id}>
                <CardContent className="pt-4">
                  <div className="flex gap-4">
                    {item.image_url && (
                      <img
                        src={item.image_url}
                        alt="Item"
                        className="w-20 h-20 object-cover rounded"
                      />
                    )}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium capitalize">{item.item_type}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.item_data.description || "No description"}
                          </p>
                        </div>
                        {item.pickup ? (
                          <Badge className="bg-green-500">
                            <Check className="h-3 w-3 mr-1" />
                            Picked
                          </Badge>
                        ) : (
                          <Badge variant="outline">Pending</Badge>
                        )}
                      </div>

                      {item.pickup ? (
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground">
                            Picked at: {new Date(item.pickup.picked_at).toLocaleString()}
                          </p>
                          {item.pickup.pickup_proof_url && (
                            <a
                              href={item.pickup.pickup_proof_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline flex items-center gap-1"
                            >
                              <ImageIcon className="h-3 w-3" />
                              View pickup proof
                            </a>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <p className="text-sm text-muted-foreground">
                            📷 Upload pickup proof to mark this item as picked
                          </p>
                          <label>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload(item.id, file);
                              }}
                              disabled={uploading === item.id}
                            />
                            <Button
                              size="sm"
                              disabled={uploading === item.id}
                              asChild
                            >
                              <span>
                                {uploading === item.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                  <Upload className="h-4 w-4 mr-2" />
                                )}
                                Upload Pickup Proof
                              </span>
                            </Button>
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
