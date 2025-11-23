import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AssignOrderDialog } from "./AssignOrderDialog";

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
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};
