import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Loader2, Package } from "lucide-react";
import { toast } from "sonner";
import { ActiveRidersGrid } from "@/components/manager/ActiveRidersGrid";
import { ManagerOrdersTable } from "@/components/manager/ManagerOrdersTable";

interface Order {
  id: string;
  delivery_address: string;
  status: string;
  created_at: string;
  user_id: string;
  manager_feedback: string | null;
  confirmed_at: string | null;
  additional_charges: number;
  charges_description: string | null;
  total_price?: number;
  profiles: {
    full_name: string;
    phone: string;
  };
  order_assignments?: {
    rider_id: string;
    profiles: {
      full_name: string;
      phone: string;
    };
  } | null;
}

const ManagerDashboard = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/login");
        return;
      }

      setIsAuthenticated(true);

      // Check if user has manager or admin role
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .in("role", ["manager", "admin"]);

      if (rolesError) {
        console.error("Error checking roles:", rolesError);
        toast.error("Failed to verify manager role");
        navigate("/");
        return;
      }

      if (!roles || roles.length === 0) {
        toast.error("Access denied. Manager role required.");
        navigate("/");
        return;
      }

      fetchOrders();
    } catch (error) {
      console.error("Auth check error:", error);
      toast.error("Authentication error");
      navigate("/");
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          profiles!fk_user (
            full_name,
            phone
          ),
          order_assignments (
            rider_id,
            profiles!order_assignments_rider_id_fkey (
              full_name,
              phone
            )
          ),
          order_items (
            id,
            item_data,
            approval_status
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Transform the data to ensure profiles is an object and calculate total price
      const transformedData = (data || []).map(order => {
        // Calculate total price from approved items only
        const itemsTotal = (order.order_items || [])
          .filter((item: any) => item.approval_status !== 'rejected')
          .reduce((sum: number, item: any) => {
            const itemData = item.item_data as any;
            const price = parseFloat(itemData?.price || 0);
            const quantity = parseInt(itemData?.quantity || 1, 10);
            return sum + (price * quantity);
          }, 0);
        
        // Total = items total + delivery/additional charges
        const deliveryCharges = order.additional_charges || 0;
        const totalPrice = itemsTotal + deliveryCharges;
        
        return {
          ...order,
          profiles: Array.isArray(order.profiles) ? order.profiles[0] : order.profiles,
          total_price: totalPrice
        };
      });
      
      setOrders(transformedData);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (orderId: string) => {
    navigate(`/manager/orders/${orderId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 py-8">
        <div className="container mx-auto px-4 space-y-8">
          <h1 className="text-3xl font-bold">Manager Dashboard</h1>

          {/* Active Riders Grid */}
          <ActiveRidersGrid />

          {/* Orders Table */}
          <ManagerOrdersTable 
            orders={orders} 
            onViewDetails={handleViewDetails} 
          />
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ManagerDashboard;
