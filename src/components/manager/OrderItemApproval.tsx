import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
}

interface OrderItemApprovalProps {
  items: OrderItem[];
  onUpdate: () => void;
}

export const OrderItemApproval = ({ items, onUpdate }: OrderItemApprovalProps) => {
  const [feedbackMap, setFeedbackMap] = useState<Record<string, string>>({});
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});

  // Initialize feedbackMap with existing feedback from items
  useEffect(() => {
    const initialFeedback: Record<string, string> = {};
    items.forEach(item => {
      if (item.manager_feedback) {
        initialFeedback[item.id] = item.manager_feedback;
      }
    });
    setFeedbackMap(initialFeedback);
  }, [items]);

  const handleApprove = async (itemId: string) => {
    try {
      setLoadingMap(prev => ({ ...prev, [itemId]: true }));

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("order_items")
        .update({
          approval_status: "approved",
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          manager_feedback: feedbackMap[itemId] || null,
        })
        .eq("id", itemId);

      if (error) throw error;

      toast.success("Item approved successfully");
      setFeedbackMap(prev => {
        const newMap = { ...prev };
        delete newMap[itemId];
        return newMap;
      });
      onUpdate();
    } catch (error) {
      console.error("Error approving item:", error);
      toast.error("Failed to approve item");
    } finally {
      setLoadingMap(prev => ({ ...prev, [itemId]: false }));
    }
  };

  const handleReject = async (itemId: string) => {
    if (!feedbackMap[itemId]) {
      toast.error("Please provide feedback for rejection");
      return;
    }

    try {
      setLoadingMap(prev => ({ ...prev, [itemId]: true }));

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("order_items")
        .update({
          approval_status: "rejected",
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          manager_feedback: feedbackMap[itemId],
        })
        .eq("id", itemId);

      if (error) throw error;

      toast.success("Item rejected with feedback");
      setFeedbackMap(prev => {
        const newMap = { ...prev };
        delete newMap[itemId];
        return newMap;
      });
      onUpdate();
    } catch (error) {
      console.error("Error rejecting item:", error);
      toast.error("Failed to reject item");
    } finally {
      setLoadingMap(prev => ({ ...prev, [itemId]: false }));
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

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Item Approval</h3>
      {items.map((item) => (
        <Card key={item.id}>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <CardTitle className="text-base">{item.item_type}</CardTitle>
                <CardDescription>
                  {item.item_data.shopName || item.item_data.address}
                </CardDescription>
              </div>
              <Badge className={getStatusColor(item.approval_status)}>
                {item.approval_status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Item Image */}
              {item.image_url && (
                <div className="flex justify-center">
                  <img 
                    src={item.image_url} 
                    alt={`${item.item_type} item`}
                    className="max-w-full h-48 object-cover rounded-lg border"
                  />
                </div>
              )}

              {/* Item Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-lg">
                {item.item_data.shopName && (
                  <div>
                    <p className="text-sm font-semibold text-foreground">Shop Name</p>
                    <p className="text-sm text-muted-foreground">{item.item_data.shopName}</p>
                  </div>
                )}
                {item.item_data.address && (
                  <div>
                    <p className="text-sm font-semibold text-foreground">Address</p>
                    <p className="text-sm text-muted-foreground">{item.item_data.address}</p>
                  </div>
                )}
                {item.item_data.brandName && (
                  <div>
                    <p className="text-sm font-semibold text-foreground">Brand Name</p>
                    <p className="text-sm text-muted-foreground">{item.item_data.brandName}</p>
                  </div>
                )}
                {item.item_data.quantity && (
                  <div>
                    <p className="text-sm font-semibold text-foreground">Quantity</p>
                    <p className="text-sm text-muted-foreground">{item.item_data.quantity}</p>
                  </div>
                )}
                {item.item_data.expectedPrice && (
                  <div>
                    <p className="text-sm font-semibold text-foreground">Expected Price</p>
                    <p className="text-lg font-bold text-primary">PKR {item.item_data.expectedPrice}</p>
                  </div>
                )}
                {item.item_data.description && (
                  <div className="md:col-span-2">
                    <p className="text-sm font-semibold text-foreground">Description / Instructions</p>
                    <p className="text-sm text-muted-foreground">{item.item_data.description}</p>
                  </div>
                )}
              </div>

              {/* Feedback Section */}
              <div className="space-y-3 pt-4 border-t">
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
                    disabled={loadingMap[item.id]}
                  />
                </div>

                {item.approval_status === "pending" ? (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleApprove(item.id)}
                      disabled={loadingMap[item.id]}
                      size="sm"
                      className="flex-1"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      onClick={() => handleReject(item.id)}
                      disabled={loadingMap[item.id]}
                      variant="destructive"
                      size="sm"
                      className="flex-1"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={() => {
                      const newFeedback = feedbackMap[item.id] !== undefined 
                        ? feedbackMap[item.id] 
                        : item.manager_feedback || "";
                      
                      if (item.approval_status === "approved") {
                        handleApprove(item.id);
                      } else {
                        if (!newFeedback) {
                          toast.error("Please provide feedback for rejection");
                          return;
                        }
                        handleReject(item.id);
                      }
                    }}
                    disabled={loadingMap[item.id]}
                    size="sm"
                    variant="outline"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Update Feedback
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
