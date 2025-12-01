import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation } from "lucide-react";

// Fix for default marker icon
const iconRetinaUrl = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png";
const iconUrl = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png";
const shadowUrl = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png";

const defaultIcon = L.icon({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = defaultIcon;

interface LocationPickerMapProps {
  onLocationSelect: (lat: number, lng: number) => void;
  initialLat?: number;
  initialLng?: number;
  label?: string;
}

export const LocationPickerMap = ({ 
  onLocationSelect, 
  initialLat, 
  initialLng,
  label = "Selected Location"
}: LocationPickerMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markerInstance = useRef<L.Marker | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(
    initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null
  );

  useEffect(() => {
    if (!mapContainer.current || mapInstance.current) return;

    // Default to Lahore coordinates
    const defaultLat = initialLat || 31.5204;
    const defaultLng = initialLng || 74.3587;

    // Initialize map
    const map = L.map(mapContainer.current).setView([defaultLat, defaultLng], 13);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Add click handler to place marker
    map.on("click", (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      
      if (markerInstance.current) {
        markerInstance.current.setLatLng([lat, lng]);
      } else {
        markerInstance.current = L.marker([lat, lng], { icon: defaultIcon }).addTo(map);
      }
      
      setSelectedLocation({ lat, lng });
      onLocationSelect(lat, lng);
    });

    // If initial coordinates exist, add marker
    if (initialLat && initialLng) {
      markerInstance.current = L.marker([initialLat, initialLng], { icon: defaultIcon }).addTo(map);
    }

    mapInstance.current = map;

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
      markerInstance.current = null;
    };
  }, []);

  const handleUseMyLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          
          if (mapInstance.current) {
            mapInstance.current.setView([latitude, longitude], 15);
            
            if (markerInstance.current) {
              markerInstance.current.setLatLng([latitude, longitude]);
            } else {
              markerInstance.current = L.marker([latitude, longitude], { icon: defaultIcon }).addTo(mapInstance.current);
            }
          }
          
          setSelectedLocation({ lat: latitude, lng: longitude });
          onLocationSelect(latitude, longitude);
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">
          <MapPin className="inline h-4 w-4 mr-1" />
          {label}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleUseMyLocation}
        >
          <Navigation className="h-4 w-4 mr-1" />
          Use My Location
        </Button>
      </div>
      <div 
        ref={mapContainer} 
        className="h-64 w-full rounded-lg border border-border"
      />
      {selectedLocation && (
        <p className="text-xs text-muted-foreground">
          Selected: {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
        </p>
      )}
    </div>
  );
};