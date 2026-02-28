import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AIBotButton } from "@/components/AIBotButton";
import { supabase } from "@/integrations/supabase/client";
import { Package, Eye, Search, X } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Order {
  id: string;
  delivery_address: string;
  status: string;
  created_at: string;
  additional_charges: number | null;
  order_items: {
    id: string;
    item_type: string;
    item_data: Record<string, string>;
    image_url: string | null;
    approval_status: string | null;
    manager_feedback: string | null;
    approved_at: string | null;
  }[];
}

const STATUS_OPTIONS = [
  "All",
  "Pending",
  "Order Received",
  "Shopper Assigned",
  "Purchasing",
  "In Delivery",
  "Delivered",
  "Cancelled",
];

const OrderHistory = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/login");
      } else {
        setIsAuthenticated(true);
        loadOrders(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadOrders = async (userId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select(`
        id,
        delivery_address,
        status,
        created_at,
        additional_charges,
        order_items (
          id,
          item_type,
          item_data,
          image_url,
          approval_status,
          manager_feedback,
          approved_at
        )
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading orders:", error);
    } else {
      setOrders(data as Order[]);
    }
    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      Pending: "bg-yellow-500",
      "Order Received": "bg-blue-500",
      "Shopper Assigned": "bg-cyan-500",
      Purchasing: "bg-purple-500",
      "In Delivery": "bg-orange-500",
      Delivered: "bg-green-500",
      Cancelled: "bg-red-500",
    };
    return colors[status] || "bg-gray-500";
  };

  const parseItemPrice = (itemData: Record<string, string>) => {
    const directExpectedPrice = Number(String(itemData?.expectedPrice ?? "").replace(/,/g, ""));
    if (!Number.isNaN(directExpectedPrice) && directExpectedPrice > 0) {
      return directExpectedPrice;
    }

    const priceField = Object.entries(itemData).find(([key]) =>
      key.toLowerCase().includes("price")
    );

    if (!priceField) return 0;

    const normalizedPrice = String(priceField[1]).replace(/[^0-9.]/g, "");
    return Number(normalizedPrice) || 0;
  };

  const calculateTotalPrice = (order: Order) => {
    const itemsTotal = order.order_items
      .filter((item) => item.approval_status !== "rejected")
      .reduce((total, item) => total + parseItemPrice(item.item_data), 0);

    const deliveryCharges = order.additional_charges || 0;
    return itemsTotal + deliveryCharges;
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch =
        searchQuery === "" ||
        order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.delivery_address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.order_items.some((item) =>
          item.item_type.toLowerCase().includes(searchQuery.toLowerCase())
        );
      const matchesStatus =
        statusFilter === "All" || order.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [orders, searchQuery, statusFilter]);

  return (
    <div className="min-h-screen flex flex-col tap-highlight-none">
      <Header />

      <main className="flex-1 py-4 sm:py-8 native-scroll">
        <div className="container mx-auto px-4 max-w-[1200px]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h1 className="mobile-header">My Orders</h1>
            <Button onClick={() => navigate("/place-order")} className="mobile-button w-full sm:w-auto">
              <Package className="h-4 w-4 mr-2" />
              Place New Order
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading orders...</p>
            </div>
          ) : orders.length === 0 ? (
            <Card className="mobile-card">
              <CardContent className="py-12 text-center">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg text-muted-foreground mb-4">No orders yet</p>
                <Button onClick={() => navigate("/place-order")} className="mobile-button">
                  Place Your First Order
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Search & Filter Bar */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by order ID, address, or item..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-9"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border border-border z-50">
                    {STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <p className="text-sm text-muted-foreground">
                Showing {filteredOrders.length} of {orders.length} orders
              </p>

              {/* Desktop Table */}
              <div className="hidden md:block rounded-xl border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">Order ID</TableHead>
                      <TableHead className="font-semibold">Date</TableHead>
                      <TableHead className="font-semibold">Address</TableHead>
                      <TableHead className="font-semibold text-center">Items</TableHead>
                      <TableHead className="font-semibold text-right">Total</TableHead>
                      <TableHead className="font-semibold text-center">Status</TableHead>
                      <TableHead className="font-semibold text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No orders match your search.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredOrders.map((order) => (
                        <TableRow key={order.id} className="hover:bg-muted/30">
                          <TableCell className="font-mono text-sm">
                            #{order.id.slice(0, 8)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {format(new Date(order.created_at), "dd MMM yyyy")}
                          </TableCell>
                          <TableCell className="text-sm max-w-[200px] truncate">
                            {order.delivery_address}
                          </TableCell>
                          <TableCell className="text-center text-sm">
                            {order.order_items.length}
                          </TableCell>
                          <TableCell className="text-right text-sm font-semibold text-primary">
                            PKR {calculateTotalPrice(order).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className={`${getStatusColor(order.status)} text-xs`}>
                              {order.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/order-details?orderId=${order.id}`)}
                              >
                                <Eye className="h-3.5 w-3.5 mr-1" />
                                Details
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => navigate(`/track?orderId=${order.id}`)}
                              >
                                Track
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {filteredOrders.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">
                    No orders match your search.
                  </p>
                ) : (
                  filteredOrders.map((order) => (
                    <Card key={order.id} className="mobile-card active:scale-[0.99] transition-transform">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-mono text-sm font-semibold">#{order.id.slice(0, 8)}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(order.created_at), "dd MMM yyyy")}
                            </p>
                          </div>
                          <Badge className={`${getStatusColor(order.status)} text-xs`}>
                            {order.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{order.delivery_address}</p>
                        <div className="flex items-center justify-between text-sm bg-muted/50 rounded-lg px-3 py-2">
                          <span>Items: <span className="font-semibold">{order.order_items.length}</span></span>
                          <span className="font-semibold text-primary">
                            PKR {calculateTotalPrice(order).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            className="flex-1 h-10 rounded-xl text-sm"
                            onClick={() => navigate(`/order-details?orderId=${order.id}`)}
                          >
                            <Eye className="h-4 w-4 mr-1.5" />
                            Details
                          </Button>
                          <Button
                            className="flex-1 h-10 rounded-xl text-sm"
                            onClick={() => navigate(`/track?orderId=${order.id}`)}
                          >
                            Track
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
      <AIBotButton />
    </div>
  );
};

export default OrderHistory;
