import { useState } from "react";
import { ReportsLayout } from "./ReportsLayout";
import { ChartCard } from "@/components/admin/reports/ChartCard";
import { EmptyState } from "@/components/admin/reports/EmptyState";
import { useReportsData } from "@/hooks/useReportsData";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Package, Filter } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";

const COLORS = [
  "hsl(220, 70%, 17%)",
  "hsl(18, 90%, 52%)",
  "hsl(142, 76%, 36%)",
  "hsl(45, 93%, 47%)",
  "hsl(280, 65%, 50%)",
];

const STATUS_OPTIONS = [
  "all",
  "Pending",
  "Order Received",
  "Shopper Assigned",
  "Purchasing",
  "In Delivery",
  "Delivered",
  "Cancelled",
];

const CATEGORY_OPTIONS = ["all", "Fashion", "Food", "Groceries", "Gifts", "Other"];

const getStatusColor = (status: string): string => {
  switch (status) {
    case "Pending": return "bg-yellow-100 text-yellow-800";
    case "Order Received": return "bg-blue-100 text-blue-800";
    case "Shopper Assigned": return "bg-purple-100 text-purple-800";
    case "Purchasing": return "bg-indigo-100 text-indigo-800";
    case "In Delivery": return "bg-orange-100 text-orange-800";
    case "Delivered": return "bg-green-100 text-green-800";
    case "Cancelled": return "bg-red-100 text-red-800";
    default: return "bg-gray-100 text-gray-800";
  }
};

const OrdersReport = () => {
  const { orders, loading, statusCounts, categoryCounts } = useReportsData();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const filteredOrders = orders.filter(order => {
    const matchesSearch = searchQuery === "" ||
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.delivery_address.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || order.status === statusFilter;

    const orderCategories = order.order_items?.map(item => item.item_type) || [];
    const matchesCategory = categoryFilter === "all" || orderCategories.includes(categoryFilter);

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const statusData = Object.entries(statusCounts).map(([name, value]) => ({
    name,
    value,
  }));

  const categoryData = Object.entries(categoryCounts).map(([name, value]) => ({
    name,
    value,
  }));

  return (
    <ReportsLayout activeSection="orders">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Orders Report</h1>
          <p className="text-muted-foreground mt-1">Detailed order tracking and analysis</p>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Orders by Status" loading={loading}>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="value" fill="hsl(220, 70%, 17%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <ChartCard title="Orders by Category" loading={loading}>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {categoryData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>

        {/* Filters */}
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status === "all" ? "All Statuses" : status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat === "all" ? "All Categories" : cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredOrders.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No orders found"
              description="Try adjusting your filters or search query"
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Delivered</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.slice(0, 50).map((order) => {
                    const totalValue = order.order_items?.reduce((sum, item) => {
                      const price = parseFloat(
                        item.item_data?.["Price (PKR)"] ||
                        item.item_data?.price ||
                        item.item_data?.["Expected Price (PKR)"] ||
                        "0"
                      );
                      return sum + (isNaN(price) ? 0 : price);
                    }, 0) || 0;

                    const categories = [...new Set(order.order_items?.map(i => i.item_type) || [])];

                    return (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-xs">
                          <Link
                            to={`/admin/orders/${order.id}`}
                            className="text-primary hover:underline"
                          >
                            {order.id.slice(0, 8)}...
                          </Link>
                        </TableCell>
                        <TableCell>{order.profiles?.full_name || "N/A"}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {categories.slice(0, 2).map((cat) => (
                              <Badge key={cat} variant="outline" className="text-xs">
                                {cat}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>Rs. {totalValue.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(new Date(order.created_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {order.delivered_at
                            ? format(new Date(order.delivered_at), "MMM d, yyyy")
                            : "-"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {filteredOrders.length > 50 && (
          <p className="text-sm text-muted-foreground text-center">
            Showing 50 of {filteredOrders.length} orders
          </p>
        )}
      </div>
    </ReportsLayout>
  );
};

export default OrdersReport;
