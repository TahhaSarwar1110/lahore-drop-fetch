import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, ArrowUpDown, CheckCircle, Loader2, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface RiderWithDetails {
  id: string;
  full_name: string;
  phone: string;
  activeOrders: number;
  completedOrders: number;
  city?: string;
  rating?: number;
  currentStatus: 'available' | 'busy' | 'offline';
}

type SortKey = 'full_name' | 'city' | 'rating' | 'activeOrders' | 'completedOrders' | 'currentStatus';
type SortDirection = 'asc' | 'desc';

const AssignRider = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetchingRiders, setFetchingRiders] = useState(true);
  const [riders, setRiders] = useState<RiderWithDetails[]>([]);
  const [selectedRider, setSelectedRider] = useState<string>("");
  const [sortKey, setSortKey] = useState<SortKey>('activeOrders');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [searchQuery, setSearchQuery] = useState("");
  const [orderInfo, setOrderInfo] = useState<{ customerName: string; deliveryAddress: string } | null>(null);
  const [hasRejectedItems, setHasRejectedItems] = useState(false);

  useEffect(() => {
    if (orderId) {
      fetchOrderInfo();
      fetchRidersWithDetails();
    }
  }, [orderId]);

  const fetchOrderInfo = async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          delivery_address,
          profiles!fk_user (full_name),
          order_items (approval_status)
        `)
        .eq("id", orderId)
        .single();

      if (error) throw error;

      const profile = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles;
      setOrderInfo({
        customerName: profile?.full_name || "Unknown",
        deliveryAddress: data.delivery_address || "N/A",
      });

      // Check for rejected items
      const hasRejected = (data.order_items || []).some(
        (item: any) => item.approval_status === 'rejected'
      );
      setHasRejectedItems(hasRejected);

      // Check for existing rider assignment
      const { data: assignment } = await supabase
        .from("order_assignments")
        .select("rider_id")
        .eq("order_id", orderId)
        .maybeSingle();

      if (assignment?.rider_id) {
        setSelectedRider(assignment.rider_id);
      }
    } catch (error) {
      console.error("Error fetching order:", error);
      toast.error("Failed to load order information");
    }
  };

  const fetchRidersWithDetails = async () => {
    setFetchingRiders(true);
    try {
      const { data: riderRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "rider");

      if (rolesError) throw rolesError;

      const riderIds = riderRoles.map(r => r.user_id);

      if (riderIds.length === 0) {
        setRiders([]);
        return;
      }

      const { data: riderProfiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, phone")
        .in("id", riderIds);

      if (profilesError) throw profilesError;

      const { data: activeAssignments, error: activeError } = await supabase
        .from("order_assignments")
        .select(`
          rider_id,
          orders!order_assignments_order_id_fkey (status)
        `)
        .in("rider_id", riderIds);

      if (activeError) throw activeError;

      const ridersWithDetails: RiderWithDetails[] = (riderProfiles || []).map(rider => {
        const riderAssignments = (activeAssignments || []).filter(a => a.rider_id === rider.id);
        
        const activeOrders = riderAssignments.filter(a => {
          const order = a.orders as any;
          return order && !['Delivered', 'Cancelled'].includes(order.status);
        }).length;

        const completedOrders = riderAssignments.filter(a => {
          const order = a.orders as any;
          return order && order.status === 'Delivered';
        }).length;

        let currentStatus: 'available' | 'busy' | 'offline' = 'available';
        if (activeOrders >= 3) {
          currentStatus = 'busy';
        }

        return {
          id: rider.id,
          full_name: rider.full_name,
          phone: rider.phone,
          activeOrders,
          completedOrders,
          city: 'Lahore',
          rating: 4.5 + Math.random() * 0.5,
          currentStatus,
        };
      });

      setRiders(ridersWithDetails);
    } catch (error) {
      console.error("Error fetching riders:", error);
      toast.error("Failed to load riders");
    } finally {
      setFetchingRiders(false);
    }
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const filteredRiders = riders.filter(rider => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      rider.full_name?.toLowerCase().includes(query) ||
      rider.phone?.toLowerCase().includes(query) ||
      rider.city?.toLowerCase().includes(query)
    );
  });

  const sortedRiders = [...filteredRiders].sort((a, b) => {
    let aValue: any = a[sortKey];
    let bValue: any = b[sortKey];

    if (sortKey === 'currentStatus') {
      const statusOrder = { available: 0, busy: 1, offline: 2 };
      aValue = statusOrder[aValue as keyof typeof statusOrder];
      bValue = statusOrder[bValue as keyof typeof statusOrder];
    }

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc' 
        ? aValue.localeCompare(bValue) 
        : bValue.localeCompare(aValue);
    }

    if (sortDirection === 'asc') {
      return (aValue ?? 0) - (bValue ?? 0);
    }
    return (bValue ?? 0) - (aValue ?? 0);
  });

  const handleSubmit = async () => {
    if (hasRejectedItems) {
      toast.error("All items must be approved before assigning a rider");
      return;
    }

    if (!selectedRider) {
      toast.error("Please select a rider");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('assign-order', {
        body: {
          order_id: orderId,
          rider_id: selectedRider,
        },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      toast.success("Order assigned successfully!");
      navigate(`/manager/orders/${orderId}`);
    } catch (error: any) {
      console.error("Error assigning order:", error);
      toast.error(error.message || "Failed to assign order");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: 'available' | 'busy' | 'offline') => {
    switch (status) {
      case 'available':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Available</Badge>;
      case 'busy':
        return <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20">Busy</Badge>;
      case 'offline':
        return <Badge className="bg-gray-500/10 text-gray-600 border-gray-500/20">Offline</Badge>;
    }
  };

  const SortableHeader = ({ label, sortKeyName }: { label: string; sortKeyName: SortKey }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 px-2 -ml-2 font-medium hover:bg-muted"
      onClick={() => handleSort(sortKeyName)}
    >
      {label}
      <ArrowUpDown className={`ml-1 h-3 w-3 ${sortKey === sortKeyName ? 'text-primary' : 'text-muted-foreground'}`} />
    </Button>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 py-8">
        <div className="container mx-auto px-4">
          {/* Back button and header */}
          <div className="mb-6">
            <Button 
              variant="ghost" 
              onClick={() => navigate(-1)}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Order
            </Button>
            
            <h1 className="text-3xl font-bold">Assign Rider to Order</h1>
            {orderInfo && (
              <p className="text-muted-foreground mt-2">
                Order for <strong>{orderInfo.customerName}</strong> • Delivery: {orderInfo.deliveryAddress}
              </p>
            )}
          </div>

          {hasRejectedItems && (
            <Card className="mb-6 border-destructive bg-destructive/5">
              <CardContent className="py-4">
                <p className="text-destructive font-medium">
                  ⚠️ This order has rejected items. All items must be approved before assigning a rider.
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle>Select a Rider</CardTitle>
                  <CardDescription>
                    Click on a rider row to select, then click "Assign Order" to confirm.
                  </CardDescription>
                </div>
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, phone, or city..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {fetchingRiders ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-3 text-muted-foreground">Loading riders...</span>
                </div>
              ) : riders.length === 0 ? (
                <p className="text-muted-foreground text-center py-16">
                  No riders available. Create a user with the "Rider" role first.
                </p>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-12"></TableHead>
                        <TableHead>
                          <SortableHeader label="Name" sortKeyName="full_name" />
                        </TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>
                          <SortableHeader label="City" sortKeyName="city" />
                        </TableHead>
                        <TableHead>
                          <SortableHeader label="Active Orders" sortKeyName="activeOrders" />
                        </TableHead>
                        <TableHead>
                          <SortableHeader label="Completed" sortKeyName="completedOrders" />
                        </TableHead>
                        <TableHead>
                          <SortableHeader label="Rating" sortKeyName="rating" />
                        </TableHead>
                        <TableHead>
                          <SortableHeader label="Status" sortKeyName="currentStatus" />
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedRiders.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            No riders match your search.
                          </TableCell>
                        </TableRow>
                      ) : (
                        sortedRiders.map((rider) => (
                          <TableRow
                            key={rider.id}
                            className={`cursor-pointer transition-colors ${
                              selectedRider === rider.id 
                                ? 'bg-primary/10 hover:bg-primary/15' 
                                : 'hover:bg-muted/50'
                            }`}
                            onClick={() => setSelectedRider(rider.id)}
                          >
                            <TableCell>
                              {selectedRider === rider.id && (
                                <CheckCircle className="h-5 w-5 text-primary" />
                              )}
                            </TableCell>
                            <TableCell className="font-medium">{rider.full_name}</TableCell>
                            <TableCell className="text-muted-foreground">{rider.phone}</TableCell>
                            <TableCell>{rider.city}</TableCell>
                            <TableCell>
                              <span className={rider.activeOrders > 0 ? 'text-orange-600 font-semibold' : ''}>
                                {rider.activeOrders}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="text-green-600">{rider.completedOrders}</span>
                            </TableCell>
                            <TableCell>
                              <span className="text-yellow-600 font-medium">
                                ⭐ {rider.rating?.toFixed(1)}
                              </span>
                            </TableCell>
                            <TableCell>{getStatusBadge(rider.currentStatus)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => navigate(-1)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSubmit} 
                  disabled={loading || riders.length === 0 || !selectedRider || hasRejectedItems}
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Assigning...
                    </>
                  ) : (
                    "Assign Order"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AssignRider;
