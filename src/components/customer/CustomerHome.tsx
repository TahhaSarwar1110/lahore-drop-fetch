import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ArrowRight, Clock, History, Loader2, MapPin, Package, Plus, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AIBotButton } from "@/components/AIBotButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StorageImage } from "@/components/StorageImage";
import { getItemTotalPrice } from "@/utils/orderPricing";
import { getCustomerPaymentDisplay } from "@/utils/orderFinancials";
import { splitCustomerOrders } from "@/utils/customerOrders";
import type { Json } from "@/integrations/supabase/types";

interface CustomerOrder {
  id: string;
  status: string;
  created_at: string | null;
  delivery_address: string;
  order_total_pkr: number | null;
  paid_amount_pkr: number;
  customer_submitted_amount_pkr: number;
  payment_verification: string;
  additional_charges: number | null;
  order_items: { item_type: string; item_data: Json; approval_status: string | null; image_url: string | null }[];
}

export function CustomerHome({ userId }: { userId: string }) {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const navigate = useNavigate();
  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(false);
    const { data, error: queryError } = await supabase.from("orders")
      .select("id,status,created_at,delivery_address,order_total_pkr,paid_amount_pkr,customer_submitted_amount_pkr,payment_verification,additional_charges,order_items(item_type,item_data,approval_status,image_url)")
      .eq("user_id", userId).order("created_at", { ascending: false });
    if (queryError) setError(true);
    else setOrders(data ?? []);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void loadOrders();
    const refresh = () => { void loadOrders(); };
    window.addEventListener("focus", refresh);
    const channel = supabase.channel(`customer-home-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `user_id=eq.${userId}` }, refresh).subscribe();
    return () => { window.removeEventListener("focus", refresh); void supabase.removeChannel(channel); };
  }, [loadOrders, userId]);

  const groups = splitCustomerOrders(orders);
  const renderOrder = (order: CustomerOrder) => {
    const items = order.order_items.filter(item => item.approval_status !== "rejected");
    const total = order.order_total_pkr ?? items.reduce((sum, item) => sum + getItemTotalPrice(item.item_data as Record<string, string>), 0) + (order.additional_charges ?? 0);
    const payment = getCustomerPaymentDisplay(total, order.paid_amount_pkr, order.customer_submitted_amount_pkr, order.payment_verification);
    const image = items.find(item => item.image_url)?.image_url;
    return <Card key={order.id} className="rounded-lg overflow-hidden">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0"><h3 className="font-semibold">#{order.id.slice(0, 8)}</h3><p className="text-xs text-muted-foreground mt-1">{order.created_at ? format(new Date(order.created_at), "dd MMM yyyy") : "—"}</p></div>
          <Badge variant={order.status === "Cancelled" ? "destructive" : "secondary"} className="whitespace-normal text-right">{order.status}</Badge>
        </div>
        <div className="flex items-center gap-3">
          {image ? <StorageImage bucket="order-images" src={image} alt="Order item" className="h-16 w-16 shrink-0 rounded-md object-cover border" /> : <div className="h-16 w-16 shrink-0 rounded-md bg-muted flex items-center justify-center"><Package className="h-7 w-7 text-primary" /></div>}
          <div className="min-w-0"><p className="font-medium text-sm truncate">{items.map(item => item.item_type).join(", ") || "Order items"}</p><p className="text-xs text-muted-foreground mt-1">{items.length} {items.length === 1 ? "item" : "items"}</p></div>
        </div>
        <p className="flex gap-2 text-sm text-muted-foreground"><MapPin className="h-4 w-4 shrink-0 mt-0.5" /><span className="line-clamp-2 break-words">{order.delivery_address}</span></p>
        <div className="border-t pt-3 space-y-2 text-sm"><div className="flex justify-between gap-2"><span className="text-muted-foreground">Order total</span><span className="font-semibold">Rs. {total.toLocaleString()}</span></div><div className="flex justify-between gap-2"><span className="text-muted-foreground">Outstanding</span><span>Rs. {payment.outstanding.toLocaleString()}</span></div></div>
        <Button variant="outline" className="w-full" onClick={() => navigate(`/order-details?orderId=${order.id}`)}>View Order<ArrowRight className="h-4 w-4" /></Button>
      </CardContent>
    </Card>;
  };

  return <div className="min-h-screen flex flex-col bg-background"><Header />
    <main className="flex-1 native-scroll py-6 sm:py-10"><div className="container max-w-[1200px] mx-auto px-4">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-10"><div><p className="text-sm text-secondary font-medium mb-2">Tabedaar.com</p><h1 className="text-3xl font-bold">My Orders</h1></div><Button onClick={() => navigate("/place-order")}><Plus className="h-4 w-4" />Place Order</Button></div>
      {error ? <div className="py-12 text-center space-y-4"><p className="text-destructive">Could not load your orders.</p><Button variant="outline" onClick={loadOrders}><RefreshCw className="h-4 w-4" />Try Again</Button></div> : loading && orders.length === 0 ? <div className="py-16 flex justify-center" role="status" aria-label="Loading orders"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div> : <>
        <section className="mb-12"><div className="flex items-center gap-2 mb-5"><Clock className="h-5 w-5 text-secondary" /><h2 className="text-xl font-semibold">Active Orders</h2><Badge variant="outline">{groups.active.length}</Badge></div>{groups.active.length ? <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">{groups.active.map(renderOrder)}</div> : <div className="py-10 border-y text-center text-muted-foreground"><Package className="h-8 w-8 mx-auto mb-3" /><p>No active orders</p></div>}</section>
        <section><div className="flex flex-wrap items-center justify-between gap-3 mb-5"><div className="flex items-center gap-2"><History className="h-5 w-5 text-primary" /><h2 className="text-xl font-semibold">Recent Order History</h2></div><Button variant="ghost" onClick={() => navigate("/order-history")}>View All<ArrowRight className="h-4 w-4" /></Button></div>{groups.history.length ? <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">{groups.history.map(renderOrder)}</div> : <div className="py-10 border-y text-center text-muted-foreground">No completed or cancelled orders yet</div>}</section>
      </>}
    </div></main><Footer /><AIBotButton /></div>;
}