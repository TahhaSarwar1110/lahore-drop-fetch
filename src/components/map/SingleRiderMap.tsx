import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin } from "lucide-react";

interface SingleRiderMapProps {
  latitude: number;
  longitude: number;
  riderName: string;
  height?: string;
}

export const SingleRiderMap = ({ 
  latitude, 
  longitude, 
  riderName, 
  height = "400px" 
}: SingleRiderMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Clean up existing map
    if (mapInstance.current) {
      mapInstance.current.remove();
      mapInstance.current = null;
    }

    // Create custom rider icon
    const riderIcon = L.divIcon({
      className: 'custom-rider-marker',
      html: `<div style="background-color: #3b82f6; border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.4);">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"></path><circle cx="7" cy="17" r="2"></circle><path d="M9 17h6"></path><circle cx="17" cy="17" r="2"></circle></svg>
      </div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 36],
    });

    // Initialize map
    const map = L.map(mapContainer.current).setView([latitude, longitude], 15);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Add marker
    const marker = L.marker([latitude, longitude], { icon: riderIcon }).addTo(map);
    
    marker.bindPopup(`
      <div style="font-family: system-ui, sans-serif; min-width: 120px;">
        <strong style="font-size: 14px;">🏍️ ${riderName}</strong>
        <br/>
        <span style="font-size: 12px; color: #666;">Currently here</span>
      </div>
    `).openPopup();

    mapInstance.current = map;

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [latitude, longitude, riderName]);

  return (
    <div>
      <div 
        ref={mapContainer} 
        className="w-full rounded-lg border border-border"
        style={{ height }}
      />
      <div className="mt-3 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <MapPin className="h-4 w-4 text-primary" />
        <span>
          Location: {latitude.toFixed(6)}, {longitude.toFixed(6)}
        </span>
      </div>
    </div>
  );
};
