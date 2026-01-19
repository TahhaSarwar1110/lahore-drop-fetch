import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Loader2 } from "lucide-react";
import { LocationSharing } from "@/components/rider/LocationSharing";
import { RiderOrdersTable } from "@/components/rider/RiderOrdersTable";

interface OrderAssignment {
  id: string;
  order_id: string;
  assigned_at: string;
  orders: {
    id: string;
    created_at: string;
    delivery_address: string;
    delivery_latitude: number | null;
    delivery_longitude: number | null;
    status: string;
    payment_status: string | null;
    additional_charges: number | null;
    profiles: {
      full_name: string;
      phone: string;
    };
    order_items: {
      id: string;
      item_type: string;
      item_data: any;
      approval_status: string | null;
    }[];
  };
  total_price: number;
}

const RiderDashboard = () => {
  const [assignments, setAssignments] = useState<OrderAssignment[]>([]);
  const [loading, setLoading] = useState(true);
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
            delivery_latitude,
            delivery_longitude,
            status,
            payment_status,
            additional_charges,
            profiles (
              full_name,
              phone
            ),
            order_items (
              id,
              item_type,
              item_data,
              approval_status
            )
          )
        `)
        .eq("rider_id", user.id)
        .order("assigned_at", { ascending: false });

      if (error) throw error;

      // Calculate total price for each order
      const assignmentsWithTotal = (data || []).map(assignment => {
        const items = assignment.orders.order_items || [];
        const approvedItems = items.filter(item => item.approval_status === 'approved' || !item.approval_status);
        
        const itemsTotal = approvedItems.reduce((sum, item) => {
          const itemData = item.item_data as Record<string, any> | null;
          const price = Number(itemData?.["Price (PKR)"] || itemData?.price || itemData?.["Expected Price (PKR)"] || 0);
          return sum + price;
        }, 0);
        
        const additionalCharges = Number(assignment.orders.additional_charges || 0);
        
        return {
          ...assignment,
          total_price: itemsTotal + additionalCharges
        };
      });

      setAssignments(assignmentsWithTotal);
    } catch (error) {
      console.error("Error fetching assignments:", error);
      toast.error("Failed to load assignments");
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (orderId: string) => {
    navigate(`/rider/order/${orderId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <LocationSharing />
      
      <main className="flex-1 py-4 md:py-8 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Rider Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              {assignments.filter(a => a.orders.status !== 'Delivered' && a.orders.status !== 'Cancelled').length} active deliveries
            </p>
          </div>

          <RiderOrdersTable 
            assignments={assignments}
            onViewDetails={handleViewDetails}
          />
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default RiderDashboard;
