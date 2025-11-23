import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { AddPermissionDialog } from "./AddPermissionDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Permission {
  id: string;
  name: string;
  description: string | null;
}

interface RolePermission {
  id: string;
  role: string;
  permission_id: string;
  permissions: Permission;
}

const ROLES = ['admin', 'manager', 'rider', 'user'] as const;

export const RolePermissionsManagement = () => {
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch all permissions
      const { data: permissions, error: permError } = await supabase
        .from("permissions")
        .select("*")
        .order("name");

      if (permError) throw permError;

      // Fetch role permissions with permission details
      const { data: rolePerm, error: rolePermError } = await supabase
        .from("role_permissions")
        .select("*, permissions(*)");

      if (rolePermError) throw rolePermError;

      setAllPermissions(permissions || []);
      setRolePermissions(rolePerm || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load permissions");
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePermission = async () => {
    if (!deleteDialog.id) return;

    try {
      const { error } = await supabase
        .from("role_permissions")
        .delete()
        .eq("id", deleteDialog.id);

      if (error) throw error;

      toast.success("Permission removed from role");
      fetchData();
    } catch (error) {
      console.error("Error deleting permission:", error);
      toast.error("Failed to remove permission");
    } finally {
      setDeleteDialog({ open: false, id: null });
    }
  };

  const getPermissionsForRole = (role: string) => {
    return rolePermissions.filter((rp) => rp.role === role);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-lg border border-border p-4">
        <p className="text-sm text-muted-foreground">
          Manage permissions for each role. Permissions control access to different features and screens.
        </p>
      </div>

      <div className="space-y-8">
        {ROLES.map((role) => {
          const permissions = getPermissionsForRole(role);
          
          return (
            <div key={role} className="bg-card rounded-lg border border-border overflow-hidden">
              <div className="bg-muted/50 px-6 py-4 border-b border-border flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold capitalize">{role} Role</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {permissions.length} permission{permissions.length !== 1 ? 's' : ''} assigned
                  </p>
                </div>
                <AddPermissionDialog
                  role={role}
                  availablePermissions={allPermissions}
                  assignedPermissions={permissions.map(p => p.permission_id)}
                  onPermissionAdded={fetchData}
                />
              </div>

              {permissions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Permission Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {permissions.map((rp) => (
                      <TableRow key={rp.id}>
                        <TableCell className="font-medium">
                          <Badge variant="outline">{rp.permissions.name}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {rp.permissions.description || "No description"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteDialog({ open: true, id: rp.id })}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="px-6 py-8 text-center text-muted-foreground">
                  No permissions assigned to this role yet.
                </div>
              )}
            </div>
          );
        })}
      </div>

      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, id: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Permission</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this permission from the role? Users with this role will lose access to the associated features.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePermission}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
