import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";

interface Permission {
  id: string;
  name: string;
  description: string | null;
}

interface AddPermissionDialogProps {
  role: string;
  availablePermissions: Permission[];
  assignedPermissions: string[];
  onPermissionAdded: () => void;
}

export const AddPermissionDialog = ({
  role,
  availablePermissions,
  assignedPermissions,
  onPermissionAdded,
}: AddPermissionDialogProps) => {
  const [open, setOpen] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const unassignedPermissions = availablePermissions.filter(
    (p) => !assignedPermissions.includes(p.id)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPermission) {
      toast.error("Please select a permission");
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.from("role_permissions").insert({
        role: role as "admin" | "rider" | "user",
        permission_id: selectedPermission,
      });

      if (error) throw error;

      toast.success("Permission added to role");
      setOpen(false);
      setSelectedPermission("");
      onPermissionAdded();
    } catch (error) {
      console.error("Error adding permission:", error);
      toast.error("Failed to add permission");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={unassignedPermissions.length === 0}>
          <Plus className="h-4 w-4 mr-2" />
          Add Permission
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Permission to {role.charAt(0).toUpperCase() + role.slice(1)} Role</DialogTitle>
          <DialogDescription>
            Select a permission to grant to all users with this role.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="permission">Permission</Label>
              <Select value={selectedPermission} onValueChange={setSelectedPermission}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a permission" />
                </SelectTrigger>
                <SelectContent>
                  {unassignedPermissions.map((permission) => (
                    <SelectItem key={permission.id} value={permission.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{permission.name}</span>
                        {permission.description && (
                          <span className="text-xs text-muted-foreground">
                            {permission.description}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !selectedPermission}>
              {loading ? "Adding..." : "Add Permission"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
