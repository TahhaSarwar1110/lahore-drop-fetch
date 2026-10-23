import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { RiderRatingFor } from "@/components/RiderRating";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, User, UserPlus, Ban } from "lucide-react";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { canCancelManagerOrder } from "@/utils/orderCancellation";
import { toast } from "sonner";
import { OrderItemApproval } from "@/components/manager/OrderItemApproval";
import { AdditionalCharges } from "@/components/manager/AdditionalCharges";
import { PaymentVerification } from "@/components/manager/PaymentVerification";
import { ExpenseReview } from "@/components/manager/ExpenseReview";
import { RefundManager } from "@/components/manager/RefundManager";
import { DeliveryChargesInput } from "@/components/manager/DeliveryChargesInput";
import { DeliveryPaymentConfirmation } from "@/components/manager/DeliveryPaymentConfirmation";
import { hasVerifiedOrderPayment, isFinanciallySettled, canMarkReadyForDelivery, getSettlementTotal } from "@/utils/orderFinancials";
import { StorageImage } from "@/components/StorageImage";
import { sendNotificationEmail } from "@/utils/notificationHelper";
import { triggerNotification } from "@/utils/notify";
import { sendWhatsAppNotification } from "@/utils/whatsappNotification";
import { WHATSAPP_TEMPLATES } from "@/utils/whatsappTemplates";

interface OrderItem {
  id: string;
  item_type: string;
  item_data: any;
  approval_status: string;
  manager_feedback: string | null;
  approved_by: string | null;
  approved_at: string | null;
  image_url: string | null;
  manager_price_pkr?: number | null;
}

interface Order {
  id: string;
  delivery_address: string;
  delivery_type: string;
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
  order_total_pkr: number | null;
  paid_amount_pkr: number;
  payment_verification: string;
  payment_rejection_reason: string | null;
  shopping_expense_pkr: number | null;
  expense_status: string | null;
  expense_notes: string | null;
  expense_submitted_at: string | null;
  expense_rejection_reason: string | null;
  customer_balance_pkr: number | null;
  refund_status: string;
  refund_method: string | null;
  refund_reference: string | null;
  refund_notes: string | null;
  refund_proof_url: string | null;
  refund_account_bank: string | null;
  refund_account_title: string | null;
  refund_account_number: string | null;
  ready_for_delivery_at: string | null;
  delivery_proof_url: string | null;
  delivered_at: string | null;
  total_weight_kg: number | null;
  delivery_charges: number;
  delivery_charges_set_at: string | null;
  delivery_payment_status: string;
  delivery_payment_proof_url: string | null;
  delivery_payment_proof_name: string | null;
  delivery_payment_submitted_at: string | null;
  delivery_payment_confirmed_at: string | null;
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
  const [isManager, setIsManager] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

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

      setIsManager(roles.some(role => role.role === "manager"));
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
      "Ready for Delivery": "bg-emerald-600",
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
    if (!order) return false;
    return hasVerifiedOrderPayment(order.order_total_pkr, order.paid_amount_pkr, order.payment_verification, order.payment_status, Number(order.delivery_charges || 0));
  };

  const canAssignRider = () => {
    return order?.status !== "Cancelled" && allItemsApproved() && order?.confirmed_at && isPaymentConfirmed();
  };

  // Order flow: items reviewed -> order confirmed -> payment verified
  const allPricesSet = () => orderItems.every(item => item.approval_status !== 'approved' || item.manager_price_pkr != null);

  const canConfirmOrder = () => {
    return allItemsApproved() && allPricesSet();
  };

  const [markingReady, setMarkingReady] = useState(false);
  const handleMarkReady = async () => {
    try {
      setMarkingReady(true);
      const { error } = await supabase.rpc("mark_ready_for_delivery", { p_order_id: orderId as string });
      if (error) throw error;
      void triggerNotification({ event_type: "ready_for_delivery", order_id: orderId });
      toast.success("Order marked Ready for Delivery — the rider can now deliver");
      fetchOrderDetails();
    } catch (error: any) {
      toast.error(error?.message || "Failed to mark ready for delivery");
    } finally {
      setMarkingReady(false);
    }
  };

  const handleConfirmOrder = async () => {
    if (!canConfirmOrder()) {
      toast.error("Cannot confirm order until all items are approved.");
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
        await triggerNotification({
          event_type: "order_confirmed",
          order_id: orderId,
        });

        await sendNotificationEmail({
          userId: order.user_id,
          title: "Order Confirmed",
          message: `Your order has been confirmed by the manager. You can now track its progress.`,
          orderLink: `${window.location.origin}/order-details?orderId=${orderId}`,
        });

        await sendWhatsAppNotification({
          userId: order.user_id,
          templateName: WHATSAPP_TEMPLATES.orderConfirmed.name,
          templateLanguage: WHATSAPP_TEMPLATES.orderConfirmed.language,
          templateParams: [orderId.slice(0, 8)],
          message: `Tabedaar.com: Your order #${orderId.slice(0, 8)} has been confirmed by our manager. You can track its progress in the app.`,
        });
      }

      toast.success("Order confirmed successfully!");
      fetchOrderDetails();
    } catch (error) {
      console.error("Error confirming order:", error);
      toast.error((error as any)?.message || "Failed to confirm order");
    }
  };

  const handleCancelOrder = async () => {
    if (!order || !canCancelManagerOrder(order.status, isManager) || cancelling) return;
    setCancelling(true);
    try {
      const { error } = await supabase.rpc("manager_cancel_order", { p_order_id: order.id });
      if (error) throw error;
      setCancelOpen(false);
      await triggerNotification({ event_type: "order_cancelled", order_id: order.id });
      toast.success("Order cancelled successfully");
      await fetchOrderDetails();
    } catch (error: any) {
      toast.error(error?.message || "Failed to cancel order");
    } finally {
      setCancelling(false);
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
            
            <div className="flex flex-wrap gap-4 justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold">Order Details</h1>
                <p className="text-muted-foreground mt-1">Order #{order.id.slice(0, 8)}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={getStatusColor(order.status)}>
                  {order.status}
                </Badge>
                {canCancelManagerOrder(order.status, isManager) && (
                  <Button variant="destructive" onClick={() => setCancelOpen(true)}>
                    <Ban className="h-4 w-4 mr-2" />
                    Cancel Order
                  </Button>
                )}
                {!order.confirmed_at && order.status === "Pending" && (
                  <Button 
                    onClick={handleConfirmOrder}
                    disabled={!canConfirmOrder()}
                    variant={!canConfirmOrder() ? "outline" : "default"}
                  >
                    {hasRejectedItems() 
                      ? "Resolve Rejected Items First"
                      : !allItemsApproved()
                      ? "Review Items First"
                      : !allPricesSet()
                      ? "Set Item Prices First"
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

          {order.status !== "Cancelled" && order.confirmed_at && !isPaymentConfirmed() && !order.order_assignments?.rider_id && (
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

          {order.status !== "Cancelled" && order.confirmed_at && isPaymentConfirmed() && !order.order_assignments?.rider_id && (
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

            {/* Payment Verification - only after the order is confirmed */}
            {order.confirmed_at && (
            <PaymentVerification
              orderId={order.id}
              orderTotal={order.order_total_pkr ?? 0}
              paidAmount={order.paid_amount_pkr ?? 0}
              verification={order.payment_verification || "pending"}
              rejectionReason={order.payment_rejection_reason}
              paymentProofUrl={order.payment_proof_url}
              paymentProofName={order.payment_proof_name}
              paymentSubmittedAt={order.payment_submitted_at}
              shoppingExpense={order.shopping_expense_pkr}
              expenseStatus={order.expense_status}
              bundleCharges={Number(order.additional_charges || 0)}
              deliveryCharges={Number(order.delivery_charges || 0)}
              chargesDescription={order.charges_description}
              onUpdate={fetchOrderDetails}
            />
            )}

            {/* Rider shopping expense review */}
            {order.order_assignments?.rider_id && (
              <ExpenseReview
                orderId={order.id}
                expenseAmount={order.shopping_expense_pkr}
                expenseStatus={order.expense_status}
                expenseNotes={order.expense_notes}
                expenseSubmittedAt={order.expense_submitted_at}
                rejectionReason={order.expense_rejection_reason}
                onUpdate={fetchOrderDetails}
              />
            )}

            {/* Refund management when the customer overpaid */}
            {order.customer_balance_pkr !== null && order.customer_balance_pkr > 0 && (
              <RefundManager
                orderId={order.id}
                balance={order.customer_balance_pkr}
                refundStatus={order.refund_status || "pending"}
                refundMethod={order.refund_method}
                refundReference={order.refund_reference}
                refundNotes={order.refund_notes}
                refundProofUrl={order.refund_proof_url}
                refundAccount={{ bank: order.refund_account_bank, title: order.refund_account_title, number: order.refund_account_number }}
                onUpdate={fetchOrderDetails}
              />
            )}

            {/* Financial settlement indicator — rider delivery is blocked until settled */}
            {order.status !== "Cancelled" && order.expense_status && (
              <Card className={isFinanciallySettled(order.expense_status, order.customer_balance_pkr, order.refund_status) ? "border-green-500 bg-green-500/5" : "border-yellow-500 bg-yellow-500/5"}>
                <CardContent className="p-4 space-y-1">
                  <p className="text-sm font-medium break-words">
                    {isFinanciallySettled(order.expense_status, order.customer_balance_pkr, order.refund_status)
                      ? order.ready_for_delivery_at ? "✅ Payment settled — released for delivery" : "✅ Payment settled — mark the order Ready for Delivery"
                      : order.expense_status !== "verified"
                      ? "⏳ Verify the rider's shopping expense first"
                      : (order.customer_balance_pkr ?? 0) < 0
                      ? `⏳ Customer owes Rs. ${Math.abs(order.customer_balance_pkr ?? 0).toLocaleString()} — delivery on hold`
                      : `💸 Refund Rs. ${(order.customer_balance_pkr ?? 0).toLocaleString()} to the customer with proof — the rider can deliver meanwhile`}
                  </p>
                  {canMarkReadyForDelivery(order.expense_status, order.customer_balance_pkr, order.refund_status) && (
                    order.ready_for_delivery_at ? (
                      <p className="text-sm text-green-700 dark:text-green-300">
                        🚚 Ready for Delivery since {new Date(order.ready_for_delivery_at).toLocaleString()}
                      </p>
                    ) : (
                      <Button className="mt-2" onClick={handleMarkReady} disabled={markingReady}>
                        Mark Ready for Delivery
                      </Button>
                    )
                  )}
                  {order.expense_status === "verified" && (order.customer_balance_pkr ?? 0) < 0 && (
                    <p className="text-xs text-muted-foreground">
                      Verify only the new top-up amount. The total verified payments must cover Rs. {getSettlementTotal(order.shopping_expense_pkr ?? 0, Number(order.additional_charges || 0), Number(order.delivery_charges || 0)).toLocaleString()}, including delivery/service charges.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {order.delivery_proof_url && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Delivery Proof</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <StorageImage bucket="pickup-proofs" src={order.delivery_proof_url} alt="Delivery proof" className="max-h-64 rounded-md border object-cover" />
                  {order.delivered_at && (
                    <p className="text-xs text-muted-foreground">Delivered {new Date(order.delivered_at).toLocaleString()}</p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Delivery Charges (out-of-city / out-of-country only) */}
            {order.status !== "Cancelled" && order.confirmed_at && order.delivery_type !== "within_city" && isPaymentConfirmed() && (
              <DeliveryChargesInput
                orderId={order.id}
                userId={order.user_id}
                deliveryType={order.delivery_type}
                totalWeightKg={order.total_weight_kg}
                deliveryCharges={Number(order.delivery_charges || 0)}
                deliveryChargesSetAt={order.delivery_charges_set_at}
                deliveryPaymentStatus={order.delivery_payment_status || "pending"}
                onUpdate={fetchOrderDetails}
              />
            )}

            {/* Delivery Payment verification */}
            {order.order_total_pkr == null && order.delivery_type !== "within_city" && order.delivery_charges_set_at && (
              <DeliveryPaymentConfirmation
                orderId={order.id}
                userId={order.user_id}
                deliveryPaymentStatus={order.delivery_payment_status || "pending"}
                deliveryPaymentProofUrl={order.delivery_payment_proof_url}
                deliveryPaymentProofName={order.delivery_payment_proof_name}
                deliveryPaymentSubmittedAt={order.delivery_payment_submitted_at}
                deliveryPaymentConfirmedAt={order.delivery_payment_confirmed_at}
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
                    <RiderRatingFor riderId={assignedRider.rider_id} className="mt-1" />
                  </div>
                ) : order.status === "Cancelled" ? (
                  <p className="text-sm text-muted-foreground">No rider assigned — order cancelled</p>
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
            {order.status !== "Cancelled" && <AdditionalCharges
              orderId={order.id}
              currentCharges={order.additional_charges}
              currentDescription={order.charges_description}
              onUpdate={fetchOrderDetails}
            />}

            {/* Order Items Approval - Only editable before order is confirmed */}
            <OrderItemApproval
              items={orderItems}
              orderId={order.id}
              onUpdate={fetchOrderDetails}
              isLocked={!!order.confirmed_at || order.status === "Cancelled"}
            />
          </div>
        </div>
      </main>

      <AlertDialog open={cancelOpen} onOpenChange={open => { if (!cancelling) setCancelOpen(open); }}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel order #{order.id.slice(0, 8)}?</AlertDialogTitle>
            <AlertDialogDescription>
              This stops the order, including any assigned rider’s delivery. Existing payments, purchase proofs and refund records will be kept. Cancelling does not automatically refund the customer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <Button variant="outline" disabled={cancelling} onClick={() => setCancelOpen(false)}>Keep Order</Button>
            <Button variant="destructive" loading={cancelling} disabled={cancelling} onClick={handleCancelOrder}>Confirm Cancellation</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Footer />
    </div>
  );
};

export default ManagerOrderDetails;
