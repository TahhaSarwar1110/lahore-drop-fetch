import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, User } from "lucide-react";
import { toast } from "sonner";
import { OrderItemApproval } from "@/components/manager/OrderItemApproval";
import { AdditionalCharges } from "@/components/manager/AdditionalCharges";

interface OrderItem {
  id: string;
  item_type: string;
  item_data: any;
  approval_status: string;
  manager_feedback: string | null;
  approved_by: string | null;
  approved_at: string | null;
  image_url: string | null;
}

interface Order {
  id: string;
  delivery_address: string;
  status: string;
  created_at: string;
  user_id: string;
  manager_feedback: string | null;
  confirmed_at: string | null;
  additional_charges: number;
  charges_description: string | null;
  profiles: {
    full_name: string;
    phone: string;
  };
  order_assignments?: {
    rider_id: string;
    profiles: {
      full_name: string;
      phone: string;
    };
  } | null;
}

const ManagerOrderDetails = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuthAndFetchOrder();
  }, [orderId]);

  const checkAuthAndFetchOrder = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/login");
        return;
      }

      setIsAuthenticated(true);

      // Check if user has manager or admin role
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .in("role", ["manager", "admin"]);

      if (rolesError || !roles || roles.length === 0) {
        toast.error("Access denied. Manager role required.");
        navigate("/");
        return;
      }

      await fetchOrderDetails();
    } catch (error) {
      console.error("Auth check error:", error);
      toast.error("Authentication error");
      navigate("/");
    }
  };

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      
      // Fetch order details
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select(`
          *,
          profiles!fk_user (
            full_name,
            phone
          ),
          order_assignments (
            rider_id,
            profiles!order_assignments_rider_id_fkey (
              full_name,
              phone
            )
          )
        `)
        .eq("id", orderId)
        .single();

      if (orderError) throw orderError;

      // Transform the data
      const transformedOrder = {
        ...orderData,
        profiles: Array.isArray(orderData.profiles) ? orderData.profiles[0] : orderData.profiles,
        order_assignments: Array.isArray(orderData.order_assignments) && orderData.order_assignments.length > 0
          ? orderData.order_assignments[0]
          : null
      };

      setOrder(transformedOrder);

      // Fetch order items
      const { data: itemsData, error: itemsError } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", orderId);

      if (itemsError) throw itemsError;
      setOrderItems(itemsData || []);
    } catch (error) {
      console.error("Error fetching order details:", error);
      toast.error("Failed to load order details");
    } finally {
      setLoading(false);
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

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header isAuthenticated={isAuthenticated} />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Order not found</p>
        </div>
        <Footer />
      </div>
    );
  }

  const assignedRider = order.order_assignments;

  return (
    <div className="min-h-screen flex flex-col">
      <Header isAuthenticated={isAuthenticated} />

      <main className="flex-1 py-8">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="mb-6">
            <Button
              variant="outline"
              onClick={() => navigate("/manager")}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold">Order Details</h1>
                <p className="text-muted-foreground mt-1">Order #{order.id.slice(0, 8)}</p>
              </div>
              <Badge className={getStatusColor(order.status)}>
                {order.status}
              </Badge>
            </div>
          </div>

          <div className="grid gap-6">
            {/* Order Information Card */}
            <Card>
              <CardHeader>
                <CardTitle>Order Information</CardTitle>
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

                <div>
                  <p className="text-sm font-medium">Order Date</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(order.created_at).toLocaleString()}
                  </p>
                </div>

                {order.confirmed_at && (
                  <div>
                    <p className="text-sm font-medium">Confirmed At</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(order.confirmed_at).toLocaleString()}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Assigned Rider Card */}
            {assignedRider && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    Assigned Rider
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div>
                    <p className="font-medium">{assignedRider.profiles.full_name}</p>
                    <p className="text-sm text-muted-foreground">{assignedRider.profiles.phone}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Additional Charges Card */}
            <AdditionalCharges
              orderId={order.id}
              currentCharges={order.additional_charges}
              currentDescription={order.charges_description}
              onUpdate={fetchOrderDetails}
            />

            {/* Order Items Approval */}
            <OrderItemApproval
              items={orderItems}
              onUpdate={fetchOrderDetails}
            />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ManagerOrderDetails;
