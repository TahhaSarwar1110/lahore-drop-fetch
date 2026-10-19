import { StorageImage } from "@/components/StorageImage";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { sendNotificationEmail } from "@/utils/notificationHelper";
import { triggerNotification } from "@/utils/notify";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { getItemTotalPrice } from "@/utils/orderPricing";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";

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

interface OrderItemApprovalProps {
  items: OrderItem[];
  orderId: string;
  onUpdate: () => void;
  isLocked?: boolean;
}

export const OrderItemApproval = ({ items, orderId, onUpdate, isLocked = false }: OrderItemApprovalProps) => {
  const [feedbackMap, setFeedbackMap] = useState<Record<string, string>>({});
  const [statusMap, setStatusMap] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [priceMap, setPriceMap] = useState<Record<string, string>>({});

  // Initialize feedback and status maps with existing data from items
  useEffect(() => {
    const initialFeedback: Record<string, string> = {};
    const initialStatus: Record<string, string> = {};
    items.forEach(item => {
      if (item.manager_feedback) {
        initialFeedback[item.id] = item.manager_feedback;
      }
      initialStatus[item.id] = item.approval_status;
    });
    const initialPrice: Record<string, string> = {};
    items.forEach(item => {
      initialPrice[item.id] = item.manager_price_pkr != null ? String(item.manager_price_pkr) : "";
    });
    setPriceMap(initialPrice);
    setFeedbackMap(initialFeedback);
    setStatusMap(initialStatus);
  }, [items]);

  const parsePrice = (id: string) => {
    const n = parseInt((priceMap[id] || "").replace(/[^0-9]/g, ""), 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  const originalPrice = (item: OrderItem) => item.manager_price_pkr ?? null;

  const handleApprove = (itemId: string) => {
    if (!parsePrice(itemId)) {
      toast.error("Enter the verified price for this item before approving");
      return;
    }
    setStatusMap(prev => ({ ...prev, [itemId]: "approved" }));
    toast.success("Item marked as approved. Click 'Save Changes' to confirm.");
  };

  const handleReject = (itemId: string) => {
    if (!feedbackMap[itemId]) {
      toast.error("Please provide feedback for rejection");
      return;
    }
    setStatusMap(prev => ({ ...prev, [itemId]: "rejected" }));
    toast.success("Item marked as rejected. Click 'Save Changes' to confirm.");
  };

  const handleSaveChanges = async () => {
    try {
      setIsSaving(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Track which items were modified
      const modifiedItemsList: OrderItem[] = [];

      // Save each changed item through the server (sequential: each recalculates the order total)
      for (const item of items) {
        const newStatus = statusMap[item.id];
        const newFeedback = feedbackMap[item.id] || null;
        const newPrice = parsePrice(item.id);
        const statusChanged = newStatus !== item.approval_status;
        const feedbackChanged = newFeedback !== item.manager_feedback;
        const priceChanged = newPrice !== originalPrice(item);
        if (!statusChanged && !feedbackChanged && !priceChanged) continue;
        if (newStatus === "rejected" && !newFeedback) throw new Error("Feedback is required for rejected items");
        if (newStatus === "approved" && !newPrice) throw new Error("Enter the verified price for every approved item");
        const { error } = await supabase.rpc("review_order_item", {
          p_item_id: item.id,
          p_status: newStatus,
          p_feedback: newFeedback ?? "",
          p_manager_price: newPrice as number,
        });
        if (error) throw error;
        if (statusChanged || feedbackChanged) {
          modifiedItemsList.push({ ...item, approval_status: newStatus, manager_feedback: newFeedback });
        }
      }

      // Send notifications for each modified item
      for (const item of modifiedItemsList) {
        const { data: orderData } = await supabase
          .from("order_items")
          .select("order_id")
          .eq("id", item.id)
          .single();

        if (!orderData) continue;

        const { data: order } = await supabase
          .from("orders")
          .select("user_id")
          .eq("id", orderData.order_id)
          .single();

        if (!order) continue;

        const itemData = typeof item.item_data === 'string' 
          ? JSON.parse(item.item_data) 
          : item.item_data;

        const notificationTitle = item.approval_status === 'approved' 
          ? "Item Approved" 
          : "Item Rejected";
        
        const notificationMessage = item.approval_status === 'approved'
          ? `Your item "${itemData.description || itemData["Item Description"] || item.item_type}" has been approved.`
          : `Your item "${itemData.description || itemData["Item Description"] || item.item_type}" has been rejected. ${item.manager_feedback ? `Reason: ${item.manager_feedback}` : 'Please contact support for more details.'}`;

        await triggerNotification({
          event_type: item.approval_status === 'approved' ? 'item_approved' : 'item_rejected',
          order_id: orderData.order_id,
          event_version: item.id,
          item_name: itemData.description || itemData["Item Description"] || item.item_type,
          note: item.manager_feedback || undefined,
        });

        await sendNotificationEmail({
          userId: order.user_id,
          title: notificationTitle,
          message: notificationMessage,
          orderLink: `${window.location.origin}/order-details?orderId=${orderData.order_id}`,
        });

      }

      // Once EVERY item has a final decision, send the customer a single
      // review summary + payment request (server validates finalization and
      // dedupes per review batch, so repeats are safe).
      const { data: allItems } = await supabase
        .from("order_items")
        .select("approval_status")
        .eq("order_id", orderId);
      const finalized = (allItems ?? []).length > 0 &&
        (allItems ?? []).every((i) => i.approval_status && i.approval_status !== "pending");
      if (finalized) {
        const reviewBatch = `r${Date.now()}`;
        await triggerNotification({ event_type: "items_reviewed", order_id: orderId, event_version: reviewBatch });
        await triggerNotification({ event_type: "payment_required_after_review", order_id: orderId, event_version: reviewBatch });
      }

      toast.success("All changes saved successfully");
      onUpdate();
    } catch (error) {
      console.error("Error saving changes:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-500 text-white";
      case "rejected":
        return "bg-red-500 text-white";
      default:
        return "bg-yellow-500 text-white";
    }
  };

  const hasChanges = items.some((item) => {
    const statusChanged = statusMap[item.id] !== item.approval_status;
    const feedbackChanged = (feedbackMap[item.id] || null) !== item.manager_feedback;
    const priceChanged = parsePrice(item.id) !== originalPrice(item);
    return statusChanged || feedbackChanged || priceChanged;
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Item Approval</h3>
          {isLocked && (
            <p className="text-sm text-muted-foreground">
              🔒 Order is confirmed. Items cannot be modified.
            </p>
          )}
        </div>
        {hasChanges && !isLocked && (
          <Button
            onClick={handleSaveChanges}
            disabled={isSaving}
            size="lg"
            className="bg-primary hover:bg-primary/90"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        )}
      </div>
      {items.map((item) => {
        const currentStatus = statusMap[item.id] || item.approval_status;
        return (
        <Card key={item.id} className={currentStatus !== item.approval_status ? "border-primary" : ""}>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <CardTitle className="text-base">{item.item_type}</CardTitle>
                <CardDescription>
                  {item.item_data.shopName || item.item_data.address}
                </CardDescription>
              </div>
              <Badge className={getStatusColor(currentStatus)}>
                {currentStatus}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Item Image */}
              {item.image_url && (
                <div className="flex justify-center">
                  <StorageImage bucket="order-images" 
                    src={item.image_url} 
                    alt={`${item.item_type} item`}
                    className="max-w-full h-48 object-cover rounded-lg border"
                  />
                </div>
              )}

              {/* Item Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-lg">
                {/* Shop/Store/Restaurant Name */}
                {(item.item_data["Shop/Store Name"] || item.item_data["Restaurant/Shop Name"] || 
                  item.item_data["Shop Name"] || item.item_data["Shop/Location Name"]) && (
                  <div>
                    <p className="text-sm font-semibold text-foreground">Shop/Store Name</p>
                    <p className="text-sm text-muted-foreground">
                      {item.item_data["Shop/Store Name"] || item.item_data["Restaurant/Shop Name"] || 
                       item.item_data["Shop Name"] || item.item_data["Shop/Location Name"]}
                    </p>
                  </div>
                )}

                {/* Item Description */}
                {(item.item_data["Item Description"] || item.item_data["Item Name"] || 
                  item.item_data["Gift Description"] || item.item_data["Description"]) && (
                  <div>
                    <p className="text-sm font-semibold text-foreground">Item Description</p>
                    <p className="text-sm text-muted-foreground">
                      {item.item_data["Item Description"] || item.item_data["Item Name"] || 
                       item.item_data["Gift Description"] || item.item_data["Description"]}
                    </p>
                  </div>
                )}

                {/* Brand */}
                {item.item_data["Brand"] && (
                  <div>
                    <p className="text-sm font-semibold text-foreground">Brand</p>
                    <p className="text-sm text-muted-foreground">{item.item_data["Brand"]}</p>
                  </div>
                )}

                {/* Quantity */}
                {item.item_data["Quantity"] && (
                  <div>
                    <p className="text-sm font-semibold text-foreground">Quantity</p>
                    <p className="text-sm text-muted-foreground">{item.item_data["Quantity"]}</p>
                  </div>
                )}

                {/* Price */}
                {(item.item_data["Expected Price (PKR)"] || item.item_data["Price (PKR)"]) && (
                  <div>
                    <p className="text-sm font-semibold text-foreground">Expected Price</p>
                    <p className="text-lg font-bold text-primary">
                      PKR {item.item_data["Expected Price (PKR)"] || item.item_data["Price (PKR)"]}
                    </p>
                  </div>
                )}

                {/* Special Instructions */}
                {(item.item_data["Special Instructions"] || item.item_data["Instructions"]) && (
                  <div className="md:col-span-2">
                    <p className="text-sm font-semibold text-foreground">Special Instructions</p>
                    <p className="text-sm text-muted-foreground">
                      {item.item_data["Special Instructions"] || item.item_data["Instructions"]}
                    </p>
                  </div>
                )}
              </div>

              {/* Verified price */}
              {isLocked ? (
                item.manager_price_pkr != null && (
                  <div className="flex justify-between text-sm border-t pt-3">
                    <span className="font-semibold">Manager Verified Price</span>
                    <span className="font-bold text-primary">PKR {item.manager_price_pkr.toLocaleString()}</span>
                  </div>
                )
              ) : null}

              {/* Feedback Section - Only show if not locked */}
              {!isLocked && (
                <div className="space-y-3 pt-4 border-t">
                  <div>
                    <Label htmlFor={`price-${item.id}`}>Manager Verified Price (PKR, total for this item)</Label>
                    <Input
                      id={`price-${item.id}`}
                      inputMode="numeric"
                      value={priceMap[item.id] || ""}
                      onChange={(e) => setPriceMap(prev => ({ ...prev, [item.id]: e.target.value.replace(/[^0-9]/g, "") }))}
                      placeholder={`Customer expected: ${getItemTotalPrice(item.item_data).toLocaleString()}`}
                      className="mt-1"
                      disabled={isSaving}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Required to approve. The order total is updated from these prices.</p>
                  </div>
                  <div>
                    <Label htmlFor={`feedback-${item.id}`}>
                      Manager Feedback {item.approval_status === "pending" && "(Optional for approval, Required for rejection)"}
                    </Label>
                    <Textarea
                      id={`feedback-${item.id}`}
                      value={feedbackMap[item.id] || ""}
                      onChange={(e) => setFeedbackMap(prev => ({ ...prev, [item.id]: e.target.value }))}
                      placeholder="Add feedback for this item..."
                      className="mt-1"
                      disabled={isSaving}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleApprove(item.id)}
                      disabled={isSaving}
                      size="sm"
                      className="flex-1"
                      variant={currentStatus === "approved" ? "default" : "outline"}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      {currentStatus === "approved" ? "Approved" : "Approve"}
                    </Button>
                    <Button
                      onClick={() => handleReject(item.id)}
                      disabled={isSaving}
                      variant={currentStatus === "rejected" ? "destructive" : "outline"}
                      size="sm"
                      className="flex-1"
                    >
                      <X className="h-4 w-4 mr-2" />
                      {currentStatus === "rejected" ? "Rejected" : "Reject"}
                    </Button>
                  </div>
                </div>
              )}

              {/* Show feedback read-only when locked */}
              {isLocked && item.manager_feedback && (
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium text-muted-foreground">Manager Feedback:</p>
                  <p className="text-sm">{item.manager_feedback}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      );
      })}
    </div>
  );
};
