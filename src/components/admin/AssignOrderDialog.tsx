import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserPlus, Loader2, User, Phone, MapPin, Package, Star, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

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

export const AssignOrderDialog = ({ orderId, currentRiderId, onAssigned, hasRejectedItems = false }: AssignOrderDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchingRiders, setFetchingRiders] = useState(false);
  const [riders, setRiders] = useState<RiderWithDetails[]>([]);
  const [selectedRider, setSelectedRider] = useState<string>(currentRiderId || "");

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

      // Sort by active orders (available riders first)
      ridersWithDetails.sort((a, b) => a.activeOrders - b.activeOrders);

      setRiders(ridersWithDetails);
    } catch (error) {
      console.error("Error fetching riders:", error);
      toast.error("Failed to load riders");
    } finally {
      setFetchingRiders(false);
    }
  };

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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <UserPlus className="h-4 w-4 mr-1" />
          {currentRiderId ? 'Reassign' : 'Assign Rider'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Assign Order to Rider</DialogTitle>
          <DialogDescription>
            Select a rider to assign this order for delivery. Riders are sorted by availability.
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
            <ScrollArea className="h-[350px] pr-4">
              <div className="space-y-3">
                <Label className="text-sm font-medium">Select a Rider</Label>
                {riders.map((rider) => (
                  <Card
                    key={rider.id}
                    className={`p-4 cursor-pointer transition-all hover:border-primary/50 ${
                      selectedRider === rider.id 
                        ? 'border-primary bg-primary/5 ring-1 ring-primary' 
                        : 'border-border'
                    }`}
                    onClick={() => setSelectedRider(rider.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-foreground">{rider.full_name}</h4>
                            {selectedRider === rider.id && (
                              <CheckCircle className="h-4 w-4 text-primary" />
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {rider.phone}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {rider.city}
                            </span>
                          </div>
                        </div>
                      </div>
                      {getStatusBadge(rider.currentStatus)}
                    </div>
                    
                    <div className="mt-3 pt-3 border-t border-border flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1.5">
                        <Package className="h-4 w-4 text-orange-500" />
                        <span className="text-muted-foreground">
                          <strong className="text-foreground">{rider.activeOrders}</strong> Active Orders
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-muted-foreground">
                          <strong className="text-foreground">{rider.completedOrders}</strong> Completed
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        <span className="text-foreground font-medium">
                          {rider.rating?.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
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
