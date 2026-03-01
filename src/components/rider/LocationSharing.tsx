import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";

export const LocationSharing = () => {
  const [isSharing, setIsSharing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const watchIdRef = useRef<string | null>(null);

  useEffect(() => {
    const startLocationSharing = async () => {
      // Check if user is a rider
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "rider")
        .maybeSingle();

      if (!roles) {
        return;
      }

      const updateLocation = async (latitude: number, longitude: number) => {
        const { error } = await supabase
          .from("rider_locations")
          .upsert({
            rider_id: user.id,
            latitude,
            longitude,
          }, {
            onConflict: 'rider_id'
          });

        if (error) {
          console.error("Error updating location:", error);
        } else {
          setIsSharing(true);
          setLastUpdate(new Date());
        }
      };

      // Check if running on native platform
      if (Capacitor.isNativePlatform()) {
        try {
          // Request permission first
          const permStatus = await Geolocation.checkPermissions();
          
          if (permStatus.location !== 'granted') {
            const requestResult = await Geolocation.requestPermissions();
            if (requestResult.location !== 'granted') {
              toast.error("Location permission denied");
              return;
            }
          }

          // Start watching position using Capacitor Geolocation
          const watchId = await Geolocation.watchPosition(
            {
              enableHighAccuracy: true,
              timeout: 10000,
            },
            (position, err) => {
              if (err) {
                console.error("Error getting location:", err);
                toast.error("Failed to get your location");
                setIsSharing(false);
                return;
              }
              
              if (position) {
                updateLocation(position.coords.latitude, position.coords.longitude);
              }
            }
          );
          
          watchIdRef.current = watchId;
        } catch (error) {
          console.error("Error starting location sharing:", error);
          toast.error("Failed to start location sharing");
        }
      } else {
        // Fall back to browser geolocation for web
        if (!navigator.geolocation) {
          toast.error("Geolocation is not supported by your browser");
          return;
        }

        const watchId = navigator.geolocation.watchPosition(
          (position) => {
            updateLocation(position.coords.latitude, position.coords.longitude);
          },
          (error) => {
            console.error("Error getting location:", error);
            toast.error("Failed to get your location");
            setIsSharing(false);
          },
          {
            enableHighAccuracy: true,
            maximumAge: 10000,
            timeout: 5000,
          }
        );

        watchIdRef.current = String(watchId);
      }
    };

    startLocationSharing();

    return () => {
      if (watchIdRef.current !== null) {
        if (Capacitor.isNativePlatform()) {
          Geolocation.clearWatch({ id: watchIdRef.current });
        } else {
          navigator.geolocation.clearWatch(Number(watchIdRef.current));
        }
      }
    };
  }, []);

  if (!isSharing && !lastUpdate) {
    return null;
  }

  return (
    <div className="fixed top-20 right-4 z-50">
      <Badge 
        variant={isSharing ? "default" : "secondary"} 
        className="flex items-center gap-2 px-3 py-2"
      >
        <MapPin className="h-4 w-4 animate-pulse" />
        <span className="text-xs">
          {isSharing ? "Sharing location" : "Location paused"}
        </span>
        {lastUpdate && (
          <span className="text-xs opacity-70">
            {lastUpdate.toLocaleTimeString()}
          </span>
        )}
      </Badge>
    </div>
  );
};