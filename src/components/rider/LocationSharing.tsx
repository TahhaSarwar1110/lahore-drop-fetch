import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const LocationSharing = () => {
  const [isSharing, setIsSharing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    let watchId: number | null = null;

    const startLocationSharing = async () => {
      if (!navigator.geolocation) {
        toast.error("Geolocation is not supported by your browser");
        return;
      }

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

      // Start watching position
      watchId = navigator.geolocation.watchPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;

          // Upsert location to database
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
    };

    startLocationSharing();

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
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