import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export const useManagerCheck = () => {
  const [isManager, setIsManager] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkManagerRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          toast.error("Please log in to access this page");
          navigate("/login");
          return;
        }

        const { data: roles, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .in("role", ["manager", "admin"])
          .maybeSingle();

        if (error) {
          console.error("Error checking manager role:", error);
          setIsManager(false);
          toast.error("Access denied");
          navigate("/");
          return;
        }

        if (!roles) {
          toast.error("You don't have manager access");
          navigate("/");
          setIsManager(false);
          return;
        }

        setIsManager(true);
      } catch (error) {
        console.error("Error in manager check:", error);
        setIsManager(false);
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    checkManagerRole();
  }, [navigate]);

  return { isManager, loading };
};
