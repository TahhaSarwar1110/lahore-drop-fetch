import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, CheckCircle, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

interface Order {
  id: string;
  delivery_address: string;
  status: string;
  created_at: string;
  user_id: string;
  manager_feedback: string | null;
  confirmed_at: string | null;
  additional_charges: number;
  charges_description: string | null;
  total_price?: number;
  profiles: {
    full_name: string;
    phone: string;
  };
  order_assignments?: {
    rider_id: string;
    profiles: {
      full_name: string;
      phone: string;
    };
  } | null;
}

interface ManagerOrdersTableProps {
  orders: Order[];
  onViewDetails: (orderId: string) => void;
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    "Pending": "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
    "Order Confirmed": "bg-blue-500/10 text-blue-600 border-blue-500/20",
    "Order Received": "bg-blue-500/10 text-blue-600 border-blue-500/20",
    "Shopper Assigned": "bg-purple-500/10 text-purple-600 border-purple-500/20",
    "Purchasing": "bg-orange-500/10 text-orange-600 border-orange-500/20",
    "In Delivery": "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
    "Picked": "bg-teal-500/10 text-teal-600 border-teal-500/20",
    "Delivered": "bg-green-500/10 text-green-600 border-green-500/20",
    "Cancelled": "bg-destructive/10 text-destructive border-destructive/20",
  };
  return colors[status] || "bg-muted text-muted-foreground";
};

export const ManagerOrdersTable = ({ orders, onViewDetails }: ManagerOrdersTableProps) => {
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredOrders = orders.filter(order => 
    statusFilter === "all" || order.status === statusFilter
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle>All Orders</CardTitle>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Orders</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Order Confirmed">Order Confirmed</SelectItem>
              <SelectItem value="Shopper Assigned">Shopper Assigned</SelectItem>
              <SelectItem value="Purchasing">Purchasing</SelectItem>
              <SelectItem value="Picked">Picked</SelectItem>
              <SelectItem value="In Delivery">In Delivery</SelectItem>
              <SelectItem value="Delivered">Delivered</SelectItem>
              <SelectItem value="Cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="rounded-md border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-semibold">Order ID</TableHead>
                  <TableHead className="font-semibold">Customer</TableHead>
                  <TableHead className="font-semibold">Delivery Address</TableHead>
                  <TableHead className="font-semibold">Assigned Rider</TableHead>
                  <TableHead className="font-semibold text-right">Total Price</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Date</TableHead>
                  <TableHead className="font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                      No orders found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order) => {
                    const assignedRider = order.order_assignments;
                    const totalPrice = order.total_price || order.additional_charges || 0;
                    
                    return (
                      <TableRow key={order.id} className="hover:bg-accent/50">
                        <TableCell className="font-mono text-sm">
                          #{order.id.slice(0, 8)}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{order.profiles.full_name}</p>
                            <p className="text-xs text-muted-foreground">{order.profiles.phone}</p>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          <p className="truncate text-sm" title={order.delivery_address}>
                            {order.delivery_address}
                          </p>
                        </TableCell>
                        <TableCell>
                          {assignedRider ? (
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3 text-primary" />
                              <span className="text-sm">{assignedRider.profiles.full_name}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">Not assigned</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {totalPrice > 0 ? `PKR ${totalPrice.toLocaleString()}` : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getStatusColor(order.status)}>
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onViewDetails(order.id)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            {order.status === "Pending" && (
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => onViewDetails(order.id)}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
