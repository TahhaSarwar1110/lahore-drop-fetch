import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserPlus, Loader2, ArrowUpDown, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface AssignOrderDialogProps {
  orderId: string;
  currentRiderId?: string;
  onAssigned: () => void;
  hasRejectedItems?: boolean;
}

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

export const AssignOrderDialog = ({ orderId, currentRiderId, onAssigned, hasRejectedItems = false }: AssignOrderDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchingRiders, setFetchingRiders] = useState(false);
  const [riders, setRiders] = useState<RiderWithDetails[]>([]);
  const [selectedRider, setSelectedRider] = useState<string>(currentRiderId || "");
  const [sortKey, setSortKey] = useState<SortKey>('activeOrders');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  useEffect(() => {
    if (open) {
      fetchRidersWithDetails();
    }
  }, [open]);

  const fetchRidersWithDetails = async () => {
    setFetchingRiders(true);
    try {
      // Get all users with rider role
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

      // Get rider profiles
      const { data: riderProfiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, phone")
        .in("id", riderIds);

      if (profilesError) throw profilesError;

      // Get active orders count for each rider
      const { data: activeAssignments, error: activeError } = await supabase
        .from("order_assignments")
        .select(`
          rider_id,
          orders!order_assignments_order_id_fkey (
            status
          )
        `)
        .in("rider_id", riderIds);

      if (activeError) throw activeError;

      // Process riders with order counts
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

        // Determine rider status based on active orders
        let currentStatus: 'available' | 'busy' | 'offline' = 'available';
        if (activeOrders >= 3) {
          currentStatus = 'busy';
        } else if (activeOrders > 0) {
          currentStatus = 'available';
        }

        return {
          id: rider.id,
          full_name: rider.full_name,
          phone: rider.phone,
          activeOrders,
          completedOrders,
          city: 'Lahore', // Default city
          rating: 4.5 + Math.random() * 0.5, // Placeholder rating
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

  const sortedRiders = [...riders].sort((a, b) => {
    let aValue: any = a[sortKey];
    let bValue: any = b[sortKey];

    // Handle status sorting
    if (sortKey === 'currentStatus') {
      const statusOrder = { available: 0, busy: 1, offline: 2 };
      aValue = statusOrder[aValue as keyof typeof statusOrder];
      bValue = statusOrder[bValue as keyof typeof statusOrder];
    }

    // Handle string comparison
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc' 
        ? aValue.localeCompare(bValue) 
        : bValue.localeCompare(aValue);
    }

    // Handle number comparison
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
      setOpen(false);
      onAssigned();
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <UserPlus className="h-4 w-4 mr-1" />
          {currentRiderId ? 'Reassign' : 'Assign Rider'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Assign Order to Rider</DialogTitle>
          <DialogDescription>
            Select a rider to assign this order. Click column headers to sort.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          {fetchingRiders ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Loading riders...</span>
            </div>
          ) : riders.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No riders available. Create a user with the "Rider" role first.
            </p>
          ) : (
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
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
                  {sortedRiders.map((rider) => (
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
                          <CheckCircle className="h-4 w-4 text-primary" />
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
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </div>

        <DialogFooter>
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading || riders.length === 0 || !selectedRider}
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};