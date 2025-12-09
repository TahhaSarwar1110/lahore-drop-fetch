import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AIBotButton } from "@/components/AIBotButton";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Circle, Package, Paperclip } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface StatusHistory {
  status: string;
  timestamp: string;
}

interface Attachment {
  id: string;
  file_url: string;
  file_name: string;
  created_at: string;
}

interface OrderTrackingData {
  status: string;
  confirmed_at: string | null;
  payment_status: string | null;
  payment_confirmed_at: string | null;
}

interface OrderAssignment {
  rider_id: string;
  assigned_at: string | null;
}

interface ItemPickup {
  id: string;
  order_item_id: string;
  picked_at: string | null;
}

interface TrackingStep {
  key: string;
  label: string;
  isCompleted: boolean;
  timestamp: string | null;
}

const TrackOrder = () => {
  const [searchParams] = useSearchParams();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [orderId, setOrderId] = useState(searchParams.get("orderId") || "");
  const [orderData, setOrderData] = useState<OrderTrackingData | null>(null);
  const [assignment, setAssignment] = useState<OrderAssignment | null>(null);
  const [itemPickups, setItemPickups] = useState<ItemPickup[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [statusHistory, setStatusHistory] = useState<StatusHistory[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/login");
      } else {
        setIsAuthenticated(true);
        if (orderId) {
          trackOrder();
        }
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (orderId && orderData) {
      const interval = setInterval(() => {
        trackOrder();
      }, 10000); // Poll every 10 seconds

      return () => clearInterval(interval);
    }
  }, [orderId, orderData]);

  const trackOrder = async () => {
    if (!orderId) return;

    setLoading(true);
    
    // Fetch order data
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("status, confirmed_at, payment_status, payment_confirmed_at")
      .eq("id", orderId)
      .single();

    if (orderError) {
      console.error("Error fetching order:", orderError);
      setLoading(false);
      return;
    }

    setOrderData(order);

    // Fetch order assignment
    const { data: assignmentData } = await supabase
      .from("order_assignments")
      .select("rider_id, assigned_at")
      .eq("order_id", orderId)
      .maybeSingle();

    setAssignment(assignmentData);

    // Fetch order items count (approved items only)
    const { data: items } = await supabase
      .from("order_items")
      .select("id")
      .eq("order_id", orderId)
      .eq("approval_status", "approved");

    setTotalItems(items?.length || 0);

    // Fetch item pickups
    if (items && items.length > 0) {
      const itemIds = items.map(i => i.id);
      const { data: pickups } = await supabase
        .from("item_pickups")
        .select("id, order_item_id, picked_at")
        .in("order_item_id", itemIds);

      setItemPickups(pickups || []);
    } else {
      setItemPickups([]);
    }

    // Fetch status history
    const { data: historyData } = await supabase
      .from("order_status_history")
      .select("status, timestamp")
      .eq("order_id", orderId)
      .order("timestamp", { ascending: true });

    setStatusHistory(historyData || []);

    // Fetch attachments
    const { data: attachmentData } = await supabase
      .from("order_attachments")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false });

    setAttachments(attachmentData || []);

    setLoading(false);
  };

  const getTrackingSteps = (): TrackingStep[] => {
    if (!orderData) return [];

    const isOrderConfirmed = orderData.confirmed_at !== null;
    const isPaymentConfirmed = orderData.payment_confirmed_at !== null;
    const isRiderAssigned = assignment !== null;
    const allItemsPicked = totalItems > 0 && itemPickups.length >= totalItems;
    const isDelivered = orderData.status === "Delivered";

    // Get timestamp from status history
    const getHistoryTimestamp = (status: string) => {
      const historyItem = statusHistory.find(h => h.status === status);
      return historyItem?.timestamp || null;
    };

    return [
      {
        key: "order_confirmed",
        label: isOrderConfirmed ? "Order Confirmed" : "Order Pending",
        isCompleted: isOrderConfirmed,
        timestamp: orderData.confirmed_at,
      },
      {
        key: "payment_confirmed",
        label: isPaymentConfirmed ? "Payment Confirmed" : "Payment Pending",
        isCompleted: isPaymentConfirmed,
        timestamp: orderData.payment_confirmed_at,
      },
      {
        key: "rider_assigned",
        label: isRiderAssigned ? "Rider Assigned" : "Rider Pending",
        isCompleted: isRiderAssigned,
        timestamp: assignment?.assigned_at || null,
      },
      {
        key: "items_picked",
        label: allItemsPicked ? "Items Picked" : "Items Pickup Pending",
        isCompleted: allItemsPicked,
        timestamp: allItemsPicked && itemPickups.length > 0 
          ? itemPickups.reduce((latest, p) => {
              if (!p.picked_at) return latest;
              if (!latest) return p.picked_at;
              return new Date(p.picked_at) > new Date(latest) ? p.picked_at : latest;
            }, null as string | null)
          : null,
      },
      {
        key: "delivered",
        label: isDelivered ? "Order Delivered" : "Delivery Pending",
        isCompleted: isDelivered,
        timestamp: getHistoryTimestamp("Delivered"),
      },
    ];
  };

  const getCurrentStatusLabel = () => {
    const steps = getTrackingSteps();
    // Find the last completed step
    for (let i = steps.length - 1; i >= 0; i--) {
      if (steps[i].isCompleted) {
        return steps[i].label;
      }
    }
    return "Order Pending";
  };

  return (
    <div className="min-h-screen flex flex-col tap-highlight-none">
      <Header isAuthenticated={isAuthenticated} />

      <main className="flex-1 py-4 sm:py-8 native-scroll">
        <div className="container mx-auto px-4 max-w-3xl">
          <h1 className="mobile-header mb-6">Track Your Order</h1>

          <Card className="mobile-card mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 space-y-2">
                  <label className="mobile-label">Order ID</label>
                  <Input
                    className="mobile-input"
                    placeholder="Enter your order ID"
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                  />
                </div>
                <Button
                  onClick={trackOrder}
                  disabled={loading || !orderId}
                  className="mobile-button sm:mt-7"
                >
                  {loading ? "Tracking..." : "Track"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {orderData && (
            <Card className="mobile-card">
              <CardHeader className="pb-2 px-4">
                <CardTitle className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-base sm:text-lg">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    <span>Order Status:</span>
                  </div>
                  <span className="text-primary font-bold">{getCurrentStatusLabel()}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4">
                <div className="space-y-0">
                  {getTrackingSteps().map((step, index) => {
                    const steps = getTrackingSteps();
                    const isLast = index === steps.length - 1;

                    return (
                      <div key={step.key} className="flex gap-3 sm:gap-4">
                        <div className="flex flex-col items-center">
                          <div
                            className={cn(
                              "rounded-full p-1.5 sm:p-2 transition-colors shrink-0",
                              step.isCompleted
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            {step.isCompleted ? (
                              <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6" />
                            ) : (
                              <Circle className="h-5 w-5 sm:h-6 sm:w-6" />
                            )}
                          </div>
                          {!isLast && (
                            <div
                              className={cn(
                                "w-0.5 h-12 sm:h-14 transition-colors",
                                step.isCompleted ? "bg-primary" : "bg-muted"
                              )}
                            />
                          )}
                        </div>
                        <div className="flex-1 pb-4 sm:pb-6 min-w-0">
                          <p
                            className={cn(
                              "font-semibold text-sm sm:text-base",
                              step.isCompleted ? "text-primary" : "text-muted-foreground"
                            )}
                          >
                            {step.label}
                          </p>
                          {step.timestamp && (
                            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                              {format(new Date(step.timestamp), "PPp")}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    <strong>Note:</strong> Status updates every 10 seconds automatically
                  </p>
                </div>

                {attachments.length > 0 && (
                  <div className="mt-6 space-y-3">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Paperclip className="h-5 w-5" />
                      Delivery Proof
                    </h3>
                    <div className="space-y-2">
                      {attachments.map((attachment) => (
                        <a
                          key={attachment.id}
                          href={attachment.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                        >
                          <Paperclip className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{attachment.file_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(attachment.created_at), "PPp")}
                            </p>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
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

export default TrackOrder;
