import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface RiderLocation {
  id: string;
  rider_id: string;
  latitude: number;
  longitude: number;
  updated_at: string;
  profiles?: {
    full_name: string;
    phone: string;
  };
}

export const RiderTrackingMap = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const [riderLocations, setRiderLocations] = useState<RiderLocation[]>([]);
  const [activeRiders, setActiveRiders] = useState(0);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Initialize map
    const map = L.map(mapContainer.current).setView([31.5204, 74.3587], 12);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    mapInstance.current = map;

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const fetchRiderLocations = async () => {
      const { data, error } = await supabase
        .from("rider_locations")
        .select("*");

      if (error) {
        console.error("Error fetching rider locations:", error);
        return;
      }

      // Fetch profiles separately
      if (data && data.length > 0) {
        const riderIds = data.map(loc => loc.rider_id);
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name, phone")
          .in("id", riderIds);

        const locationsWithProfiles = data.map(loc => ({
          ...loc,
          profiles: profilesData?.find(p => p.id === loc.rider_id)
        }));

        setRiderLocations(locationsWithProfiles);
        setActiveRiders(locationsWithProfiles.length);
        updateMarkers(locationsWithProfiles);
      } else {
        setRiderLocations([]);
        setActiveRiders(0);
      }
    };

    fetchRiderLocations();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('rider-locations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rider_locations'
        },
        (payload) => {
          console.log('Rider location update:', payload);
          fetchRiderLocations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const updateMarkers = (locations: RiderLocation[]) => {
    if (!mapInstance.current) return;

    // Create custom rider icon
    const riderIcon = L.divIcon({
      className: 'custom-rider-marker',
      html: `<div style="background-color: #3b82f6; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.4);">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"></path><circle cx="7" cy="17" r="2"></circle><path d="M9 17h6"></path><circle cx="17" cy="17" r="2"></circle></svg>
      </div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    });

    // Remove markers that no longer exist
    markersRef.current.forEach((marker, riderId) => {
      if (!locations.find(loc => loc.rider_id === riderId)) {
        marker.remove();
        markersRef.current.delete(riderId);
      }
    });

    // Add or update markers
    locations.forEach((location) => {
      const existingMarker = markersRef.current.get(location.rider_id);
      const latlng: [number, number] = [location.latitude, location.longitude];

      if (existingMarker) {
        existingMarker.setLatLng(latlng);
      } else {
        const marker = L.marker(latlng, { icon: riderIcon })
          .addTo(mapInstance.current!);
        
        const riderName = location.profiles?.full_name || "Unknown Rider";
        const updateTime = new Date(location.updated_at).toLocaleTimeString();
        
        marker.bindPopup(`
          <div style="font-family: system-ui, sans-serif; min-width: 150px;">
            <strong style="font-size: 14px;">🏍️ ${riderName}</strong>
            <br/>
            <span style="font-size: 12px; color: #666;">Last updated: ${updateTime}</span>
            ${location.profiles?.phone ? `<br/><span style="font-size: 12px;">📞 ${location.profiles.phone}</span>` : ''}
          </div>
        `);
        
        markersRef.current.set(location.rider_id, marker);
      }
    });

    // Fit bounds if there are markers
    if (locations.length > 0) {
      const bounds = locations.map(loc => [loc.latitude, loc.longitude] as [number, number]);
      mapInstance.current.fitBounds(bounds, { padding: [50, 50] });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Live Rider Tracking
          </CardTitle>
          <Badge variant="default" className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {activeRiders} Active
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {activeRiders === 0 ? (
          <div className="flex items-center justify-center h-96 bg-muted rounded-lg">
            <div className="text-center text-muted-foreground">
              <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No active riders at the moment</p>
              <p className="text-sm mt-2">Riders will appear here when they're online</p>
            </div>
          </div>
        ) : (
          <div 
            ref={mapContainer} 
            className="w-full h-96 rounded-lg border border-border"
          />
        )}
      </CardContent>
    </Card>
  );
};