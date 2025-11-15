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
import { CheckCircle2, Circle, Package } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface StatusHistory {
  status: string;
  timestamp: string;
}

const TrackOrder = () => {
  const [searchParams] = useSearchParams();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [orderId, setOrderId] = useState(searchParams.get("orderId") || "");
  const [orderStatus, setOrderStatus] = useState<string | null>(null);
  const [statusHistory, setStatusHistory] = useState<StatusHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const statusFlow = [
    "Pending",
    "Order Received",
    "Shopper Assigned",
    "Purchasing",
    "In Delivery",
    "Delivered",
  ];

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
    if (orderId && orderStatus) {
      const interval = setInterval(() => {
        trackOrder();
      }, 10000); // Poll every 10 seconds

      return () => clearInterval(interval);
    }
  }, [orderId, orderStatus]);

  const trackOrder = async () => {
    if (!orderId) return;

    setLoading(true);
    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .select("status")
      .eq("id", orderId)
      .single();

    if (orderError) {
      console.error("Error fetching order:", orderError);
      setLoading(false);
      return;
    }

    setOrderStatus(orderData.status);

    const { data: historyData, error: historyError } = await supabase
      .from("order_status_history")
      .select("status, timestamp")
      .eq("order_id", orderId)
      .order("timestamp", { ascending: true });

    if (historyError) {
      console.error("Error fetching history:", historyError);
    } else {
      setStatusHistory(historyData);
    }

    setLoading(false);
  };

  const getCurrentStepIndex = () => {
    return statusFlow.indexOf(orderStatus || "");
  };

  const isStepCompleted = (index: number) => {
    return index <= getCurrentStepIndex();
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header isAuthenticated={isAuthenticated} />

      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 max-w-3xl">
          <h1 className="text-3xl font-bold mb-8">Track Your Order</h1>

          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label>Order ID</Label>
                  <Input
                    placeholder="Enter your order ID"
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                  />
                </div>
                <Button
                  onClick={trackOrder}
                  disabled={loading || !orderId}
                  className="mt-8"
                >
                  {loading ? "Tracking..." : "Track"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {orderStatus && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Order Status: <span className="text-primary">{orderStatus}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-8">
                  {statusFlow.map((status, index) => {
                    const isCompleted = isStepCompleted(index);
                    const isCurrent = index === getCurrentStepIndex();
                    const historyItem = statusHistory.find((h) => h.status === status);

                    return (
                      <div key={status} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div
                            className={cn(
                              "rounded-full p-2 transition-colors",
                              isCompleted
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            {isCompleted ? (
                              <CheckCircle2 className="h-6 w-6" />
                            ) : (
                              <Circle className="h-6 w-6" />
                            )}
                          </div>
                          {index < statusFlow.length - 1 && (
                            <div
                              className={cn(
                                "w-0.5 h-16 transition-colors",
                                isCompleted ? "bg-primary" : "bg-muted"
                              )}
                            />
                          )}
                        </div>
                        <div className="flex-1 pb-8">
                          <p
                            className={cn(
                              "font-semibold",
                              isCurrent && "text-primary",
                              isCompleted && !isCurrent && "text-foreground",
                              !isCompleted && "text-muted-foreground"
                            )}
                          >
                            {status}
                          </p>
                          {historyItem && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {format(new Date(historyItem.timestamp), "PPp")}
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
