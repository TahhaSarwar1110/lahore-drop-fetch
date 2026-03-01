import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const usePermissions = () => {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setPermissions([]);
          setLoading(false);
          return;
        }

        // Get user's roles
        const { data: userRoles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);

        if (!userRoles || userRoles.length === 0) {
          setPermissions([]);
          setLoading(false);
          return;
        }

        const roles = userRoles.map(r => r.role);

        // Get permissions for these roles
        const { data: rolePermissions } = await supabase
          .from("role_permissions")
          .select("permission_id, permissions(name)")
          .in("role", roles);

        if (rolePermissions) {
          const permissionNames = rolePermissions
            .map(rp => (rp.permissions as any)?.name)
            .filter(Boolean);
          setPermissions(permissionNames);
        }
      } catch (error) {
        console.error("Error fetching permissions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, []);

  const hasPermission = (permission: string) => permissions.includes(permission);
  const hasAnyPermission = (perms: string[]) => perms.some(p => permissions.includes(p));

  return { permissions, hasPermission, hasAnyPermission, loading };
};
