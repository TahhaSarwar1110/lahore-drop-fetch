import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export const RECOVERY_FLAG = "tabedaar_password_recovery";

/** Sends any password-recovery link to the reset page, even if it landed on another page. */
export const RecoveryRedirect = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (window.location.hash.includes("type=recovery")) {
      sessionStorage.setItem(RECOVERY_FLAG, "1");
      if (location.pathname !== "/reset-password") navigate("/reset-password", { replace: true });
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        sessionStorage.setItem(RECOVERY_FLAG, "1");
        if (window.location.pathname !== "/reset-password") navigate("/reset-password", { replace: true });
      }
    });
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
};
