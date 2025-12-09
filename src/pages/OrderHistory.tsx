import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AIBotButton } from "@/components/AIBotButton";
import { supabase } from "@/integrations/supabase/client";
import { Package, Eye, MapPin } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface Order {
  id: string;
  delivery_address: string;
  status: string;
  created_at: string;
  order_items: {
    id: string;
    item_type: string;
    item_data: Record<string, string>;
    image_url: string | null;
    approval_status: string | null;
    manager_feedback: string | null;
    approved_at: string | null;
  }[];
}

const OrderHistory = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/login");
      } else {
        setIsAuthenticated(true);
        loadOrders(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadOrders = async (userId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select(`
        id,
        delivery_address,
        status,
        created_at,
        order_items (
          id,
          item_type,
          item_data,
          image_url,
          approval_status,
          manager_feedback,
          approved_at
        )
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading orders:", error);
    } else {
      setOrders(data as Order[]);
    }
    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      Pending: "bg-yellow-500",
      "Order Received": "bg-blue-500",
      "Shopper Assigned": "bg-cyan-500",
      Purchasing: "bg-purple-500",
      "In Delivery": "bg-orange-500",
      Delivered: "bg-green-500",
      Cancelled: "bg-red-500",
    };
    return colors[status] || "bg-gray-500";
  };

  const calculateTotalPrice = (items: Order["order_items"]) => {
    return items
      .filter(item => item.approval_status === 'approved')
      .reduce((total, item) => {
        const priceField = Object.entries(item.item_data).find(
          ([key]) => key.toLowerCase().includes("price")
        );
        return total + (priceField ? parseFloat(priceField[1]) || 0 : 0);
      }, 0);
  };

  return (
    <div className="min-h-screen flex flex-col tap-highlight-none">
      <Header isAuthenticated={isAuthenticated} />

      <main className="flex-1 py-4 sm:py-8 native-scroll">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h1 className="mobile-header">My Orders</h1>
            <Button onClick={() => navigate("/place-order")} className="mobile-button w-full sm:w-auto">
              <Package className="h-4 w-4 mr-2" />
              Place New Order
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading orders...</p>
            </div>
          ) : orders.length === 0 ? (
            <Card className="mobile-card">
              <CardContent className="py-12 text-center">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg text-muted-foreground mb-4">No orders yet</p>
                <Button onClick={() => navigate("/place-order")} className="mobile-button">
                  Place Your First Order
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <Card key={order.id} className="mobile-card active:scale-[0.99] transition-transform">
                  <CardHeader className="pb-2 px-4">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base sm:text-lg truncate">
                          Order #{order.id.slice(0, 8)}
                        </CardTitle>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                          {format(new Date(order.created_at), "PPP")}
                        </p>
                      </div>
                      <Badge className={`${getStatusColor(order.status)} text-xs shrink-0`}>
                        {order.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="space-y-3">
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                        <p className="text-sm line-clamp-2">{order.delivery_address}</p>
                      </div>

                      <div className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-xl text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Items:</span>
                          <span className="font-semibold">{order.order_items.length}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Total:</span>
                          <span className="font-semibold text-primary">
                            PKR {calculateTotalPrice(order.order_items).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          className="flex-1 h-11 rounded-xl text-sm"
                          onClick={() => navigate(`/order-details?orderId=${order.id}`)}
                        >
                          <Eye className="h-4 w-4 mr-1.5" />
                          Details
                        </Button>

                        <Button
                          variant="default"
                          className="flex-1 h-11 rounded-xl text-sm"
                          onClick={() => navigate(`/track?orderId=${order.id}`)}
                        >
                          Track
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
      <AIBotButton />
    </div>
  );
};

export default OrderHistory;
