import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Check, Upload, Image as ImageIcon, ArrowLeft, MapPin, Navigation, Package, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { RiderMapView } from "@/components/map/RiderMapView";
import { CustomerContactCard } from "@/components/rider/CustomerContactCard";

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

interface OrderDetails {
  id: string;
  delivery_address: string;
  delivery_latitude: number | null;
  delivery_longitude: number | null;
  status: string;
  profiles: {
    full_name: string;
    phone: string;
  };
}

const RiderOrderDetails = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [items, setItems] = useState<OrderItem[]>([]);
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
    }
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      // Fetch order details
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select(`
          id,
          delivery_address,
          delivery_latitude,
          delivery_longitude,
          status,
          profiles (
            full_name,
            phone
          )
        `)
        .eq("id", orderId)
        .single();

      if (orderError) throw orderError;
      setOrder(orderData);

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
      console.error("Error fetching order details:", error);
      toast.error("Failed to load order details");
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
      await fetchOrderDetails();
    } catch (error) {
      console.error("Error uploading pickup proof:", error);
      toast.error("Failed to upload pickup proof");
    } finally {
      setUploading(null);
    }
  };

  const handleMarkAsPicked = async (itemId: string) => {
    try {
      setUploading(itemId);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("item_pickups")
        .insert({
          order_item_id: itemId,
          rider_id: user.id,
        });

      if (error) throw error;

      toast.success("Item marked as picked");
      await fetchOrderDetails();
    } catch (error) {
      console.error("Error marking item as picked:", error);
      toast.error("Failed to mark item as picked");
    } finally {
      setUploading(null);
    }
  };

  const openDirections = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
  };

  const allItemsPicked = items.length > 0 && items.every(item => item.pickup);

  // Helper to render item data fields
  const renderItemDetails = (itemData: any, itemType: string) => {
    const fields: { label: string; value: any }[] = [];
    
    // Common fields based on item type
    const fieldMappings: Record<string, string[]> = {
      clothing: ['Brand', 'Size', 'Color', 'Quantity', 'Item Description', 'Special Instructions', 'Price (PKR)', 'Expected Price (PKR)'],
      food: ['Restaurant/Shop Name', 'Item Name', 'Quantity', 'Special Instructions', 'Price (PKR)', 'Expected Price (PKR)'],
      groceries: ['Shop/Store Name', 'Item Name', 'Quantity', 'Weight/Size', 'Special Instructions', 'Price (PKR)', 'Expected Price (PKR)'],
      gifts: ['Item Name', 'Brand', 'Quantity', 'Item Description', 'Special Instructions', 'Price (PKR)', 'Expected Price (PKR)'],
    };

    const relevantFields = fieldMappings[itemType.toLowerCase()] || Object.keys(itemData);

    relevantFields.forEach(field => {
      if (itemData[field] !== undefined && itemData[field] !== null && itemData[field] !== '') {
        fields.push({ label: field, value: itemData[field] });
      }
    });

    // Also check for lowercase variants
    Object.keys(itemData).forEach(key => {
      if (!relevantFields.includes(key) && itemData[key] !== undefined && itemData[key] !== null && itemData[key] !== '') {
        // Avoid duplicates
        if (!fields.some(f => f.label.toLowerCase() === key.toLowerCase())) {
          fields.push({ label: key.charAt(0).toUpperCase() + key.slice(1), value: itemData[key] });
        }
      }
    });

    return fields;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold">Order not found</h2>
            <Button className="mt-4" onClick={() => navigate("/orders")}>
              Back to Orders
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 py-4 md:py-8 bg-muted/30">
        <div className="container mx-auto px-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/orders")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Orders
          </Button>

          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Order #{orderId?.slice(0, 8)}
            </h1>
            <Badge className="mt-2">{order.status}</Badge>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left Column - Customer Contact & Delivery */}
            <div className="space-y-6">
              {/* Customer Contact Card */}
              <CustomerContactCard
                customerName={order.profiles.full_name}
                customerPhone={order.profiles.phone}
              />

              {/* Delivery Location Card */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Navigation className="h-5 w-5 text-primary" />
                    Delivery Location
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">{order.delivery_address}</p>
                  {order.delivery_latitude && order.delivery_longitude && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openDirections(order.delivery_latitude!, order.delivery_longitude!)}
                      className="w-full"
                    >
                      <Navigation className="h-4 w-4 mr-2" />
                      Get Directions
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Map & Items */}
            <div className="lg:col-span-2 space-y-6">
              {/* Route Map */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <MapPin className="h-5 w-5 text-primary" />
                    Route Map
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <RiderMapView
                    locations={[
                      ...items
                        .filter(item => item.pickup_latitude && item.pickup_longitude)
                        .map((item) => ({
                          lat: item.pickup_latitude!,
                          lng: item.pickup_longitude!,
                          label: `Pickup: ${item.item_data?.Brand || item.item_data?.["Item Name"] || item.item_type}`,
                          type: "pickup" as const,
                        })),
                      ...(order.delivery_latitude && order.delivery_longitude ? [{
                        lat: order.delivery_latitude,
                        lng: order.delivery_longitude,
                        label: `Delivery: ${order.delivery_address}`,
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
                    All items picked! You can now mark the order as delivered from the dashboard.
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Items ({items.length})</h2>
              </div>

              <div className="space-y-4">
                {items.map((item) => {
                  const itemDetails = renderItemDetails(item.item_data, item.item_type);
                  
                  return (
                    <Card key={item.id}>
                      <CardContent className="p-4">
                        <div className="flex flex-col gap-4">
                          {/* Item Header */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              {item.image_url ? (
                                <img
                                  src={item.image_url}
                                  alt="Item"
                                  className="w-20 h-20 object-cover rounded-lg border flex-shrink-0"
                                />
                              ) : (
                                <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                                </div>
                              )}
                              <div>
                                <p className="font-semibold capitalize text-lg">{item.item_type}</p>
                                {(item.item_data.Brand || item.item_data["Item Name"] || item.item_data["Restaurant/Shop Name"] || item.item_data["Shop/Store Name"]) && (
                                  <p className="text-sm text-muted-foreground">
                                    {item.item_data.Brand || item.item_data["Item Name"] || item.item_data["Restaurant/Shop Name"] || item.item_data["Shop/Store Name"]}
                                  </p>
                                )}
                              </div>
                            </div>
                            {item.pickup ? (
                              <Badge className="bg-green-500 flex-shrink-0">
                                <Check className="h-3 w-3 mr-1" />
                                Picked
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="flex-shrink-0">Pending</Badge>
                            )}
                          </div>

                          {/* Complete Item Details */}
                          <div className="bg-muted/50 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-3">
                              <Info className="h-4 w-4 text-primary" />
                              <span className="font-medium text-sm">Item Details</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {itemDetails.map((detail, idx) => (
                                <div key={idx} className="text-sm">
                                  <span className="text-muted-foreground">{detail.label}:</span>{" "}
                                  <span className="font-medium">{detail.value}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Special Instructions Highlight */}
                          {item.item_data["Special Instructions"] && (
                            <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 p-3 rounded-lg">
                              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                                ⚠️ Special Instructions
                              </p>
                              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                                {item.item_data["Special Instructions"]}
                              </p>
                            </div>
                          )}

                          {/* Pickup Location */}
                          {item.pickup_latitude && item.pickup_longitude && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openDirections(item.pickup_latitude!, item.pickup_longitude!)}
                              className="w-full sm:w-auto"
                            >
                              <Navigation className="h-4 w-4 mr-2" />
                              Get Pickup Directions
                            </Button>
                          )}

                          {/* Pickup Status / Actions */}
                          {item.pickup ? (
                            <div className="pt-2 border-t space-y-2">
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
                            <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t">
                              <Button
                                size="sm"
                                onClick={() => handleMarkAsPicked(item.id)}
                                disabled={uploading === item.id}
                                className="w-full sm:w-auto"
                              >
                                {uploading === item.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <Check className="h-4 w-4 mr-1" />
                                    Mark as Picked
                                  </>
                                )}
                              </Button>
                              <label className="w-full sm:w-auto">
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
                                  variant="outline"
                                  disabled={uploading === item.id}
                                  asChild
                                  className="w-full"
                                >
                                  <span>
                                    <Upload className="h-4 w-4 mr-1" />
                                    Pick with Proof
                                  </span>
                                </Button>
                              </label>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default RiderOrderDetails;
