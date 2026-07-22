import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export const useAdminCheck = () => {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAdminRole = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user) {
          toast.error("Please log in to access this page");
          navigate("/login");
          return;
        }

        // Authoritative server-side verification via edge function.
        // RLS on user_roles is the real security boundary; this gives us a
        // server-verified answer for UI routing (defense in depth).
        const { data, error } = await supabase.functions.invoke("verify-admin");

        if (error || !data?.isAdmin) {
          setIsAdmin(false);
          toast.error("You don't have admin access");
          navigate("/");
          return;
        }

        setIsAdmin(true);
      } catch (error) {
        console.error("Error in admin check:", error);
        setIsAdmin(false);
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    checkAdminRole();
  }, [navigate]);

  return { isAdmin, loading };
};
