import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AIBotButton } from "@/components/AIBotButton";
import { supabase } from "@/integrations/supabase/client";
import { Package, Eye, MapPin, Trash2, RefreshCw } from "lucide-react";
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

  const handleRemoveItem = async (orderId: string, itemId: string) => {
    try {
      const { error } = await supabase
        .from("order_items")
        .delete()
        .eq("id", itemId);

      if (error) throw error;

      toast.success("Item removed successfully");
      
      // Reload orders
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        loadOrders(user.id);
      }
    } catch (error) {
      console.error("Error removing item:", error);
      toast.error("Failed to remove item");
    }
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
    return items.reduce((total, item) => {
      const priceField = Object.entries(item.item_data).find(
        ([key]) => key.toLowerCase().includes("price")
      );
      return total + (priceField ? parseFloat(priceField[1]) || 0 : 0);
    }, 0);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header isAuthenticated={isAuthenticated} />

      <main className="flex-1 py-12">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold">My Orders</h1>
            <Button onClick={() => navigate("/place-order")}>
              <Package className="h-4 w-4 mr-2" />
              Place New Order
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading orders...</p>
            </div>
          ) : orders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg text-muted-foreground mb-4">No orders yet</p>
                <Button onClick={() => navigate("/place-order")}>
                  Place Your First Order
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <Card key={order.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">Order #{order.id.slice(0, 8)}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {format(new Date(order.created_at), "PPP")}
                        </p>
                      </div>
                      <Badge className={getStatusColor(order.status)}>
                        {order.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 mt-1 text-muted-foreground" />
                        <p className="text-sm">{order.delivery_address}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Items:</span>
                          <span className="ml-2 font-semibold">
                            {order.order_items.length}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Total:</span>
                          <span className="ml-2 font-semibold text-primary">
                            PKR {calculateTotalPrice(order.order_items).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Order Details</DialogTitle>
                              <DialogDescription>
                                Order #{order.id.slice(0, 8)} - {format(new Date(order.created_at), "PPP")}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 mt-4">
                              {order.order_items.map((item) => (
                                <Card key={item.id}>
                                  <CardContent className="p-4">
                                    <div className="flex items-start justify-between mb-2">
                                      <p className="font-semibold text-primary">
                                        {item.item_type}
                                      </p>
                                      {item.approval_status && (
                                        <Badge
                                          variant={
                                            item.approval_status === "approved"
                                              ? "default"
                                              : item.approval_status === "rejected"
                                              ? "destructive"
                                              : "secondary"
                                          }
                                        >
                                          {item.approval_status}
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="space-y-1 text-sm">
                                      {Object.entries(item.item_data).map(([key, value]) => (
                                        <p key={key} className="text-muted-foreground">
                                          <span className="font-medium text-foreground">{key}:</span>{" "}
                                          {value}
                                        </p>
                                      ))}
                                    </div>
                                    {item.image_url && (
                                      <img
                                        src={item.image_url}
                                        alt="Item"
                                        className="mt-3 rounded-lg max-h-48 object-cover"
                                      />
                                    )}
                                     {item.manager_feedback && (
                                      <div className="mt-3 p-3 bg-muted rounded-lg">
                                        <p className="text-sm font-medium mb-1">Manager Feedback:</p>
                                        <p className="text-sm text-muted-foreground">{item.manager_feedback}</p>
                                        {item.approved_at && (
                                          <p className="text-xs text-muted-foreground mt-1">
                                            {format(new Date(item.approved_at), "PPp")}
                                          </p>
                                        )}
                                      </div>
                                    )}
                                    
                                    {item.approval_status === "rejected" && order.status === "Pending" && (
                                      <div className="mt-3 flex gap-2">
                                        <AlertDialog>
                                          <AlertDialogTrigger asChild>
                                            <Button variant="destructive" size="sm">
                                              <Trash2 className="h-4 w-4 mr-1" />
                                              Remove Item
                                            </Button>
                                          </AlertDialogTrigger>
                                          <AlertDialogContent>
                                            <AlertDialogHeader>
                                              <AlertDialogTitle>Remove Item?</AlertDialogTitle>
                                              <AlertDialogDescription>
                                                This will permanently remove this rejected item from your order. This action cannot be undone.
                                              </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                                              <AlertDialogAction onClick={() => handleRemoveItem(order.id, item.id)}>
                                                Remove
                                              </AlertDialogAction>
                                            </AlertDialogFooter>
                                          </AlertDialogContent>
                                        </AlertDialog>
                                        
                                        <Button 
                                          variant="outline" 
                                          size="sm"
                                          onClick={() => navigate("/place-order")}
                                        >
                                          <RefreshCw className="h-4 w-4 mr-1" />
                                          Add New Item
                                        </Button>
                                      </div>
                                    )}
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          </DialogContent>
                        </Dialog>

                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => navigate(`/track?orderId=${order.id}`)}
                        >
                          Track Order
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
