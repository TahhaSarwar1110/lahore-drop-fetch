import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Users, Phone, Package, Loader2 } from "lucide-react";
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
  current_order_status: string | null;
}

export const ActiveRidersGrid = () => {
  const [riders, setRiders] = useState<RiderWithOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRider, setSelectedRider] = useState<RiderWithOrder | null>(null);
  const [mapDialogOpen, setMapDialogOpen] = useState(false);

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

        if (riderMap.has(riderId)) {
          const existing = riderMap.get(riderId)!;
          existing.active_orders += 1;
        } else {
          riderMap.set(riderId, {
            rider_id: riderId,
            rider_name: assignment.profiles?.full_name || "Unknown",
            rider_phone: assignment.profiles?.phone || "-",
            latitude: location?.latitude || null,
            longitude: location?.longitude || null,
            last_updated: location?.updated_at || null,
            active_orders: 1,
            current_order_status: order?.status || null,
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

  const handleViewLocation = (rider: RiderWithOrder) => {
    setSelectedRider(rider);
    setMapDialogOpen(true);
  };

  const getStatusColor = (status: string | null) => {
    const colors: Record<string, string> = {
      "Pending": "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
      "Order Confirmed": "bg-blue-500/10 text-blue-600 border-blue-500/20",
      "Shopper Assigned": "bg-purple-500/10 text-purple-600 border-purple-500/20",
      "Purchasing": "bg-orange-500/10 text-orange-600 border-orange-500/20",
      "In Delivery": "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
      "Picked": "bg-teal-500/10 text-teal-600 border-teal-500/20",
    };
    return colors[status || ""] || "bg-muted text-muted-foreground";
  };

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
        <CardContent>
          {riders.length === 0 ? (
            <div className="flex items-center justify-center h-32 bg-muted rounded-lg">
              <div className="text-center text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No active riders at the moment</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {riders.map((rider) => (
                <Card key={rider.rider_id} className="border shadow-sm">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-sm truncate">{rider.rider_name}</h3>
                      <Badge variant="outline" className="text-xs">
                        <Package className="h-3 w-3 mr-1" />
                        {rider.active_orders}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      {rider.rider_phone}
                    </div>

                    {rider.current_order_status && (
                      <Badge variant="outline" className={`text-xs ${getStatusColor(rider.current_order_status)}`}>
                        {rider.current_order_status}
                      </Badge>
                    )}

                    {rider.last_updated && (
                      <p className="text-xs text-muted-foreground">
                        Last seen: {new Date(rider.last_updated).toLocaleTimeString()}
                      </p>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={() => handleViewLocation(rider)}
                      disabled={!rider.latitude || !rider.longitude}
                    >
                      <MapPin className="h-4 w-4 mr-1" />
                      {rider.latitude && rider.longitude ? "View Location" : "Location Unavailable"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
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
          {selectedRider && selectedRider.latitude && selectedRider.longitude && (
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
