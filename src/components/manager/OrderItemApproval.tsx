import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, MessageSquare } from "lucide-react";

interface OrderItem {
  id: string;
  item_type: string;
  item_data: any;
  approval_status: string;
  manager_feedback: string | null;
  approved_by: string | null;
  approved_at: string | null;
}

interface OrderItemApprovalProps {
  items: OrderItem[];
  onUpdate: () => void;
}

export const OrderItemApproval = ({ items, onUpdate }: OrderItemApprovalProps) => {
  const [feedbackMap, setFeedbackMap] = useState<Record<string, string>>({});
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});

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
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Item Approval</h3>
      {items.map((item) => (
        <Card key={item.id}>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
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
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  <strong>Description:</strong> {item.item_data.description}
                </p>
              </div>

              {item.manager_feedback && (
                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-start gap-2">
                    <MessageSquare className="h-4 w-4 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Manager Feedback</p>
                      <p className="text-sm text-muted-foreground">{item.manager_feedback}</p>
                    </div>
                  </div>
                </div>
              )}

              {item.approval_status === "pending" && (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor={`feedback-${item.id}`}>Feedback (Optional for approval, Required for rejection)</Label>
                    <Textarea
                      id={`feedback-${item.id}`}
                      value={feedbackMap[item.id] || ""}
                      onChange={(e) => setFeedbackMap(prev => ({ ...prev, [item.id]: e.target.value }))}
                      placeholder="Add feedback for this item..."
                      className="mt-1"
                    />
                  </div>
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
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
