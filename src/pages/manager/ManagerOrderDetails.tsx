import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, User, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { OrderItemApproval } from "@/components/manager/OrderItemApproval";
import { AdditionalCharges } from "@/components/manager/AdditionalCharges";
import { PaymentConfirmation } from "@/components/manager/PaymentConfirmation";
import { createNotification, sendNotificationEmail } from "@/utils/notificationHelper";

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
  payment_status: string;
  payment_proof_url: string | null;
  payment_proof_name: string | null;
  payment_submitted_at: string | null;
  payment_confirmed_at: string | null;
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
      
      // Fetch order details with customer profile
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select(`
          *,
          profiles!fk_user (
            full_name,
            phone
          )
        `)
        .eq("id", orderId)
        .single();

      if (orderError) throw orderError;

      // Fetch rider assignment separately with rider profile
      const { data: assignmentData } = await supabase
        .from("order_assignments")
        .select(`
          rider_id,
          profiles!order_assignments_rider_id_fkey (
            full_name,
            phone
          )
        `)
        .eq("order_id", orderId)
        .maybeSingle();

      // Transform the data
      const transformedOrder = {
        ...orderData,
        profiles: Array.isArray(orderData.profiles) ? orderData.profiles[0] : orderData.profiles,
        order_assignments: assignmentData
      };

      console.log("Transformed order with assignment:", transformedOrder);
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
      "Order Confirmed": "bg-blue-500",
      "Order Received": "bg-blue-500",
      "Shopper Assigned": "bg-purple-500",
      "Purchasing": "bg-orange-500",
      "In Delivery": "bg-cyan-500",
      "Delivered": "bg-green-500",
    };
    return colors[status] || "bg-gray-500";
  };

  const hasRejectedItems = () => {
    return orderItems.some(item => item.approval_status === 'rejected');
  };

  const allItemsApproved = () => {
    return orderItems.length > 0 && orderItems.every(item => item.approval_status === 'approved');
  };

  const isPaymentConfirmed = () => {
    return order?.payment_status === 'confirmed';
  };

  const canAssignRider = () => {
    return allItemsApproved() && order?.confirmed_at && isPaymentConfirmed();
  };

  const canConfirmOrder = () => {
    return allItemsApproved();
  };

  const handleConfirmOrder = async () => {
    if (!canConfirmOrder()) {
      if (hasRejectedItems()) {
        toast.error("Cannot confirm order with rejected items. Please ensure all items are approved.");
      }
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("orders")
        .update({
          confirmed_at: new Date().toISOString(),
          confirmed_by: user.id,
          status: "Order Confirmed"
        })
        .eq("id", orderId);

      if (error) throw error;

      // Create notification for customer
      if (order) {
        await createNotification({
          userId: order.user_id,
          title: "Order Confirmed",
          message: `Your order has been confirmed by the manager. You can now track its progress.`,
          type: "order_confirmed",
          orderId: orderId,
        });

        // Send email notification
        const { data: customerProfile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", order.user_id)
          .single();

        const { data: { user: customerUser } } = await supabase.auth.admin.getUserById(order.user_id);
        
        if (customerUser?.email && customerProfile) {
          await sendNotificationEmail(
            customerUser.email,
            customerProfile.full_name,
            "Order Confirmed",
            `Your order has been confirmed by the manager. You can now track its progress.`,
            `${window.location.origin}/order-details?orderId=${orderId}`
          );
        }
      }

      toast.success("Order confirmed successfully!");
      fetchOrderDetails();
    } catch (error) {
      console.error("Error confirming order:", error);
      toast.error("Failed to confirm order");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
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
        <Header />
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
      <Header />

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
              <div className="flex items-center gap-2">
                <Badge className={getStatusColor(order.status)}>
                  {order.status}
                </Badge>
                {!order.confirmed_at && order.status === "Pending" && (
                  <Button 
                    onClick={handleConfirmOrder}
                    disabled={!canConfirmOrder()}
                    variant={!canConfirmOrder() ? "outline" : "default"}
                  >
                    {hasRejectedItems() 
                      ? "Resolve Rejected Items First" 
                      : "Confirm Order"}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {!order.confirmed_at && order.status === "Pending" && !allItemsApproved() && (
            <Card className="mb-6 border-destructive bg-destructive/5">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <h3 className="text-destructive font-semibold mb-2">Order Workflow Status</h3>
                    <div className="space-y-2">
                      <p className="text-sm">
                        <strong>Step 1:</strong> Approve all items first
                      </p>
                      <p className="text-sm text-muted-foreground ml-4">
                        {hasRejectedItems() 
                          ? "❌ This order has rejected items. All items must be approved before proceeding."
                          : "⏳ Some items are still pending approval. Please review and approve all items."}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {order.confirmed_at && !isPaymentConfirmed() && !order.order_assignments?.rider_id && (
            <Card className="mb-6 border-yellow-500 bg-yellow-500/5">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">💳</span>
                  <div>
                    <h3 className="text-yellow-700 dark:text-yellow-400 font-semibold mb-2">Waiting for Payment</h3>
                    <p className="text-sm text-muted-foreground">
                      Order is confirmed. Rider can only be assigned after payment is verified.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {order.confirmed_at && isPaymentConfirmed() && !order.order_assignments?.rider_id && (
            <Card className="mb-6 border-green-500 bg-green-500/5">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">✅</span>
                  <div>
                    <h3 className="text-green-700 dark:text-green-400 font-semibold mb-2">Ready to Assign Rider</h3>
                    <p className="text-sm text-muted-foreground">
                      Payment confirmed. Please assign a rider to proceed with delivery.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

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

            {/* Payment Confirmation Card - Show after order is confirmed */}
            {order.confirmed_at && (
              <PaymentConfirmation
                orderId={order.id}
                userId={order.user_id}
                paymentStatus={order.payment_status || "pending"}
                paymentProofUrl={order.payment_proof_url}
                paymentProofName={order.payment_proof_name}
                paymentSubmittedAt={order.payment_submitted_at}
                paymentConfirmedAt={order.payment_confirmed_at}
                assignedRiderId={order.order_assignments?.rider_id}
                onUpdate={fetchOrderDetails}
              />
            )}

            {/* Assigned Rider Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  Assigned Rider
                  {assignedRider && (
                    <Badge variant="outline" className="ml-2">Assigned</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {assignedRider ? (
                  <div>
                    <p className="font-medium">{assignedRider.profiles.full_name}</p>
                    <p className="text-sm text-muted-foreground">{assignedRider.profiles.phone}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {!canAssignRider() ? (
                      <div className="text-center py-4 px-4 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">
                          {!allItemsApproved()
                            ? hasRejectedItems()
                              ? "Please approve all items before assigning a rider"
                              : "Please review and approve all items before assigning a rider"
                            : !order?.confirmed_at
                            ? "Please confirm the order before assigning a rider"
                            : "Payment must be verified before assigning a rider"}
                        </p>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-muted-foreground">No rider assigned yet</p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/manager/assign-rider/${order.id}`)}
                        >
                          <UserPlus className="h-4 w-4 mr-1" />
                          Assign Rider
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Additional Charges Card */}
            <AdditionalCharges
              orderId={order.id}
              currentCharges={order.additional_charges}
              currentDescription={order.charges_description}
              onUpdate={fetchOrderDetails}
            />

            {/* Order Items Approval - Only editable before order is confirmed */}
            <OrderItemApproval
              items={orderItems}
              orderId={order.id}
              onUpdate={fetchOrderDetails}
              isLocked={!!order.confirmed_at}
            />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ManagerOrderDetails;
