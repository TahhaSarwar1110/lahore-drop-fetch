import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eye, Package } from "lucide-react";
import { useState } from "react";

interface OrderAssignment {
  id: string;
  order_id: string;
  assigned_at: string;
  orders: {
    id: string;
    created_at: string;
    delivery_address: string;
    status: string;
    payment_status: string | null;
    profiles: {
      full_name: string;
      phone: string;
    };
    order_items: {
      id: string;
      item_type: string;
      item_data: any;
    }[];
  };
  total_price: number;
}

interface RiderOrdersTableProps {
  assignments: OrderAssignment[];
  onViewDetails: (orderId: string) => void;
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    'Pending': 'bg-yellow-500 hover:bg-yellow-600',
    'Order Confirmed': 'bg-blue-500 hover:bg-blue-600',
    'In Progress': 'bg-blue-500 hover:bg-blue-600',
    'Picked': 'bg-purple-500 hover:bg-purple-600',
    'Delivered': 'bg-green-500 hover:bg-green-600',
    'Cancelled': 'bg-red-500 hover:bg-red-600',
  };
  return colors[status] || 'bg-gray-500 hover:bg-gray-600';
};

export const RiderOrdersTable = ({ assignments, onViewDetails }: RiderOrdersTableProps) => {
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredAssignments = assignments.filter(assignment => {
    if (statusFilter === "all") return true;
    if (statusFilter === "active") {
      return assignment.orders.status !== 'Delivered' && assignment.orders.status !== 'Cancelled';
    }
    if (statusFilter === "completed") {
      return assignment.orders.status === 'Delivered' || assignment.orders.status === 'Cancelled';
    }
    return assignment.orders.status === statusFilter;
  });

  // Sort by created_at descending (newest first)
  const sortedAssignments = [...filteredAssignments].sort((a, b) => 
    new Date(b.orders.created_at).getTime() - new Date(a.orders.created_at).getTime()
  );

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          My Deliveries
        </CardTitle>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Orders</SelectItem>
            <SelectItem value="active">Active Orders</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Order Confirmed">Order Confirmed</SelectItem>
            <SelectItem value="In Progress">In Progress</SelectItem>
            <SelectItem value="Picked">Picked</SelectItem>
            <SelectItem value="Delivered">Delivered</SelectItem>
            <SelectItem value="Cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {sortedAssignments.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No orders found</h3>
            <p className="text-muted-foreground">
              {statusFilter === "all" 
                ? "You don't have any assigned orders yet."
                : "No orders match the selected filter."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="hidden md:table-cell">Delivery Address</TableHead>
                  <TableHead>Total Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedAssignments.map((assignment) => {
                  const order = assignment.orders;
                  return (
                    <TableRow key={assignment.id}>
                      <TableCell className="font-medium">
                        #{order.id.slice(0, 8)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{order.profiles.full_name}</p>
                          <p className="text-xs text-muted-foreground">{order.profiles.phone}</p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell max-w-[200px]">
                        <p className="truncate" title={order.delivery_address}>
                          {order.delivery_address}
                        </p>
                      </TableCell>
                      <TableCell className="font-semibold text-primary">
                        Rs. {assignment.total_price.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(order.status)}>
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                        {new Date(order.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onViewDetails(order.id)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          <span className="hidden sm:inline">Details</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
