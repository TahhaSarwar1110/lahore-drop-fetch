import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OrderStatusSelect } from "@/components/admin/OrderStatusSelect";
import { toast } from "sonner";
import { ArrowLeft, Package, User, MapPin, Clock, Image as ImageIcon } from "lucide-react";

interface OrderItem {
  id: string;
  item_type: string;
  item_data: any;
  image_url: string | null;
  pickup_address?: string | null;
  pickup_latitude?: number | null;
  pickup_longitude?: number | null;
}


interface StatusHistory {
  id: string;
  status: string;
  timestamp: string;
}

interface OrderDetails {
  id: string;
  created_at: string;
  delivery_address: string;
  status: string;
  profiles: {
    full_name: string;
    phone: string;
  };
  order_items: OrderItem[];
  order_status_history: StatusHistory[];
}

const AdminOrderDetails = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdminCheck();
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (isAdmin && orderId) {
      fetchOrderDetails();
    }
  }, [isAdmin, orderId]);

  const fetchOrderDetails = async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          profiles (
            full_name,
            phone
          ),
          order_items (*),
          order_status_history (*)
        `)
        .eq("id", orderId)
        .single();

      if (error) throw error;
      setOrder(data);
    } catch (error) {
      console.error("Error fetching order details:", error);
      toast.error("Failed to load order details");
      navigate("/admin");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!orderId) return;
    
    setUpdating(true);
    try {
      // Update order status
      const { error: updateError } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", orderId);

      if (updateError) throw updateError;

      // Insert status history
      const { error: historyError } = await supabase
        .from("order_status_history")
        .insert({ order_id: orderId, status: newStatus });

      if (historyError) throw historyError;

      toast.success("Order status updated successfully");
      fetchOrderDetails();
    } catch (error) {
      console.error("Error updating order status:", error);
      toast.error("Failed to update order status");
    } finally {
      setUpdating(false);
    }
  };

  if (adminLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Package className="h-12 w-12 text-primary animate-pulse mx-auto mb-4" />
          <p className="text-muted-foreground">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin || !order) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <Button
          variant="outline"
          onClick={() => navigate("/admin")}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Order Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Order ID</p>
                <p className="font-mono text-sm">{order.id}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Order Date</p>
                <p>{new Date(order.created_at).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Current Status</p>
                <OrderStatusSelect
                  currentStatus={order.status}
                  onStatusChange={handleStatusUpdate}
                  disabled={updating}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p>{order.profiles.full_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p>{order.profiles.phone}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1 mb-1">
                  <MapPin className="h-4 w-4" />
                  Delivery Address
                </p>
                <p>{order.delivery_address}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Order Items ({order.order_items.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.order_items.map((item, index) => (
                  <div key={item.id} className="border border-border rounded-lg p-4 bg-accent/50">
                    <div className="flex items-start justify-between mb-3 gap-4">
                      <div>
                        <Badge variant="outline" className="mb-2">
                          {item.item_type}
                        </Badge>
                        <h4 className="font-semibold">Item #{index + 1}</h4>
                      </div>
                      {item.image_url && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            const { data, error } = await supabase.storage
                              .from("order-images")
                              .createSignedUrl(item.image_url as string, 60 * 10);
                            if (error || !data?.signedUrl) {
                              toast.error("Failed to load image");
                              return;
                            }
                            window.open(data.signedUrl, "_blank", "noopener,noreferrer");
                          }}
                        >
                          <ImageIcon className="h-4 w-4 mr-1" />
                          View Image
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                      {Object.entries(item.item_data).map(([key, value]) => (
                        <div key={key}>
                          <span className="text-muted-foreground capitalize">
                            {key.replace(/_/g, " ")}:
                          </span>
                          <span className="ml-2 text-foreground">{String(value)}</span>
                        </div>
                      ))}
                    </div>

                    {(item.pickup_address || (item.pickup_latitude != null && item.pickup_longitude != null)) && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <p className="text-sm font-medium flex items-center gap-1 mb-1">
                          <MapPin className="h-4 w-4 text-primary" />
                          Pickup Location
                        </p>
                        {item.pickup_address && (
                          <p className="text-sm text-foreground">{item.pickup_address}</p>
                        )}
                        {item.pickup_latitude != null && item.pickup_longitude != null && (
                          <a
                            href={`https://www.google.com/maps?q=${item.pickup_latitude},${item.pickup_longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline"
                          >
                            Open pinned location in Maps ({item.pickup_latitude.toFixed(5)}, {item.pickup_longitude.toFixed(5)})
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                ))}

              </div>
            </CardContent>
          </Card>

          <Card className="border-border md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Status History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {order.order_status_history
                  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                  .map((history) => (
                    <div key={history.id} className="flex items-center justify-between border-l-2 border-primary pl-4 py-2">
                      <div>
                        <Badge variant="outline">{history.status}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {new Date(history.timestamp).toLocaleString()}
                      </p>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AdminOrderDetails;
