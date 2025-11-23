import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserPlus, Loader2 } from "lucide-react";

interface AssignOrderDialogProps {
  orderId: string;
  currentRiderId?: string;
  onAssigned: () => void;
}

interface Rider {
  id: string;
  full_name: string;
  phone: string;
}

export const AssignOrderDialog = ({ orderId, currentRiderId, onAssigned }: AssignOrderDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [selectedRider, setSelectedRider] = useState<string>(currentRiderId || "");

  useEffect(() => {
    if (open) {
      fetchRiders();
    }
  }, [open]);

  const fetchRiders = async () => {
    try {
      // Get all users with rider role
      const { data: riderRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "rider");

      if (rolesError) throw rolesError;

      const riderIds = riderRoles.map(r => r.user_id);

      if (riderIds.length === 0) {
        setRiders([]);
        return;
      }

      // Get rider profiles
      const { data: riderProfiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, phone")
        .in("id", riderIds);

      if (profilesError) throw profilesError;

      setRiders(riderProfiles || []);
    } catch (error) {
      console.error("Error fetching riders:", error);
      toast.error("Failed to load riders");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedRider) {
      toast.error("Please select a rider");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('assign-order', {
        body: {
          order_id: orderId,
          rider_id: selectedRider,
        },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      toast.success("Order assigned successfully!");
      setOpen(false);
      onAssigned();
    } catch (error: any) {
      console.error("Error assigning order:", error);
      toast.error(error.message || "Failed to assign order");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <UserPlus className="h-4 w-4 mr-1" />
          {currentRiderId ? 'Reassign' : 'Assign Rider'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Assign Order to Rider</DialogTitle>
          <DialogDescription>
            Select a rider to assign this order for delivery
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {riders.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No riders available. Create a user with the "Rider" role first.
              </p>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="rider">Select Rider</Label>
                <Select value={selectedRider} onValueChange={setSelectedRider}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a rider" />
                  </SelectTrigger>
                  <SelectContent>
                    {riders.map((rider) => (
                      <SelectItem key={rider.id} value={rider.id}>
                        {rider.full_name} ({rider.phone})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading || riders.length === 0}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Assigning...
                </>
              ) : (
                "Assign Order"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
