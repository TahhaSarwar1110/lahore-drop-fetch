import { getPickupProofs } from "@/utils/pickupProofs";
import { StorageImage } from "@/components/StorageImage";
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { OrderItemForm, OrderItem as FormOrderItem } from "@/components/OrderItemForm";
import { PaymentUpload } from "@/components/customer/PaymentUpload";
import { PaymentSummary } from "@/components/customer/PaymentSummary";
import { DeliveryPaymentUpload } from "@/components/customer/DeliveryPaymentUpload";
import { RiderContactDialog } from "@/components/customer/RiderContactDialog";
import { supabase } from "@/integrations/supabase/client";
import { RiderRatingBadge, RiderReviewForm, useRiderRating } from "@/components/RiderRating";
import { ArrowLeft, Trash2, Plus, Save, User } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { getItemTotalPrice } from "@/utils/orderPricing";
import { RefundAccountForm } from "@/components/customer/RefundAccountForm";

interface OrderItem {
  id: string;
  item_type: string;
  item_data: Record<string, string>;
  image_url: string | null;
  approval_status: string | null;
  manager_feedback: string | null;
  approved_at: string | null;
  manager_price_pkr: number | null;
}

interface ItemPickup {
  order_item_id: string;
  picked_at: string | null;
  actual_paid_pkr: number | null;
  pickup_proof_url: string | null;
  receipt_url: string | null;
  proof_files?: unknown;
  not_available?: boolean;
  unavailable_reason?: string | null;
}

interface Order {
  id: string;
  delivery_address: string;
  delivery_type: string;
  status: string;
  created_at: string;
  confirmed_at: string | null;
  payment_status: string;
  payment_proof_url: string | null;
  payment_submitted_at: string | null;
  payment_confirmed_at: string | null;
  additional_charges: number | null;
  order_total_pkr: number | null;
  paid_amount_pkr: number;
  customer_submitted_amount_pkr: number;
  payment_verification: string;
  payment_rejection_reason: string | null;
  shopping_expense_pkr: number | null;
  expense_status: string | null;
  customer_balance_pkr: number | null;
  refund_status: string;
  refund_proof_url: string | null;
  refund_account_bank: string | null;
  refund_account_title: string | null;
  refund_account_number: string | null;
  delivery_proof_url: string | null;
  delivered_at: string | null;
  total_weight_kg: number | null;
  delivery_charges: number;
  delivery_charges_set_at: string | null;
  delivery_payment_status: string;
  delivery_payment_proof_url: string | null;
  delivery_payment_submitted_at: string | null;
  delivery_payment_confirmed_at: string | null;
  order_items: OrderItem[];
  order_assignments?: {
    rider_id: string;
    profiles: {
      full_name: string;
      phone: string;
    };
  } | null;
}

const OrderDetails = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("orderId");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItems, setNewItems] = useState<FormOrderItem[]>([]);
  const [itemsToRemove, setItemsToRemove] = useState<string[]>([]);
  const [pickups, setPickups] = useState<ItemPickup[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/login");
      } else {
        setIsAuthenticated(true);
        if (orderId) {
          loadOrder(orderId, session.user.id);
        }
      }
    });
  }, [navigate, orderId]);

  const loadOrder = async (orderIdParam: string, userId: string) => {
    setLoading(true);
    
    // First fetch the order data
    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .select(`
        id,
        delivery_address,
        delivery_type,
        status,
        created_at,
        confirmed_at,
        payment_status,
        payment_proof_url,
        payment_submitted_at,
        payment_confirmed_at,
        additional_charges,
        order_total_pkr,
        paid_amount_pkr,
        customer_submitted_amount_pkr,
        payment_verification,
        payment_rejection_reason,
        shopping_expense_pkr,
        expense_status,
        customer_balance_pkr,
        refund_status,
        refund_proof_url,
        refund_account_bank,
        refund_account_title,
        refund_account_number,
        delivery_proof_url,
        delivered_at,
        total_weight_kg,
        delivery_charges,
        delivery_charges_set_at,
        delivery_payment_status,
        delivery_payment_proof_url,
        delivery_payment_submitted_at,
        delivery_payment_confirmed_at,
        order_items (
          id,
          item_type,
          item_data,
          image_url,
          approval_status,
          manager_feedback,
          approved_at,
          manager_price_pkr
        )
      `)
      .eq("id", orderIdParam)
      .eq("user_id", userId)
      .single();

    if (orderError) {
      console.error("Error loading order:", orderError);
      toast.error("Failed to load order");
      navigate("/order-history");
      return;
    }

    const itemIds = (orderData?.order_items ?? []).map((i: { id: string }) => i.id);
    if (itemIds.length) {
      const { data: pickupData } = await supabase
        .from("item_pickups")
        .select("order_item_id, picked_at, actual_paid_pkr, pickup_proof_url, pickup_proof_name, receipt_url, receipt_name, proof_files, not_available, unavailable_reason")
        .in("order_item_id", itemIds);
      setPickups(pickupData ?? []);
    } else {
      setPickups([]);
    }

    // Fetch assignment separately
    const { data: assignmentData } = await supabase
      .from("order_assignments")
      .select("rider_id")
      .eq("order_id", orderIdParam)
      .maybeSingle();

    let riderProfile = null;
    if (assignmentData?.rider_id) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", assignmentData.rider_id)
        .single();
      
      if (profileData) {
        riderProfile = {
          rider_id: assignmentData.rider_id,
          profiles: profileData
        };
      }
    }

    const transformedOrder = {
      ...orderData,
      order_assignments: riderProfile
    };
    
    setOrder(transformedOrder as Order);
    setLoading(false);
  };

  const handleRemoveItem = (itemId: string) => {
    setItemsToRemove([...itemsToRemove, itemId]);
  };

  const handleAddNewItem = (item: FormOrderItem) => {
    setNewItems([...newItems, item]);
    setShowAddItem(false);
    toast.success("Item added to changes");
  };

  const handleSaveChanges = async () => {
    try {
      // Remove items marked for deletion
      if (itemsToRemove.length > 0) {
        const { error: deleteError } = await supabase
          .from("order_items")
          .delete()
          .in("id", itemsToRemove);

        if (deleteError) throw deleteError;
      }

      // Add new items
      if (newItems.length > 0) {
        const itemsToInsert = newItems.map((item) => ({
          order_id: orderId,
          item_type: item.itemType,
          item_data: item.itemData,
          image_url: item.imageUrl || null,
          approval_status: "pending",
        }));

        const { error: insertError } = await supabase
          .from("order_items")
          .insert(itemsToInsert);

        if (insertError) throw insertError;
      }

      toast.success("Order updated successfully");
      
      // Reload order
      const { data: { user } } = await supabase.auth.getUser();
      if (user && orderId) {
        setItemsToRemove([]);
        setNewItems([]);
        loadOrder(orderId, user.id);
      }
    } catch (error) {
      console.error("Error saving changes:", error);
      toast.error("Failed to save changes");
    }
  };

  const hasChanges = itemsToRemove.length > 0 || newItems.length > 0;

  const getFilteredItems = () => {
    if (!order) return [];
    return order.order_items.filter(item => !itemsToRemove.includes(item.id));
  };

  const hasRejectedItems = () => {
    return order?.order_items?.some(
      (item) => item.approval_status === 'rejected' && !itemsToRemove.includes(item.id)
    ) || false;
  };

  const calculateTotal = () => {
    const approvedItems = getFilteredItems().filter(
      (item) => item.approval_status === 'approved'
    );
    const approvedTotal = approvedItems.reduce(
      (sum, item) => sum + (item.manager_price_pkr ?? getItemTotalPrice(item.item_data as Record<string, string>)),
      0
    );
    const newItemsTotal = newItems.reduce(
      (sum, item) => sum + getItemTotalPrice(item.itemData),
      0
    );
    return approvedTotal + newItemsTotal;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 py-12">
          <div className="container mx-auto px-4">
            <p className="text-center text-muted-foreground">Loading order...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 py-12">
          <div className="container mx-auto px-4">
            <p className="text-center text-muted-foreground">Order not found</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="mb-6">
            <Button variant="outline" onClick={() => navigate("/order-history")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Orders
            </Button>
          </div>

          {hasRejectedItems() && (
            <Card className="mb-6 border-destructive bg-destructive/5">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <h3 className="text-destructive font-semibold mb-2">Order Update Required</h3>
                    <p className="text-sm mb-2">
                      Your order has some rejected items that need attention. Please:
                    </p>
                    <ul className="list-disc list-inside text-sm space-y-1 ml-2 mb-3">
                      <li>Remove the rejected items from your order, or</li>
                      <li>Replace them with new items, or</li>
                      <li>Contact our customer service for assistance</li>
                    </ul>
                    <p className="text-sm font-medium text-destructive">
                      Note: Rejected items are not included in the total bill calculation.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">Order Details</h1>
                <p className="text-muted-foreground mt-1">
                  Order #{order.id.slice(0, 8)} - {format(new Date(order.created_at), "PPP")}
                </p>
              </div>
              <Badge className={order.status === "Pending" ? "bg-yellow-500" : "bg-green-500"}>
                {order.status}
              </Badge>
            </div>
            <div className="mt-2 space-y-1">
              <p className="text-sm text-muted-foreground">
                Delivery Address: {order.delivery_address}
              </p>
              {calculateTotal() > 0 && (
                <p className="text-sm font-medium">
                  Order Total: <span className="text-primary text-lg">PKR {calculateTotal().toLocaleString()}</span>
                </p>
              )}
            </div>
          </div>

          {/* Payment Summary - visible as soon as the order has a total */}
          {order.order_total_pkr !== null && (
            <div className="mb-6">
              <PaymentSummary
                orderTotal={order.order_total_pkr}
                paidAmount={order.paid_amount_pkr ?? 0}
                submittedAmount={order.customer_submitted_amount_pkr ?? 0}
                paymentVerification={order.payment_verification || "pending"}
                paymentRejectionReason={order.payment_rejection_reason}
                shoppingExpense={order.shopping_expense_pkr}
                expenseStatus={order.expense_status}
                customerBalance={order.customer_balance_pkr}
                refundStatus={order.refund_status || "none"}
                bundleCharges={Number(order.additional_charges || 0)}
                deliveryCharges={Number(order.delivery_charges || 0)}
              />
            </div>
          )}

          {/* Assigned Rider Card */}
          {order.order_assignments && (
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Delivery Rider</p>
                    <RiderContactDialog
                      riderName={order.order_assignments.profiles.full_name}
                      riderPhone={order.order_assignments.profiles.phone}
                    >
                      <Button variant="link" className="font-semibold h-auto p-0">
                        {order.order_assignments.profiles.full_name}
                      </Button>
                    </RiderContactDialog>
                    <RiderRatingBadge summary={riderRating.summary} className="block" />
                    <p className="text-xs text-muted-foreground">Click name for contact details</p>
                  </div>
                </div>
                {order.status === "Delivered" && (
                  <RiderReviewForm orderId={order.id} onSaved={riderRating.reload} />
                )}
              </CardContent>
            </Card>
          )}

          {/* Payment Section - available right after placement so the manager can verify payment before approval */}
          {(order.confirmed_at || order.order_total_pkr !== null) && (
            <div className="mb-6">
              <PaymentUpload
                orderId={order.id}
                paymentStatus={order.payment_status || "pending"}
                paymentProofUrl={order.payment_proof_url}
                submittedAmount={order.customer_submitted_amount_pkr ?? 0}
                paymentSubmittedAt={order.payment_submitted_at}
                paymentConfirmedAt={order.payment_confirmed_at}
                amountDue={order.expense_status === "verified" && (order.customer_balance_pkr ?? 0) < 0 ? -(order.customer_balance_pkr as number) : 0}
                onUpdate={() => {
                  supabase.auth.getUser().then(({ data: { user } }) => {
                    if (user && orderId) loadOrder(orderId, user.id);
                  });
                }}
              />
            </div>
          )}

          {order.expense_status === "verified" && (order.customer_balance_pkr ?? 0) > 0 && (
            <div className="mb-6">
              <RefundAccountForm
                orderId={order.id}
                refundDue={order.customer_balance_pkr as number}
                refundStatus={order.refund_status || "pending"}
                bank={order.refund_account_bank}
                title={order.refund_account_title}
                number={order.refund_account_number}
                refundProofUrl={order.refund_proof_url}
                onUpdate={() => {
                  supabase.auth.getUser().then(({ data: { user } }) => {
                    if (user && orderId) loadOrder(orderId, user.id);
                  });
                }}
              />
            </div>
          )}

          {order.delivery_proof_url && (
            <Card className="mb-6">
              <CardContent className="p-4 space-y-2">
                <p className="font-semibold">Delivery Proof</p>
                <StorageImage bucket="pickup-proofs" src={order.delivery_proof_url} alt="Delivery proof" className="max-h-64 rounded-md border object-cover" />
                {order.delivered_at && (
                  <p className="text-xs text-muted-foreground">Delivered {format(new Date(order.delivered_at), "PPp")}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Delivery Charges (out-of-city/country only, after manager has set them) */}
          {order.order_total_pkr == null && order.delivery_type && order.delivery_type !== "within_city" && order.delivery_charges_set_at && (
            <div className="mb-6">
              <DeliveryPaymentUpload
                orderId={order.id}
                totalWeightKg={order.total_weight_kg}
                deliveryCharges={Number(order.delivery_charges || 0)}
                deliveryPaymentStatus={order.delivery_payment_status || "pending"}
                deliveryPaymentProofUrl={order.delivery_payment_proof_url}
                deliveryPaymentSubmittedAt={order.delivery_payment_submitted_at}
                deliveryPaymentConfirmedAt={order.delivery_payment_confirmed_at}
                onUpdate={() => {
                  supabase.auth.getUser().then(({ data: { user } }) => {
                    if (user && orderId) loadOrder(orderId, user.id);
                  });
                }}
              />
            </div>
          )}

          {/* Awaiting-charges notice */}
          {order.delivery_type && order.delivery_type !== "within_city" && !order.delivery_charges_set_at && order.confirmed_at && (
            <Card className="mb-6 border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800">
              <CardContent className="p-4">
                <p className="text-sm text-amber-900 dark:text-amber-200">
                  <span className="font-semibold">Delivery charges pending:</span> Once we purchase and weigh your goods, our manager will share the delivery charges here. You'll then be prompted to pay before dispatch.
                </p>
              </CardContent>
            </Card>
          )}

          {hasChanges && (
            <Card className="mb-6 border-primary">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">Unsaved Changes</p>
                    <p className="text-sm text-muted-foreground">
                      {itemsToRemove.length > 0 && `${itemsToRemove.length} item(s) to remove`}
                      {itemsToRemove.length > 0 && newItems.length > 0 && ", "}
                      {newItems.length > 0 && `${newItems.length} new item(s) to add`}
                    </p>
                  </div>
                  <Button onClick={handleSaveChanges}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-4 mb-6">
            <h2 className="text-xl font-semibold">Order Items</h2>
            {getFilteredItems().map((item) => (
              <Card key={item.id} className={itemsToRemove.includes(item.id) ? "opacity-50" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-semibold text-primary text-lg">
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
                  
                  <div className="space-y-1 text-sm mb-3">
                    {Object.entries(item.item_data).map(([key, value]) => (
                      <p key={key} className="text-muted-foreground">
                        <span className="font-medium text-foreground">{key}:</span> {value}
                      </p>
                    ))}
                  </div>

                  {item.image_url && (
                    <StorageImage bucket="order-images"
                      src={item.image_url}
                      alt="Item"
                      className="mt-3 rounded-lg max-h-48 object-cover"
                    />
                  )}

                  {(() => {
                    const pk = pickups.find((p) => p.order_item_id === item.id);
                    return (
                      <>
                        {(item.manager_price_pkr != null || pk?.actual_paid_pkr != null) && (
                          <div className="mt-3 grid gap-1 text-sm rounded-lg border p-3">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Your expected price</span>
                              <span>PKR {getItemTotalPrice(item.item_data).toLocaleString()}</span>
                            </div>
                            {item.manager_price_pkr != null && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Verified price</span>
                                <span className="font-semibold text-primary">PKR {item.manager_price_pkr.toLocaleString()}</span>
                              </div>
                            )}
                            {pk?.actual_paid_pkr != null && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Actual paid at shop</span>
                                <span className="font-semibold">PKR {pk.actual_paid_pkr.toLocaleString()}</span>
                              </div>
                            )}
                          </div>
                        )}
                        {pk?.not_available && (
                          <p className="mt-3 text-sm text-destructive break-words">Not available at the shop{pk.unavailable_reason ? `: ${pk.unavailable_reason}` : ""} — charged Rs. 0</p>
                        )}
                        {getPickupProofs(pk).length > 0 && (
                          <div className="mt-3">
                            <p className="text-sm font-medium mb-1">Shopping Proof</p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {getPickupProofs(pk).map((f, i) => (
                                <StorageImage key={f.path} bucket="pickup-proofs" src={f.path} alt={`Proof ${i + 1}`} className="h-32 w-full rounded-md border object-cover" />
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}

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

                  {item.approval_status === "rejected" && order.status === "Pending" && !order.confirmed_at && (
                    <div className="mt-3">
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
                              This will mark this item for removal. Click "Save Changes" to confirm.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleRemoveItem(item.id)}>
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {newItems.map((item, index) => (
              <Card key={`new-${index}`} className="border-primary">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-semibold text-primary text-lg">
                      {item.itemType} <Badge variant="secondary">New</Badge>
                    </p>
                  </div>
                  
                  <div className="space-y-1 text-sm">
                    {Object.entries(item.itemData).map(([key, value]) => (
                      <p key={key} className="text-muted-foreground">
                        <span className="font-medium text-foreground">{key}:</span> {value}
                      </p>
                    ))}
                  </div>

                  {item.imageUrl && (
                    <StorageImage bucket="order-images"
                      src={item.imageUrl}
                      alt="Item"
                      className="mt-3 rounded-lg max-h-48 object-cover"
                    />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {order.status === "Pending" && !order.confirmed_at && order.order_items?.some((it) => it.approval_status === "rejected") && (
            <Card>
              <CardContent className="p-6">
                {hasRejectedItems() ? (
                  <div className="text-center">
                    <p className="text-destructive font-medium mb-2">
                      Please remove all rejected items first
                    </p>
                    <p className="text-muted-foreground text-sm">
                      You must remove every rejected item before adding a replacement. The order total will be recalculated automatically.
                    </p>
                  </div>
                ) : !showAddItem ? (
                  <div className="text-center">
                    <p className="text-muted-foreground mb-4">
                      Rejected items removed. Add a replacement item now.
                    </p>
                    <Button onClick={() => setShowAddItem(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add New Item
                    </Button>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">Add New Item</h3>
                      <Button variant="outline" onClick={() => setShowAddItem(false)}>
                        Cancel
                      </Button>
                    </div>
                    <OrderItemForm onAddItem={handleAddNewItem} />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {order.confirmed_at && (
            <Card className="border-muted">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  🔒 Order confirmed. Items can no longer be modified.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <Footer />
      <AIBotButton />
    </div>
  );
};

export default OrderDetails;
