import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useAuth } from "@/hooks/useAuth";
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
    const checkAuthAndRole = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/login");
        return;
      }
      
      // Check if user has customer or admin role (only these can place orders)
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);
      
      const userRoles = roles?.map(r => r.role) || [];
      const canPlaceOrder = userRoles.includes("customer") || userRoles.includes("admin");
      
      if (!canPlaceOrder) {
        toast({
          title: "Access Denied",
          description: "Only customers can place orders.",
          variant: "destructive",
        });
        navigate("/");
        return;
      }
      
      setIsAuthenticated(true);
      setUserId(session.user.id);
      
      // Load profile data
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();
      
      if (profileData) {
        setFullName(profileData.full_name || "");
        setPhone(profileData.phone || "");
      }
    };
    
    checkAuthAndRole();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, toast]);

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
    <div className="min-h-screen flex flex-col tap-highlight-none bg-background">
      <Header />

      <main className="flex-1 native-scroll">
        {/* Mobile: full-width native layout. Desktop: centered card layout */}
        <div className="mx-auto max-w-[1200px] lg:px-6 lg:py-10">
          <div className="grid lg:grid-cols-5 lg:gap-10">
            {/* Left - Gradient Panel (desktop only) */}
            <div className="hidden lg:flex lg:col-span-2 items-start justify-center bg-gradient-to-br from-primary to-accent rounded-2xl p-8 sticky top-24 self-start">
              <div className="text-primary-foreground text-center space-y-4 py-8">
                <h1 className="text-3xl font-bold">Place Your Order</h1>
                <p className="text-base opacity-90 leading-relaxed">
                  Tell us what you need and we'll get it delivered to your doorstep
                </p>
              </div>
            </div>

            {/* Right - Form */}
            <div className="lg:col-span-3 w-full">
              {/* Mobile page title */}
              <div className="lg:hidden px-4 pt-4 pb-2">
                <h1 className="text-xl font-bold text-foreground">Place Your Order</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Fill in the details below</p>
              </div>

              {/* Personal Info Section */}
              <section className="px-4 lg:px-0 py-3">
                <div className="mobile-card lg:border lg:rounded-2xl lg:shadow-lg p-4 lg:p-6 space-y-4">
                  <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</span>
                    Your Details
                  </h2>

                  <div className="space-y-1.5">
                    <label className="mobile-label">Full Name</label>
                    <Input
                      className="mobile-input"
                      placeholder="Your name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="mobile-label">Phone Number</label>
                    <Input
                      className="mobile-input"
                      type="tel"
                      placeholder="Your phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>
              </section>

              {/* Delivery Info Section */}
              <section className="px-4 lg:px-0 py-3">
                <div className="mobile-card lg:border lg:rounded-2xl lg:shadow-lg p-4 lg:p-6 space-y-4">
                  <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</span>
                    Delivery Info
                  </h2>

                  <div className="space-y-1.5">
                    <label className="mobile-label">
                      Delivery Type <span className="text-destructive">*</span>
                    </label>
                    <Select
                      value={deliveryType}
                      onValueChange={(value: DeliveryType) => setDeliveryType(value)}
                    >
                      <SelectTrigger className="mobile-input w-full">
                        <SelectValue placeholder="Select delivery type" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border border-border z-50">
                        <SelectItem value="within_city">Within City</SelectItem>
                        <SelectItem value="out_of_city">Out of City</SelectItem>
                        <SelectItem value="out_of_country">Out of Country</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="mobile-label">
                      Delivery Address <span className="text-destructive">*</span>
                    </label>
                    <Input
                      className="mobile-input"
                      placeholder="Complete delivery address"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                    />
                  </div>

                  {/* Delivery Location Map - Only for within city */}
                  {deliveryType === "within_city" && (
                    <Collapsible open={showDeliveryMap} onOpenChange={setShowDeliveryMap}>
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-between h-12 rounded-xl text-sm"
                        >
                          <span className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            Select Location on Map (Optional)
                          </span>
                          {showDeliveryMap ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pt-3">
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground">
                            Tap the map to mark your delivery location
                          </p>
                          <LocationPickerMap
                            onLocationSelect={(lat, lng) => setDeliveryLocation({ lat, lng })}
                            label="Delivery Location"
                          />
                          {deliveryLocation && (
                            <p className="text-sm text-green-600 font-medium">
                              ✓ Location: {deliveryLocation.lat.toFixed(4)}, {deliveryLocation.lng.toFixed(4)}
                            </p>
                          )}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </div>
              </section>

              {/* Add Items Section */}
              <section className="px-4 lg:px-0 py-3">
                <div className="mobile-card lg:border lg:rounded-2xl lg:shadow-lg p-4 lg:p-6">
                  <h2 className="text-base font-semibold text-foreground flex items-center gap-2 mb-4">
                    <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</span>
                    Add Items
                  </h2>
                  <OrderItemForm onAddItem={handleAddItem} />
                </div>
              </section>

              {/* Order Summary Section */}
              {orderItems.length > 0 && (
                <section className="px-4 lg:px-0 py-3">
                  <div className="mobile-card lg:border lg:rounded-2xl lg:shadow-lg p-4 lg:p-6 space-y-3">
                    <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                      <span className="w-7 h-7 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-xs font-bold">✓</span>
                      Order Summary
                    </h2>

                    {orderItems.map((item) => (
                      <div key={item.id} className="relative bg-muted/50 rounded-xl p-3 border border-border/50">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute top-2 right-2 h-8 w-8 p-0 rounded-full"
                          onClick={() => handleRemoveItem(item.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <p className="font-semibold text-sm text-primary">{item.itemType}</p>
                        <div className="mt-1.5 text-xs text-muted-foreground space-y-0.5 pr-8">
                          {Object.entries(item.itemData).map(([key, value]) => (
                            <p key={key}>
                              <span className="font-medium text-foreground/70">{key}:</span> {value}
                            </p>
                          ))}
                          {item.imageUrl && (
                            <p className="text-xs text-primary">📷 Image attached</p>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {/* Summary rows */}
                    <div className="space-y-2 pt-2">
                      <div className="flex justify-between items-center py-2 border-b border-border/50">
                        <span className="text-sm text-muted-foreground">Delivery Type</span>
                        <span className="text-sm font-medium">{getDeliveryTypeLabel(deliveryType)}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-border/50">
                        <span className="text-sm text-muted-foreground">Total Items</span>
                        <span className="text-sm font-medium">{orderItems.length}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-border/50">
                        <span className="text-sm text-muted-foreground">Items Total</span>
                        <span className="text-sm font-bold">PKR {calculateTotalPrice().toLocaleString()}</span>
                      </div>
                      
                      {(() => {
                        const { bundle, price } = calculateBundlePrice(orderItems.length);
                        return bundle ? (
                          <div className="flex justify-between items-center py-2 border-b border-border/50">
                            <div>
                              <span className="text-sm text-muted-foreground block">Delivery Charges</span>
                              <span className="text-xs text-muted-foreground/70">
                                {bundle.name} ({orderItems.length}/{bundle.items_allowed} items)
                              </span>
                            </div>
                            <span className="text-sm font-bold">PKR {price.toLocaleString()}</span>
                          </div>
                        ) : null;
                      })()}
                      
                      <div className="flex justify-between items-center py-3 bg-primary/5 rounded-xl px-3 -mx-1">
                        <span className="font-semibold text-sm">Grand Total</span>
                        <span className="text-lg font-bold text-primary">
                          PKR {(calculateTotalPrice() + calculateBundlePrice(orderItems.length).price).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* Submit button section - with bottom safe area */}
              <section className="px-4 lg:px-0 py-3 pb-6 safe-area-bottom">
                <div className="space-y-2">
                  {orderItems.length === 0 && (
                    <div className="p-3 bg-muted border border-border rounded-xl">
                      <p className="text-xs text-foreground">
                        ⚠️ Add at least one item to your order
                      </p>
                    </div>
                  )}
                  {(!fullName || !phone || !deliveryAddress) && (
                    <div className="p-3 bg-muted border border-border rounded-xl">
                      <p className="text-xs text-foreground">
                        ⚠️ Complete all required fields (Name, Phone, Address)
                      </p>
                    </div>
                  )}
                  <Button
                    onClick={handleSubmitOrder}
                    className="w-full mobile-button h-14 text-base bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-glow-accent"
                    size="lg"
                    disabled={loading}
                  >
                    {loading ? "Placing Order..." : "Submit Order"}
                  </Button>
                </div>
              </section>
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
