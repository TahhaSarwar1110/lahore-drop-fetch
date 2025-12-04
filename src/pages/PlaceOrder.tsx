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
import { X, MapPin, ChevronDown, ChevronUp } from "lucide-react";
import { z } from "zod";
import { useBundlePricing } from "@/hooks/useBundlePricing";
import { LocationPickerMap } from "@/components/map/LocationPickerMap";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

type DeliveryType = "within_city" | "out_of_city" | "out_of_country";

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
  const [deliveryType, setDeliveryType] = useState<DeliveryType>("within_city");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryLocation, setDeliveryLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDeliveryMap, setShowDeliveryMap] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { calculateBundlePrice } = useBundlePricing();

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

  // Reset delivery location when switching away from within_city
  useEffect(() => {
    if (deliveryType !== "within_city") {
      setDeliveryLocation(null);
      setShowDeliveryMap(false);
    }
  }, [deliveryType]);

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

      // Calculate bundle pricing based on item count
      const { bundle, price: bundlePrice } = calculateBundlePrice(orderItems.length);
      
      // Create order with bundle pricing and delivery location
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: userId,
          delivery_address: `[${deliveryType.replace(/_/g, " ").toUpperCase()}] ${deliveryAddress}`,
          delivery_latitude: deliveryLocation?.lat,
          delivery_longitude: deliveryLocation?.lng,
          status: "Pending",
          additional_charges: bundlePrice,
          charges_description: bundle 
            ? `Delivery charges (${bundle.name} - ${orderItems.length} items)` 
            : "No delivery bundle applied",
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Insert order items with pickup locations from each item
      const itemsToInsert = orderItems.map((item) => ({
        order_id: orderData.id,
        item_type: item.itemType,
        item_data: item.itemData,
        image_url: item.imageUrl || null,
        pickup_latitude: item.pickupLat,
        pickup_longitude: item.pickupLng,
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

  const getDeliveryTypeLabel = (type: DeliveryType) => {
    switch (type) {
      case "within_city":
        return "Within City";
      case "out_of_city":
        return "Out of City";
      case "out_of_country":
        return "Out of Country";
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

                  {/* Delivery Type Dropdown */}
                  <div className="space-y-2">
                    <Label>
                      Delivery Type
                      <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <Select
                      value={deliveryType}
                      onValueChange={(value: DeliveryType) => setDeliveryType(value)}
                    >
                      <SelectTrigger className="w-full bg-background">
                        <SelectValue placeholder="Select delivery type" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border border-border z-50">
                        <SelectItem value="within_city">Within City</SelectItem>
                        <SelectItem value="out_of_city">Out of City</SelectItem>
                        <SelectItem value="out_of_country">Out of Country</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Delivery Address - Always shown */}
                  <div className="space-y-2">
                    <Label>
                      Delivery Address
                      <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <Input
                      placeholder="Complete delivery address"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                    />
                  </div>

                  {/* Delivery Location Map - Only for within city, collapsible */}
                  {deliveryType === "within_city" && (
                    <Collapsible open={showDeliveryMap} onOpenChange={setShowDeliveryMap}>
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-between"
                        >
                          <span className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            Select Delivery Location on Map (Optional)
                          </span>
                          {showDeliveryMap ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pt-4">
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground mb-2">
                            Click on the map to mark your delivery location
                          </p>
                          <LocationPickerMap
                            onLocationSelect={(lat, lng) => setDeliveryLocation({ lat, lng })}
                            label="Delivery Location"
                          />
                          {deliveryLocation && (
                            <p className="text-sm text-green-600">
                              ✓ Location selected: {deliveryLocation.lat.toFixed(4)}, {deliveryLocation.lng.toFixed(4)}
                            </p>
                          )}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )}

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
                        <span className="font-semibold">Delivery Type:</span>
                        <span>{getDeliveryTypeLabel(deliveryType)}</span>
                      </div>
                      
                      <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                        <span className="font-semibold">Total Items:</span>
                        <span>{orderItems.length}</span>
                      </div>
                      
                      <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                        <span className="font-semibold">Items Total:</span>
                        <span className="text-lg font-bold">
                          PKR {calculateTotalPrice().toLocaleString()}
                        </span>
                      </div>
                      
                      {(() => {
                        const { bundle, price } = calculateBundlePrice(orderItems.length);
                        return bundle ? (
                          <div className="flex justify-between items-center p-4 bg-accent/10 rounded-lg">
                            <div>
                              <span className="font-semibold block">Delivery Charges</span>
                              <span className="text-xs text-muted-foreground">
                                {bundle.name} ({orderItems.length} of {bundle.items_allowed} items)
                              </span>
                            </div>
                            <span className="text-lg font-bold">
                              PKR {price.toLocaleString()}
                            </span>
                          </div>
                        ) : null;
                      })()}
                      
                      <div className="flex justify-between items-center p-4 bg-primary/10 rounded-lg">
                        <span className="font-semibold">Grand Total:</span>
                        <span className="text-xl font-bold text-primary">
                          PKR {(calculateTotalPrice() + calculateBundlePrice(orderItems.length).price).toLocaleString()}
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
                          ⚠️ Please complete all required fields (Name, Phone, Delivery Address)
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
