import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Package, MapPin, Phone, User, Eye } from "lucide-react";
import { AttachmentUpload } from "@/components/rider/AttachmentUpload";
import { OrderDetailsDialog } from "@/components/rider/OrderDetailsDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface OrderAssignment {
  id: string;
  order_id: string;
  assigned_at: string;
  orders: {
    id: string;
    created_at: string;
    delivery_address: string;
    status: string;
    profiles: {
      full_name: string;
      phone: string;
    };
    order_items: {
      id: string;
      item_type: string;
    }[];
  };
}

const RiderDashboard = () => {
  const [assignments, setAssignments] = useState<OrderAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<{ id: string; number: string } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuthAndRole = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          toast.error("Please log in to access rider dashboard");
          navigate("/login");
          return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate("/login");
          return;
        }

        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "rider")
          .maybeSingle();

        if (!roles) {
          toast.error("You don't have access to the rider dashboard");
          navigate("/");
          return;
        }

        await fetchAssignments();
      } catch (error) {
        console.error("Auth check error:", error);
        navigate("/login");
      }
    };

    checkAuthAndRole();
  }, [navigate]);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { data, error } = await supabase
        .from("order_assignments")
        .select(`
          id,
          order_id,
          assigned_at,
          orders (
            id,
            created_at,
            delivery_address,
            status,
            profiles (
              full_name,
              phone
            ),
            order_items (
              id,
              item_type
            )
          )
        `)
        .eq("rider_id", user.id)
        .order("assigned_at", { ascending: false });

      if (error) throw error;

      setAssignments(data || []);
    } catch (error) {
      console.error("Error fetching assignments:", error);
      toast.error("Failed to load assignments");
    } finally {
      setLoading(false);
    }
  };

  const checkAllItemsPicked = async (orderId: string): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // Get all items for this order
      const { data: items } = await supabase
        .from("order_items")
        .select("id")
        .eq("order_id", orderId);

      if (!items || items.length === 0) return false;

      // Get all pickups for these items
      const { data: pickups } = await supabase
        .from("item_pickups")
        .select("order_item_id")
        .eq("rider_id", user.id)
        .in("order_item_id", items.map(i => i.id));

      return pickups?.length === items.length;
    } catch (error) {
      console.error("Error checking items:", error);
      return false;
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setUpdating(orderId);
    try {
      // For "Picked" status, check if all items are picked
      if (newStatus === 'Picked') {
        const allPicked = await checkAllItemsPicked(orderId);
        if (!allPicked) {
          toast.error("Please mark all items as picked first");
          setUpdating(null);
          return;
        }
      }

      const { error } = await supabase.rpc('update_order_status', {
        p_order_id: orderId,
        p_new_status: newStatus
      });

      if (error) throw error;

      toast.success(`Order marked as ${newStatus}`);
      await fetchAssignments();
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update order status");
    } finally {
      setUpdating(null);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'Pending': 'bg-yellow-500',
      'In Progress': 'bg-blue-500',
      'Picked': 'bg-purple-500',
      'Delivered': 'bg-green-500',
      'Cancelled': 'bg-red-500',
    };
    return colors[status] || 'bg-gray-500';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const activeAssignments = assignments.filter(
    a => a.orders.status !== 'Delivered' && a.orders.status !== 'Cancelled'
  );
  
  const completedAssignments = assignments.filter(
    a => a.orders.status === 'Delivered' || a.orders.status === 'Cancelled'
  );

  const renderOrderCard = (assignment: OrderAssignment) => {
    const order = assignment.orders;
    return (
      <Card key={assignment.id} className="overflow-hidden">
        <CardHeader className="pb-3 bg-muted/50">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg">Order #{order.id.slice(0, 8)}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Assigned {new Date(assignment.assigned_at).toLocaleString()}
              </p>
            </div>
            <Badge className={getStatusColor(order.status)}>
              {order.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div className="flex items-start gap-3">
            <User className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium">{order.profiles.full_name}</p>
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <Phone className="h-3 w-3" />
                {order.profiles.phone}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium">Delivery Address</p>
              <p className="text-sm text-muted-foreground mt-1">
                {order.delivery_address}
              </p>
            </div>
          </div>

          {order.status !== 'Delivered' && order.status !== 'Cancelled' && (
            <>
              <div className="pt-3 border-t">
                <p className="text-sm font-medium mb-2">
                  Order Items: {order.order_items?.length || 0} items
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedOrder({ id: order.id, number: order.id.slice(0, 8) })}
                  className="w-full"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Items & Mark as Picked
                </Button>
              </div>

              {order.status === 'Pending' || order.status === 'In Progress' ? (
                <div className="pt-3 border-t">
                  <Button
                    onClick={() => updateOrderStatus(order.id, 'Picked')}
                    disabled={updating === order.id}
                    className="w-full"
                  >
                    {updating === order.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Mark All Items as Picked'
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    All items must be picked individually first
                  </p>
                </div>
              ) : null}
              
              {order.status === 'Picked' ? (
                <>
                  <AttachmentUpload 
                    orderId={order.id} 
                    onUploadComplete={fetchAssignments}
                  />
                  <div className="pt-3 border-t">
                    <Button
                      onClick={() => updateOrderStatus(order.id, 'Delivered')}
                      disabled={updating === order.id}
                      variant="default"
                      className="w-full"
                    >
                      {updating === order.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Mark as Delivered'
                      )}
                    </Button>
                  </div>
                </>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header isAuthenticated={true} />
      
      <main className="flex-1 py-4 md:py-8 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">My Deliveries</h1>
            <p className="text-muted-foreground mt-1">
              {activeAssignments.length} active assignment{activeAssignments.length !== 1 ? 's' : ''}
            </p>
          </div>

          <Tabs defaultValue="active" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="active">Active Orders</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
            
            <TabsContent value="active" className="space-y-4">
              {activeAssignments.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No active orders</h3>
                    <p className="text-muted-foreground">
                      You'll see your delivery assignments here once they're assigned to you.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {activeAssignments.map(renderOrderCard)}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="history" className="space-y-4">
              {completedAssignments.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No order history</h3>
                    <p className="text-muted-foreground">
                      Completed and cancelled orders will appear here.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {completedAssignments.map(renderOrderCard)}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
      
      <Footer />

      {selectedOrder && (
        <OrderDetailsDialog
          open={!!selectedOrder}
          onOpenChange={(open) => !open && setSelectedOrder(null)}
          orderId={selectedOrder.id}
          orderNumber={selectedOrder.number}
          onPickupComplete={fetchAssignments}
        />
      )}
    </div>
  );
};

export default RiderDashboard;
