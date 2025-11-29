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
  const [statusMap, setStatusMap] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

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
    setFeedbackMap(initialFeedback);
    setStatusMap(initialStatus);
  }, [items]);

  const handleApprove = (itemId: string) => {
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

      // Save all items with changed status or feedback
      const updates = items.map(async (item) => {
        const newStatus = statusMap[item.id];
        const newFeedback = feedbackMap[item.id] || null;
        
        // Check if anything changed
        const statusChanged = newStatus !== item.approval_status;
        const feedbackChanged = newFeedback !== item.manager_feedback;
        
        if (statusChanged || feedbackChanged) {
          // Validate rejection has feedback
          if (newStatus === "rejected" && !newFeedback) {
            throw new Error("Feedback is required for rejected items");
          }

          const { error } = await supabase
            .from("order_items")
            .update({
              approval_status: newStatus,
              approved_by: user.id,
              approved_at: new Date().toISOString(),
              manager_feedback: newFeedback,
            })
            .eq("id", item.id);

          if (error) throw error;
        }
      });

      await Promise.all(updates);

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
    return statusChanged || feedbackChanged;
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Item Approval</h3>
        {hasChanges && (
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
                  <img 
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
            </div>
          </CardContent>
        </Card>
      );
      })}
    </div>
  );
};
