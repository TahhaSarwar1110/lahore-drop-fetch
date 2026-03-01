import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MapPin, Users, Eye, Search, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
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

type SortField = "full_name" | "phone" | "assignedOrdersCount" | "currentOrderStatus" | "hasLocation";
type SortDirection = "asc" | "desc";

export const RiderTrackingGrid = () => {
  const [riders, setRiders] = useState<RiderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRider, setSelectedRider] = useState<RiderData | null>(null);
  const [mapDialogOpen, setMapDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("full_name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 ml-1" />;
    }
    return sortDirection === "asc" 
      ? <ArrowUp className="h-4 w-4 ml-1" /> 
      : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  const filteredAndSortedRiders = useMemo(() => {
    let result = [...riders];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (rider) =>
          rider.full_name.toLowerCase().includes(query) ||
          rider.phone.includes(query) ||
          (rider.currentOrderStatus?.toLowerCase().includes(query))
      );
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "full_name":
          comparison = a.full_name.localeCompare(b.full_name);
          break;
        case "phone":
          comparison = a.phone.localeCompare(b.phone);
          break;
        case "assignedOrdersCount":
          comparison = a.assignedOrdersCount - b.assignedOrdersCount;
          break;
        case "currentOrderStatus":
          comparison = (a.currentOrderStatus || "").localeCompare(b.currentOrderStatus || "");
          break;
        case "hasLocation":
          comparison = (a.hasLocation ? 1 : 0) - (b.hasLocation ? 1 : 0);
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [riders, searchQuery, sortField, sortDirection]);

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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Rider Tracking
            </CardTitle>
            <div className="flex items-center gap-3">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, phone, status..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Badge variant="default" className="flex items-center gap-1 whitespace-nowrap">
                <Users className="h-3 w-3" />
                {riders.filter((r) => r.hasLocation).length} Online
              </Badge>
            </div>
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
            <>
              <div className="bg-card rounded-lg border border-border p-3 mb-4">
                <p className="text-sm text-muted-foreground">
                  Showing <span className="font-semibold text-foreground">{filteredAndSortedRiders.length}</span> of{" "}
                  <span className="font-semibold text-foreground">{riders.length}</span> riders
                </p>
              </div>
              
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 font-semibold"
                          onClick={() => handleSort("full_name")}
                        >
                          Name
                          {getSortIcon("full_name")}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 font-semibold"
                          onClick={() => handleSort("phone")}
                        >
                          Phone
                          {getSortIcon("phone")}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 font-semibold"
                          onClick={() => handleSort("hasLocation")}
                        >
                          Status
                          {getSortIcon("hasLocation")}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 font-semibold"
                          onClick={() => handleSort("assignedOrdersCount")}
                        >
                          Assigned Orders
                          {getSortIcon("assignedOrdersCount")}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 font-semibold"
                          onClick={() => handleSort("currentOrderStatus")}
                        >
                          Current Status
                          {getSortIcon("currentOrderStatus")}
                        </Button>
                      </TableHead>
                      <TableHead>Last Seen</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedRiders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No riders match your search criteria
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAndSortedRiders.map((rider) => (
                        <TableRow key={rider.id}>
                          <TableCell className="font-medium">{rider.full_name}</TableCell>
                          <TableCell>{rider.phone}</TableCell>
                          <TableCell>
                            <Badge variant={rider.hasLocation ? "default" : "secondary"}>
                              {rider.hasLocation ? "Online" : "Offline"}
                            </Badge>
                          </TableCell>
                          <TableCell>{rider.assignedOrdersCount}</TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(rider.currentOrderStatus)}>
                              {rider.currentOrderStatus || "N/A"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {rider.lastUpdated
                              ? new Date(rider.lastUpdated).toLocaleTimeString()
                              : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewLocation(rider)}
                              disabled={!rider.hasLocation}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View Location
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
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
