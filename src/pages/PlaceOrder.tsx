import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AIBotButton } from "@/components/AIBotButton";
import { OrderItemForm, OrderItem } from "@/components/OrderItemForm";
import { CountryCodeSelect } from "@/components/CountryCodeSelect";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { X, MapPin, ChevronDown, ChevronUp, Pencil } from "lucide-react";
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

const countryCodes = [
  { code: "+92", country: "Pakistan", flag: "🇵🇰", minLength: 10, maxLength: 10, placeholder: "3001234567" },
  { code: "+1", country: "USA/Canada", flag: "🇺🇸", minLength: 10, maxLength: 10, placeholder: "2025551234" },
  { code: "+44", country: "UK", flag: "🇬🇧", minLength: 10, maxLength: 11, placeholder: "7911123456" },
  { code: "+971", country: "UAE", flag: "🇦🇪", minLength: 9, maxLength: 9, placeholder: "501234567" },
  { code: "+966", country: "Saudi Arabia", flag: "🇸🇦", minLength: 9, maxLength: 9, placeholder: "512345678" },
  { code: "+61", country: "Australia", flag: "🇦🇺", minLength: 9, maxLength: 9, placeholder: "412345678" },
  { code: "+49", country: "Germany", flag: "🇩🇪", minLength: 10, maxLength: 11, placeholder: "15123456789" },
  { code: "+33", country: "France", flag: "🇫🇷", minLength: 9, maxLength: 9, placeholder: "612345678" },
  { code: "+39", country: "Italy", flag: "🇮🇹", minLength: 9, maxLength: 10, placeholder: "3123456789" },
  { code: "+86", country: "China", flag: "🇨🇳", minLength: 11, maxLength: 11, placeholder: "13812345678" },
  { code: "+91", country: "India", flag: "🇮🇳", minLength: 10, maxLength: 10, placeholder: "9876543210" },
  { code: "+81", country: "Japan", flag: "🇯🇵", minLength: 10, maxLength: 11, placeholder: "9012345678" },
  { code: "+82", country: "South Korea", flag: "🇰🇷", minLength: 9, maxLength: 10, placeholder: "1012345678" },
  { code: "+60", country: "Malaysia", flag: "🇲🇾", minLength: 9, maxLength: 10, placeholder: "123456789" },
  { code: "+65", country: "Singapore", flag: "🇸🇬", minLength: 8, maxLength: 8, placeholder: "81234567" },
  { code: "+974", country: "Qatar", flag: "🇶🇦", minLength: 8, maxLength: 8, placeholder: "33123456" },
  { code: "+973", country: "Bahrain", flag: "🇧🇭", minLength: 8, maxLength: 8, placeholder: "36001234" },
  { code: "+968", country: "Oman", flag: "🇴🇲", minLength: 8, maxLength: 8, placeholder: "92123456" },
  { code: "+965", country: "Kuwait", flag: "🇰🇼", minLength: 8, maxLength: 8, placeholder: "50012345" },
];

const parseStoredPhone = (stored: string): { code: string; local: string } => {
  if (!stored) return { code: "+92", local: "" };
  // Find longest matching country code prefix
  const sorted = [...countryCodes].sort((a, b) => b.code.length - a.code.length);
  for (const c of sorted) {
    if (stored.startsWith(c.code)) {
      return { code: c.code, local: stored.slice(c.code.length).replace(/\D/g, "") };
    }
  }
  return { code: "+92", local: stored.replace(/\D/g, "") };
};

const buildOrderSchema = (countryCode: string) => {
  const country = countryCodes.find((c) => c.code === countryCode);
  const minLength = country?.minLength ?? 8;
  const maxLength = country?.maxLength ?? 11;
  const label = minLength === maxLength ? `${minLength}` : `${minLength}-${maxLength}`;
  return z.object({
    fullName: z.string().trim().min(2, "Name must be at least 2 characters"),
    phone: z
      .string()
      .trim()
      .min(minLength, `Phone number must be ${label} digits`)
      .max(maxLength, `Phone number must be ${label} digits`)
      .regex(/^\d+$/, "Phone number must contain only digits"),
    deliveryAddress: z.string().trim().min(10, "Delivery address is required (min 10 characters)"),
  });
};


const PlaceOrder = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [countryCode, setCountryCode] = useState("+92");
  const [phone, setPhone] = useState("");
  const [deliveryType, setDeliveryType] = useState<DeliveryType>("within_city");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryLocation, setDeliveryLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [editingItem, setEditingItem] = useState<OrderItem | null>(null);
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
        const parsed = parseStoredPhone(profileData.phone || "");
        setCountryCode(parsed.code);
        setPhone(parsed.local);
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
    setOrderItems((prev) => {
      const existingIdx = prev.findIndex((i) => i.id === item.id);
      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx] = item;
        return next;
      }
      return [...prev, item];
    });
    setEditingItem(null);
  };

  const handleRemoveItem = (id: string) => {
    setOrderItems(orderItems.filter((item) => item.id !== id));
    if (editingItem?.id === id) setEditingItem(null);
  };

  const handleEditItem = (item: OrderItem) => {
    setEditingItem(item);
    // Scroll to form
    setTimeout(() => {
      document.getElementById("add-items-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
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
      buildOrderSchema(countryCode).parse({ fullName, phone, deliveryAddress });
      setLoading(true);

      // Calculate bundle pricing based on item count
      const { bundle, price: bundlePrice } = calculateBundlePrice(orderItems.length);
      
      // Create order with bundle pricing and delivery location
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: userId,
          delivery_address: `[${deliveryType.replace(/_/g, " ").toUpperCase()}] ${deliveryAddress}`,
          delivery_type: deliveryType,
          delivery_latitude: deliveryLocation?.lat,
          delivery_longitude: deliveryLocation?.lng,
          status: "Pending",
          additional_charges: bundlePrice,
          charges_description: bundle
            ? `Service charges (${bundle.name} - ${orderItems.length} items)`
            : "No service bundle applied",
          delivery_payment_status: deliveryType === "within_city" ? "not_required" : "pending",
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

      setTimeout(() => navigate("/order-history"), 1500);
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
                    <label className="mobile-label">Phone Number <span className="text-destructive">*</span></label>
                    <div className="flex gap-2">
                      <CountryCodeSelect
                        value={countryCode}
                        onValueChange={setCountryCode}
                        countryCodes={countryCodes}
                      />
                      <Input
                        className="mobile-input flex-1"
                        type="tel"
                        inputMode="numeric"
                        placeholder={countryCodes.find(c => c.code === countryCode)?.placeholder || "Phone number"}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                        maxLength={countryCodes.find(c => c.code === countryCode)?.maxLength || 11}
                      />
                    </div>
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

                  {deliveryType !== "within_city" && (
                    <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800 p-3">
                      <p className="text-xs sm:text-sm text-amber-900 dark:text-amber-200">
                        <span className="font-semibold">Note:</span> For {getDeliveryTypeLabel(deliveryType).toLowerCase()} orders, delivery charges are calculated by our manager after purchasing the goods, based on the total weight. Only service charges are billed now — you will be notified separately to pay the delivery charges before dispatch.
                      </p>
                    </div>
                  )}

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
              <section id="add-items-section" className="px-4 lg:px-0 py-3">
                <div className="mobile-card lg:border lg:rounded-2xl lg:shadow-lg p-4 lg:p-6">
                  <h2 className="text-base font-semibold text-foreground flex items-center gap-2 mb-4">
                    <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</span>
                    {editingItem ? "Edit Item" : "Add Items"}
                  </h2>
                  <OrderItemForm
                    onAddItem={handleAddItem}
                    initialItem={editingItem}
                    onCancel={editingItem ? () => setEditingItem(null) : undefined}
                  />
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
                        <div className="absolute top-2 right-2 flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 rounded-full"
                            onClick={() => handleEditItem(item)}
                            aria-label="Edit item"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 rounded-full"
                            onClick={() => handleRemoveItem(item.id)}
                            aria-label="Remove item"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="font-semibold text-sm text-primary">{item.itemType}</p>
                        <div className="mt-1.5 text-xs text-muted-foreground space-y-0.5 pr-16">
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
                              <span className="text-sm text-muted-foreground block">Service Charges</span>
                              <span className="text-xs text-muted-foreground/70">
                                {bundle.name} ({orderItems.length}/{bundle.items_allowed} items)
                              </span>
                            </div>
                            <span className="text-sm font-bold">PKR {price.toLocaleString()}</span>
                          </div>
                        ) : null;
                      })()}

                      <div className="flex justify-between items-center py-3 bg-primary/5 rounded-xl px-3 -mx-1">
                        <span className="font-semibold text-sm">
                          {deliveryType === "within_city" ? "Grand Total" : "Total Payable Now"}
                        </span>
                        <span className="text-lg font-bold text-primary">
                          PKR {(calculateTotalPrice() + calculateBundlePrice(orderItems.length).price).toLocaleString()}
                        </span>
                      </div>

                      {deliveryType !== "within_city" && (
                        <p className="text-xs text-muted-foreground italic pt-1">
                          * Delivery charges will be billed separately after your goods are purchased and weighed.
                        </p>
                      )}
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
