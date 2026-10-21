import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MapPin, Users, Search, Loader2, ClipboardList, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface RiderWithOrder {
  rider_id: string;
  rider_name: string;
  rider_phone: string;
  latitude: number | null;
  longitude: number | null;
  last_updated: string | null;
  active_orders: number;
  orders: { id: string; status: string }[];
}

export const ActiveRidersGrid = () => {
  const [riders, setRiders] = useState<RiderWithOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRider, setSelectedRider] = useState<RiderWithOrder | null>(null);
  const [mapDialogOpen, setMapDialogOpen] = useState(false);
  const [ordersDialogRider, setOrdersDialogRider] = useState<RiderWithOrder | null>(null);

  useEffect(() => {
    fetchActiveRiders();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('active-riders-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_assignments'
        },
        () => fetchActiveRiders()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rider_locations'
        },
        () => fetchActiveRiders()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchActiveRiders = async () => {
    try {
      setLoading(true);

      // Get riders with active assignments
      const { data: assignments, error: assignError } = await supabase
        .from("order_assignments")
        .select(`
          rider_id,
          orders!inner (
            id,
            status
          ),
          profiles!order_assignments_rider_id_fkey (
            full_name,
            phone
          )
        `);

      if (assignError) throw assignError;

      // Get rider locations
      const { data: locations } = await supabase
        .from("rider_locations")
        .select("*");

      // Aggregate data by rider
      const riderMap = new Map<string, RiderWithOrder>();

      assignments?.forEach((assignment: any) => {
        const riderId = assignment.rider_id;
        const order = assignment.orders;
        const isActive = !["Delivered", "Cancelled"].includes(order?.status);

        if (!isActive) return;

        const location = locations?.find(loc => loc.rider_id === riderId);

        const orderEntry = { id: order?.id ?? "", status: order?.status ?? "" };

        if (riderMap.has(riderId)) {
          const existing = riderMap.get(riderId);
          if (existing) {
            existing.active_orders += 1;
            existing.orders.push(orderEntry);
          }
        } else {
          riderMap.set(riderId, {
            rider_id: riderId,
            rider_name: assignment.profiles?.full_name || "Unknown",
            rider_phone: assignment.profiles?.phone || "-",
            latitude: location?.latitude ?? null,
            longitude: location?.longitude ?? null,
            last_updated: location?.updated_at || null,
            active_orders: 1,
            orders: [orderEntry],
          });
        }
      });

      setRiders(Array.from(riderMap.values()));
    } catch (error) {
      console.error("Error fetching active riders:", error);
    } finally {
      setLoading(false);
    }
  };

  const navigate = useNavigate();

  const handleViewLocation = (rider: RiderWithOrder) => {
    setSelectedRider(rider);
    setMapDialogOpen(true);
  };

  const handleViewOrders = (rider: RiderWithOrder) => {
    setOrdersDialogRider(rider);
  };

  const openOrder = (orderId: string) => {
    setOrdersDialogRider(null);
    navigate(`/manager/orders/${orderId}`);
  };

  const filteredRiders = riders.filter(rider =>
    [rider.rider_name, rider.rider_phone, ...rider.orders.map(order => `#${order.id.slice(0, 8)} ${order.status}`)].some(value =>
      value.toLowerCase().includes(searchQuery.trim().toLowerCase())));

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Active Riders
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
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
              Active Riders
            </CardTitle>
            <Badge variant="default">
              {riders.length} Active
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label="Search active riders" placeholder="Search by name, phone or status..." value={searchQuery} onChange={event => setSearchQuery(event.target.value)} className="pl-9" />
          </div>
          <div className="rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rider</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-center">Active Orders</TableHead>
                  <TableHead>Assigned Orders</TableHead>
                  <TableHead>Last Location Update</TableHead>
                  <TableHead className="text-right">Location</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRiders.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">{riders.length === 0 ? "No active riders at the moment" : "No riders match your search"}</TableCell></TableRow>
                ) : filteredRiders.map(rider => (
                  <TableRow key={rider.rider_id}>
                    <TableCell className="font-medium">{rider.rider_name}</TableCell>
                    <TableCell className="whitespace-nowrap">{rider.rider_phone}</TableCell>
                    <TableCell className="text-center"><Badge variant="secondary">{rider.active_orders}</Badge></TableCell>
                    <TableCell className="text-center">
                      <Button size="sm" variant="outline" onClick={() => handleViewOrders(rider)}>
                        <ClipboardList className="mr-1 h-4 w-4" />
                        View Orders
                      </Button>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{rider.last_updated ? new Date(rider.last_updated).toLocaleString() : "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => handleViewLocation(rider)} disabled={rider.latitude === null || rider.longitude === null}>
                        <MapPin className="mr-1 h-4 w-4" />
                        {rider.latitude !== null && rider.longitude !== null ? "View Location" : "Unavailable"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={mapDialogOpen} onOpenChange={setMapDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {selectedRider?.rider_name}'s Location
            </DialogTitle>
          </DialogHeader>
          {selectedRider && selectedRider.latitude !== null && selectedRider.longitude !== null && (
            <RiderLocationMap
              latitude={selectedRider.latitude}
              longitude={selectedRider.longitude}
              riderName={selectedRider.rider_name}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

interface RiderLocationMapProps {
  latitude: number;
  longitude: number;
  riderName: string;
}

const RiderLocationMap = ({ latitude, longitude, riderName }: RiderLocationMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    const map = L.map(mapRef.current).setView([latitude, longitude], 15);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    const riderIcon = L.divIcon({
      className: 'custom-rider-marker',
      html: `<div style="background-color: #3b82f6; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.4);">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"></path><circle cx="7" cy="17" r="2"></circle><path d="M9 17h6"></path><circle cx="17" cy="17" r="2"></circle></svg>
      </div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    });

    L.marker([latitude, longitude], { icon: riderIcon })
      .addTo(map)
      .bindPopup(`<strong>🏍️ ${riderName}</strong>`)
      .openPopup();

    return () => {
      map.remove();
    };
  }, [latitude, longitude, riderName]);

  return (
    <div 
      ref={mapRef} 
      className="w-full h-80 rounded-lg border border-border"
    />
  );
};
