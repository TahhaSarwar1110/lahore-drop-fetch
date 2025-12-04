import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin } from "lucide-react";

interface Location {
  lat: number;
  lng: number;
  label: string;
  type: "pickup" | "delivery";
}

interface RiderMapViewProps {
  locations: Location[];
  height?: string;
}

export const RiderMapView = ({ locations, height = "400px" }: RiderMapViewProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current || locations.length === 0) return;

    // Clean up existing map
    if (mapInstance.current) {
      mapInstance.current.remove();
      mapInstance.current = null;
    }

    // Create custom icons using divIcon
    const pickupIcon = L.divIcon({
      className: 'custom-marker-pickup',
      html: `<div style="background-color: #f59e0b; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
      </div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 30],
    });

    const deliveryIcon = L.divIcon({
      className: 'custom-marker-delivery',
      html: `<div style="background-color: #10b981; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
      </div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 30],
    });

    // Initialize map
    const center: [number, number] = [locations[0].lat, locations[0].lng];
    const map = L.map(mapContainer.current).setView(center, 13);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Add markers
    const bounds: [number, number][] = [];
    locations.forEach((location) => {
      const marker = L.marker(
        [location.lat, location.lng],
        { icon: location.type === "pickup" ? pickupIcon : deliveryIcon }
      ).addTo(map);
      
      marker.bindPopup(`
        <div style="font-family: system-ui, sans-serif;">
          <strong>${location.type === "pickup" ? "📦 Pickup" : "🏠 Delivery"}</strong>
          <br/>${location.label}
        </div>
      `);
      
      bounds.push([location.lat, location.lng]);
    });

    // Fit map to show all markers
    if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }

    mapInstance.current = map;

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [locations]);

  if (locations.length === 0) {
    return (
      <div 
        className="flex items-center justify-center bg-muted rounded-lg"
        style={{ height }}
      >
        <div className="text-center text-muted-foreground">
          <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No locations available</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div 
        ref={mapContainer} 
        className="w-full rounded-lg border border-border"
        style={{ height }}
      />
      <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-amber-500" />
          Pickup Locations
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          Delivery Location
        </div>
      </div>
    </div>
  );
};