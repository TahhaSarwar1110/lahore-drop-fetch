import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, Search } from "lucide-react";
import { CreateUserDialog } from "./CreateUserDialog";
import { EditUserRoleDialog } from "./EditUserRoleDialog";
import { UserDetailsDialog, userRequest } from "./UserDetailsDialog";
import { Button } from "@/components/ui/button";

interface UserWithRole {
  id: string;
  full_name: string;
  phone: string;
  created_at: string;
  roles: string[];
  email: string;
}

export const UserManagement = () => {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setLoadError(false);
      const data = await userRequest({ action: "list" });
      setUsers(data.users);
      setCurrentUserId(data.currentUserId);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const filteredUsers = users.filter(user => {
    const query = searchQuery.toLowerCase();
    return (
      user.full_name.toLowerCase().includes(query) ||
      user.phone.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.roles.some(role => role.toLowerCase().includes(query))
    );
  });

  return (
    <div className="space-y-6">
      {loadError && <div role="alert" className="flex items-center gap-3 text-destructive">Could not load users.<Button variant="outline" onClick={fetchUsers}>Retry</Button></div>}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="bg-card rounded-lg border border-border p-4 flex-1">
          <p className="text-sm text-muted-foreground">
            Total Users: <span className="font-semibold text-foreground">{users.length}</span>
            {" | "}
            Admins: <span className="font-semibold text-foreground">{users.filter(u => u.roles.includes('admin')).length}</span>
            {" | "}
            Riders: <span className="font-semibold text-foreground">{users.filter(u => u.roles.includes('rider')).length}</span>
          </p>
        </div>
        <CreateUserDialog onUserCreated={fetchUsers} />
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, phone, or role..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.full_name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.phone}</TableCell>
                <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {user.roles.length > 0 ? (
                      user.roles.map(role => (
                        <Badge 
                          key={role} 
                          variant={role === 'admin' ? 'default' : 'secondary'}
                        >
                          {role}
                        </Badge>
                      ))
                    ) : (
                      <Badge variant="outline">No role</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                  <UserDetailsDialog userId={user.id} userName={user.full_name} roles={user.roles} isSelf={user.id === currentUserId} onUpdated={fetchUsers} />
                  <EditUserRoleDialog
                    userId={user.id}
                    currentRoles={user.roles}
                    userName={user.full_name}
                    onRoleUpdated={fetchUsers}
                  />
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!loadError && filteredUsers.length === 0 && <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No users found.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
