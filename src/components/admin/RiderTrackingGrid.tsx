import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MapPin, Users, Phone, Package, Eye } from "lucide-react";
import { SingleRiderMap } from "@/components/map/SingleRiderMap";

interface RiderData {
  id: string;
  full_name: string;
  phone: string;
  hasLocation: boolean;
  latitude?: number;
  longitude?: number;
  lastUpdated?: string;
  assignedOrdersCount: number;
  currentOrderStatus?: string;
}

export const RiderTrackingGrid = () => {
  const [riders, setRiders] = useState<RiderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRider, setSelectedRider] = useState<RiderData | null>(null);
  const [mapDialogOpen, setMapDialogOpen] = useState(false);

  useEffect(() => {
    fetchRiders();

    // Subscribe to realtime updates for rider locations
    const channel = supabase
      .channel('rider-locations-grid')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rider_locations'
        },
        () => {
          fetchRiders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchRiders = async () => {
    try {
      // Fetch all users with rider role
      const { data: riderRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "rider");

      if (rolesError) throw rolesError;

      if (!riderRoles || riderRoles.length === 0) {
        setRiders([]);
        setLoading(false);
        return;
      }

      const riderIds = riderRoles.map((r) => r.user_id);

      // Fetch rider profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, phone")
        .in("id", riderIds);

      if (profilesError) throw profilesError;

      // Fetch rider locations
      const { data: locations, error: locationsError } = await supabase
        .from("rider_locations")
        .select("rider_id, latitude, longitude, updated_at")
        .in("rider_id", riderIds);

      if (locationsError) throw locationsError;

      // Fetch order assignments with order details
      const { data: assignments, error: assignmentsError } = await supabase
        .from("order_assignments")
        .select(`
          rider_id,
          orders (
            id,
            status
          )
        `)
        .in("rider_id", riderIds);

      if (assignmentsError) throw assignmentsError;

      // Build rider data
      const riderData: RiderData[] = (profiles || []).map((profile) => {
        const location = locations?.find((l) => l.rider_id === profile.id);
        const riderAssignments = assignments?.filter((a) => a.rider_id === profile.id) || [];
        
        // Get current active orders (not delivered/cancelled)
        const activeOrders = riderAssignments.filter(
          (a) => a.orders && !["Delivered", "Cancelled"].includes(a.orders.status)
        );
        
        // Get the most recent order status
        const currentOrder = activeOrders.length > 0 ? activeOrders[0]?.orders : null;

        return {
          id: profile.id,
          full_name: profile.full_name,
          phone: profile.phone,
          hasLocation: !!location,
          latitude: location?.latitude,
          longitude: location?.longitude,
          lastUpdated: location?.updated_at,
          assignedOrdersCount: riderAssignments.length,
          currentOrderStatus: currentOrder?.status || (activeOrders.length === 0 ? "Available" : undefined),
        };
      });

      setRiders(riderData);
    } catch (error) {
      console.error("Error fetching riders:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewLocation = (rider: RiderData) => {
    setSelectedRider(rider);
    setMapDialogOpen(true);
  };

  const getStatusBadgeVariant = (status?: string) => {
    if (!status) return "secondary";
    switch (status) {
      case "Available":
        return "default";
      case "In Delivery":
        return "destructive";
      case "Purchasing":
        return "secondary";
      default:
        return "outline";
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center text-muted-foreground">
            <Users className="h-8 w-8 animate-pulse mx-auto mb-2" />
            <p>Loading riders...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Rider Tracking
            </CardTitle>
            <Badge variant="default" className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {riders.filter((r) => r.hasLocation).length} Online
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {riders.length === 0 ? (
            <div className="flex items-center justify-center h-48 bg-muted rounded-lg">
              <div className="text-center text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No riders registered</p>
                <p className="text-sm mt-2">Add riders from User Management</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {riders.map((rider) => (
                <Card key={rider.id} className="bg-muted/30">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-foreground">{rider.full_name}</h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {rider.phone}
                        </p>
                      </div>
                      <Badge
                        variant={rider.hasLocation ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {rider.hasLocation ? "Online" : "Offline"}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Package className="h-3 w-3" />
                          Assigned Orders
                        </span>
                        <span className="font-medium">{rider.assignedOrdersCount}</span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Current Status</span>
                        <Badge variant={getStatusBadgeVariant(rider.currentOrderStatus)}>
                          {rider.currentOrderStatus || "N/A"}
                        </Badge>
                      </div>

                      {rider.lastUpdated && (
                        <p className="text-xs text-muted-foreground">
                          Last seen: {new Date(rider.lastUpdated).toLocaleTimeString()}
                        </p>
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => handleViewLocation(rider)}
                      disabled={!rider.hasLocation}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      {rider.hasLocation ? "View Live Location" : "Location Unavailable"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={mapDialogOpen} onOpenChange={setMapDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {selectedRider?.full_name}'s Location
            </DialogTitle>
          </DialogHeader>
          {selectedRider && selectedRider.latitude && selectedRider.longitude && (
            <SingleRiderMap
              latitude={selectedRider.latitude}
              longitude={selectedRider.longitude}
              riderName={selectedRider.full_name}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
