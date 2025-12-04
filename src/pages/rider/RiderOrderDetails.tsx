import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Check, Upload, Image as ImageIcon, ArrowLeft, MapPin, Navigation } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

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
        <Header isAuthenticated={true} />
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
      <Header isAuthenticated={true} />
      
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
            <p className="text-muted-foreground mt-1">
              Customer: {order.profiles.full_name} | {order.profiles.phone}
            </p>
          </div>

          {/* Delivery Location Card */}
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <MapPin className="h-5 w-5 text-primary" />
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
                >
                  <Navigation className="h-4 w-4 mr-2" />
                  Get Directions
                </Button>
              )}
            </CardContent>
          </Card>

          {allItemsPicked && (
            <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
              <p className="text-sm text-green-800 dark:text-green-200 flex items-center gap-2">
                <Check className="h-4 w-4" />
                All items picked! You can now mark the order as delivered from the dashboard.
              </p>
            </div>
          )}

          <h2 className="text-lg font-semibold mb-4">Items ({items.length})</h2>

          <div className="space-y-4">
            {items.map((item) => (
              <Card key={item.id}>
                <CardContent className="pt-4">
                  <div className="flex gap-4">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt="Item"
                        className="w-24 h-24 object-cover rounded-lg border"
                      />
                    ) : (
                      <div className="w-24 h-24 bg-muted rounded-lg flex items-center justify-center">
                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold capitalize text-lg">{item.item_type}</p>
                          {(item.item_data.Brand || item.item_data["Item Name"] || item.item_data["Restaurant/Shop Name"] || item.item_data["Shop/Store Name"]) && (
                            <p className="text-sm text-muted-foreground">
                              {item.item_data.Brand || item.item_data["Item Name"] || item.item_data["Restaurant/Shop Name"] || item.item_data["Shop/Store Name"]}
                            </p>
                          )}
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

                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {(item.item_data.Quantity || item.item_data.quantity) && (
                          <div>
                            <span className="text-muted-foreground">Quantity:</span>{" "}
                            <span className="font-medium">{item.item_data.Quantity || item.item_data.quantity}</span>
                          </div>
                        )}
                        {(item.item_data["Expected Price (PKR)"] || item.item_data["Price (PKR)"]) && (
                          <div>
                            <span className="text-muted-foreground">Price:</span>{" "}
                            <span className="font-medium">PKR {item.item_data["Expected Price (PKR)"] || item.item_data["Price (PKR)"]}</span>
                          </div>
                        )}
                      </div>

                      {(item.item_data["Item Description"] || item.item_data.description) && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Description:</span>{" "}
                          <span>{item.item_data["Item Description"] || item.item_data.description}</span>
                        </div>
                      )}

                      {item.item_data["Special Instructions"] && (
                        <div className="text-sm bg-yellow-50 dark:bg-yellow-950 p-2 rounded">
                          <span className="text-muted-foreground">Special Instructions:</span>{" "}
                          <span>{item.item_data["Special Instructions"]}</span>
                        </div>
                      )}

                      {/* Pickup Location */}
                      {item.pickup_latitude && item.pickup_longitude && (
                        <div className="pt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openDirections(item.pickup_latitude!, item.pickup_longitude!)}
                            className="text-primary"
                          >
                            <Navigation className="h-4 w-4 mr-2" />
                            Get Pickup Directions
                          </Button>
                        </div>
                      )}

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
                        <div className="flex gap-2 pt-2 border-t">
                          <Button
                            size="sm"
                            onClick={() => handleMarkAsPicked(item.id)}
                            disabled={uploading === item.id}
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
                              variant="outline"
                              disabled={uploading === item.id}
                              asChild
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
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default RiderOrderDetails;
