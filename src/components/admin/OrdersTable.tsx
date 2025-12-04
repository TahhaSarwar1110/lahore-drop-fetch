import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AssignOrderDialog } from "./AssignOrderDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
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

interface Order {
  id: string;
  created_at: string;
  delivery_address: string;
  status: string;
  profiles: {
    full_name: string;
    phone: string;
  };
}

interface OrdersTableProps {
  orders: Order[];
  onOrderUpdated?: () => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "Delivered":
      return "bg-green-500/10 text-green-500 border-green-500/20";
    case "Cancelled":
      return "bg-destructive/10 text-destructive border-destructive/20";
    case "In Delivery":
    case "Picked":
      return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    case "Purchasing":
    case "Shopper Assigned":
    case "In Progress":
      return "bg-primary/10 text-primary border-primary/20";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
};

export const OrdersTable = ({ orders, onOrderUpdated }: OrdersTableProps) => {
  const navigate = useNavigate();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteClick = (orderId: string) => {
    setOrderToDelete(orderId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!orderToDelete) return;

    try {
      setDeleting(true);
      const { error } = await supabase
        .from("orders")
        .delete()
        .eq("id", orderToDelete);

      if (error) throw error;

      toast.success("Order deleted successfully");
      onOrderUpdated?.();
      setDeleteDialogOpen(false);
      setOrderToDelete(null);
    } catch (error) {
      console.error("Error deleting order:", error);
      toast.error("Failed to delete order");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="rounded-md border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-border">
            <TableHead className="text-card-foreground">Order ID</TableHead>
            <TableHead className="text-card-foreground">Customer</TableHead>
            <TableHead className="text-card-foreground">Phone</TableHead>
            <TableHead className="text-card-foreground">Address</TableHead>
            <TableHead className="text-card-foreground">Status</TableHead>
            <TableHead className="text-card-foreground">Date</TableHead>
            <TableHead className="text-card-foreground">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                No orders found
              </TableCell>
            </TableRow>
          ) : (
            orders.map((order) => (
              <TableRow key={order.id} className="border-border hover:bg-accent/50">
                <TableCell className="font-mono text-sm text-card-foreground">
                  {order.id.slice(0, 8)}...
                </TableCell>
                <TableCell className="text-card-foreground">{order.profiles.full_name}</TableCell>
                <TableCell className="text-card-foreground">{order.profiles.phone}</TableCell>
                <TableCell className="text-card-foreground max-w-xs truncate">
                  {order.delivery_address}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={getStatusColor(order.status)}>
                    {order.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-card-foreground">
                  {new Date(order.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/admin/orders/${order.id}`)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <AssignOrderDialog
                      orderId={order.id}
                      onAssigned={() => onOrderUpdated?.()}
                    />
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteClick(order.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this order? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
