import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AIBotButton } from "@/components/AIBotButton";
import { OrderItemForm, OrderItem } from "@/components/OrderItemForm";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { X } from "lucide-react";
import { z } from "zod";

const orderSchema = z.object({
  fullName: z.string().trim().min(2, "Name required"),
  phone: z.string().trim().min(10, "Phone required"),
  deliveryAddress: z.string().trim().min(10, "Address required"),
});

const PlaceOrder = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/login");
      } else {
        setIsAuthenticated(true);
        setUserId(session.user.id);
        
        // Load profile data
        supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single()
          .then(({ data }) => {
            if (data) {
              setFullName(data.full_name || "");
              setPhone(data.phone || "");
            }
          });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleAddItem = (item: OrderItem) => {
    setOrderItems([...orderItems, item]);
  };

  const handleRemoveItem = (id: string) => {
    setOrderItems(orderItems.filter((item) => item.id !== id));
  };

  const calculateTotalPrice = () => {
    return orderItems.reduce((total, item) => {
      const priceField = Object.entries(item.itemData).find(
        ([key]) => key.toLowerCase().includes("price")
      );
      return total + (priceField ? parseFloat(priceField[1]) || 0 : 0);
    }, 0);
  };

  const handleSubmitOrder = async () => {
    if (orderItems.length === 0) {
      toast({
        title: "No Items",
        description: "Please add at least one item to your order",
        variant: "destructive",
      });
      return;
    }

    try {
      orderSchema.parse({ fullName, phone, deliveryAddress });
      setLoading(true);

      // Create order
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: userId,
          delivery_address: deliveryAddress,
          status: "Pending",
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Insert order items
      const itemsToInsert = orderItems.map((item) => ({
        order_id: orderData.id,
        item_type: item.itemType,
        item_data: item.itemData,
        image_url: item.imageUrl || null,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      toast({
        title: "Order Placed!",
        description: "Your order has been successfully placed",
      });

      setTimeout(() => navigate("/orders"), 1500);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to place order. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header isAuthenticated={isAuthenticated} />

      <main className="flex-1 py-8">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Left - Image */}
            <div className="hidden lg:flex items-center justify-center bg-gradient-to-br from-primary to-accent rounded-lg p-12">
              <div className="text-primary-foreground text-center space-y-6">
                <h1 className="text-4xl font-bold">Place Your Order</h1>
                <p className="text-lg opacity-90">
                  Tell us what you need and we'll get it delivered to your doorstep
                </p>
              </div>
            </div>

            {/* Right - Form */}
            <div className="space-y-6">
              <Card>
                <CardContent className="p-6 space-y-6">
                  <h2 className="text-2xl font-bold">Order Details</h2>

                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input
                      placeholder="Your name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Phone Number</Label>
                    <Input
                      type="tel"
                      placeholder="Your phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Delivery Address</Label>
                    <Input
                      placeholder="Complete delivery address"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                    />
                  </div>

                  <div className="border-t pt-6">
                    <h3 className="text-xl font-semibold mb-4">Add Items</h3>
                    <OrderItemForm onAddItem={handleAddItem} />
                  </div>

                  {orderItems.length > 0 && (
                    <div className="border-t pt-6 space-y-4">
                      <h3 className="text-xl font-semibold">Order Summary</h3>
                      {orderItems.map((item) => (
                        <Card key={item.id} className="relative">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={() => handleRemoveItem(item.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          <CardContent className="p-4">
                            <p className="font-semibold text-primary">{item.itemType}</p>
                            <div className="mt-2 text-sm text-muted-foreground space-y-1">
                              {Object.entries(item.itemData).map(([key, value]) => (
                                <p key={key}>
                                  <span className="font-medium">{key}:</span> {value}
                                </p>
                              ))}
                              {item.imageUrl && (
                                <p className="text-xs text-primary">📷 Image attached</p>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      
                      <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                        <span className="font-semibold">Total Items:</span>
                        <span>{orderItems.length}</span>
                      </div>
                      
                      <div className="flex justify-between items-center p-4 bg-primary/10 rounded-lg">
                        <span className="font-semibold">Expected Total:</span>
                        <span className="text-xl font-bold text-primary">
                          PKR {calculateTotalPrice().toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Always show Place Order button with validation */}
                  <div className="border-t pt-6 space-y-3">
                    {orderItems.length === 0 && (
                      <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                        <p className="text-sm text-yellow-700 dark:text-yellow-300">
                          ⚠️ Please add at least one item to your order
                        </p>
                      </div>
                    )}
                    {(!fullName || !phone || !deliveryAddress) && (
                      <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                        <p className="text-sm text-yellow-700 dark:text-yellow-300">
                          ⚠️ Please complete all required fields above
                        </p>
                      </div>
                    )}
                    <Button
                      onClick={handleSubmitOrder}
                      className="w-full"
                      size="lg"
                      disabled={loading}
                    >
                      {loading ? "Placing Order..." : "Submit Order"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />
      <AIBotButton />
    </div>
  );
};

export default PlaceOrder;
