import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Package, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface Order {
  id: string;
  delivery_address: string;
  status: string;
  created_at: string;
  user_id: string;
  manager_feedback: string | null;
  confirmed_at: string | null;
  profiles: {
    full_name: string;
    phone: string;
  };
}

const ManagerDashboard = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/login");
      return;
    }

    setIsAuthenticated(true);

    // Check if user has manager role
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("role", "manager");

    if (!roles || roles.length === 0) {
      toast.error("Access denied. Manager role required.");
      navigate("/");
      return;
    }

    fetchOrders();
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          profiles:user_id (
            full_name,
            phone
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const confirmOrder = async (orderId: string) => {
    try {
      setUpdating(orderId);
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("orders")
        .update({
          status: "Order Received",
          confirmed_by: user?.id,
          confirmed_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      if (error) throw error;

      toast.success("Order confirmed successfully");
      fetchOrders();
    } catch (error) {
      console.error("Error confirming order:", error);
      toast.error("Failed to confirm order");
    } finally {
      setUpdating(null);
    }
  };

  const sendFeedback = async (orderId: string) => {
    try {
      setUpdating(orderId);
      
      const { error } = await supabase
        .from("orders")
        .update({
          manager_feedback: feedback[orderId] || "",
        })
        .eq("id", orderId);

      if (error) throw error;

      toast.success("Feedback sent successfully");
      setFeedback({ ...feedback, [orderId]: "" });
      fetchOrders();
    } catch (error) {
      console.error("Error sending feedback:", error);
      toast.error("Failed to send feedback");
    } finally {
      setUpdating(null);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      "Pending": "bg-yellow-500",
      "Order Received": "bg-blue-500",
      "Shopper Assigned": "bg-purple-500",
      "Purchasing": "bg-orange-500",
      "In Delivery": "bg-cyan-500",
      "Delivered": "bg-green-500",
    };
    return colors[status] || "bg-gray-500";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header isAuthenticated={isAuthenticated} />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header isAuthenticated={isAuthenticated} />

      <main className="flex-1 py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold mb-6">Manager Dashboard</h1>

          {orders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No orders found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {orders.map((order) => (
                <Card key={order.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">Order #{order.id.slice(0, 8)}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {new Date(order.created_at).toLocaleString()}
                        </p>
                      </div>
                      <Badge className={getStatusColor(order.status)}>
                        {order.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm font-medium">Customer</p>
                      <p className="text-sm text-muted-foreground">
                        {order.profiles.full_name} - {order.profiles.phone}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm font-medium">Delivery Address</p>
                      <p className="text-sm text-muted-foreground">{order.delivery_address}</p>
                    </div>

                    {order.manager_feedback && (
                      <div className="bg-muted p-3 rounded-md">
                        <p className="text-sm font-medium mb-1">Previous Feedback</p>
                        <p className="text-sm text-muted-foreground">{order.manager_feedback}</p>
                      </div>
                    )}

                    {order.status === "Pending" && (
                      <div className="space-y-4 pt-4 border-t">
                        <div className="space-y-2">
                          <Label htmlFor={`feedback-${order.id}`}>Feedback (Optional)</Label>
                          <Textarea
                            id={`feedback-${order.id}`}
                            placeholder="Add feedback for the customer..."
                            value={feedback[order.id] || ""}
                            onChange={(e) => setFeedback({ ...feedback, [order.id]: e.target.value })}
                            rows={3}
                          />
                        </div>

                        <div className="flex gap-2">
                          <Button
                            onClick={() => confirmOrder(order.id)}
                            disabled={updating === order.id}
                            className="flex-1"
                          >
                            {updating === order.id ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <CheckCircle className="h-4 w-4 mr-2" />
                            )}
                            Confirm Order
                          </Button>

                          {feedback[order.id] && (
                            <Button
                              variant="outline"
                              onClick={() => sendFeedback(order.id)}
                              disabled={updating === order.id}
                            >
                              {updating === order.id ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : (
                                <XCircle className="h-4 w-4 mr-2" />
                              )}
                              Send Feedback
                            </Button>
                          )}
                        </div>
                      </div>
                    )}

                    {order.confirmed_at && (
                      <div className="text-sm text-muted-foreground pt-4 border-t">
                        Confirmed at: {new Date(order.confirmed_at).toLocaleString()}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ManagerDashboard;