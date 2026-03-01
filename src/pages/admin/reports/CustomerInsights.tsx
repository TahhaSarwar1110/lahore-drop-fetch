import { useState, useEffect } from "react";
import { ReportsLayout } from "./ReportsLayout";
import { KPICard } from "@/components/admin/reports/KPICard";
import { ChartCard } from "@/components/admin/reports/ChartCard";
import { EmptyState } from "@/components/admin/reports/EmptyState";
import { useReportsData } from "@/hooks/useReportsData";
import { UserCircle, RefreshCw, DollarSign, ShoppingBag, TrendingUp } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format, differenceInDays } from "date-fns";

const COLORS = [
  "hsl(220, 70%, 17%)",
  "hsl(18, 90%, 52%)",
  "hsl(142, 76%, 36%)",
  "hsl(45, 93%, 47%)",
  "hsl(280, 65%, 50%)",
];

interface CustomerData {
  id: string;
  name: string;
  totalOrders: number;
  totalSpent: number;
  avgOrderValue: number;
  firstOrder: string;
  lastOrder: string;
  isRepeat: boolean;
}

const CustomerInsights = () => {
  const { orders, loading, calculateOrderValue, categoryCounts } = useReportsData();
  const [customerData, setCustomerData] = useState<CustomerData[]>([]);

  useEffect(() => {
    if (orders.length > 0) {
      // Group orders by customer
      const customerMap: Record<string, {
        name: string;
        orders: typeof orders;
      }> = {};

      orders.forEach(order => {
        const customerId = order.user_id;
        if (!customerMap[customerId]) {
          customerMap[customerId] = {
            name: order.profiles?.full_name || "Unknown",
            orders: [],
          };
        }
        customerMap[customerId].orders.push(order);
      });

      // Calculate customer stats
      const customers: CustomerData[] = Object.entries(customerMap).map(([id, data]) => {
        const deliveredOrders = data.orders.filter(o => o.status === "Delivered");
        const totalSpent = deliveredOrders.reduce((sum, o) => sum + calculateOrderValue(o), 0);
        const sortedOrders = [...data.orders].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

        return {
          id,
          name: data.name,
          totalOrders: data.orders.length,
          totalSpent,
          avgOrderValue: data.orders.length > 0 ? totalSpent / deliveredOrders.length : 0,
          firstOrder: sortedOrders[0]?.created_at || "",
          lastOrder: sortedOrders[sortedOrders.length - 1]?.created_at || "",
          isRepeat: data.orders.length > 1,
        };
      });

      setCustomerData(customers.sort((a, b) => b.totalSpent - a.totalSpent));
    }
  }, [orders, calculateOrderValue]);

  const totalCustomers = customerData.length;
  const repeatCustomers = customerData.filter(c => c.isRepeat).length;
  const newCustomers = customerData.filter(c => !c.isRepeat).length;
  const avgSpendPerCustomer = customerData.length > 0
    ? customerData.reduce((sum, c) => sum + c.totalSpent, 0) / customerData.length
    : 0;
  const avgOrdersPerCustomer = customerData.length > 0
    ? customerData.reduce((sum, c) => sum + c.totalOrders, 0) / customerData.length
    : 0;

  const customerTypeData = [
    { name: "Repeat Customers", value: repeatCustomers },
    { name: "New Customers", value: newCustomers },
  ];

  const categoryData = Object.entries(categoryCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const formatCurrency = (value: number) => `Rs. ${value.toLocaleString()}`;

  return (
    <ReportsLayout activeSection="customers">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Customer Insights</h1>
          <p className="text-muted-foreground mt-1">Understand customer behavior and preferences</p>
        </div>

        {/* KPI Cards */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              title="Total Customers"
              value={totalCustomers}
              subtitle={`${repeatCustomers} repeat customers`}
              icon={UserCircle}
            />
            <KPICard
              title="Repeat Rate"
              value={`${totalCustomers > 0 ? ((repeatCustomers / totalCustomers) * 100).toFixed(1) : 0}%`}
              icon={RefreshCw}
            />
            <KPICard
              title="Avg Spend/Customer"
              value={formatCurrency(Math.round(avgSpendPerCustomer))}
              icon={DollarSign}
            />
            <KPICard
              title="Avg Orders/Customer"
              value={avgOrdersPerCustomer.toFixed(1)}
              icon={ShoppingBag}
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Customer Type Distribution */}
          <ChartCard title="Customer Distribution" subtitle="New vs Repeat customers" loading={loading}>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={customerTypeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {customerTypeData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          {/* Popular Categories */}
          <ChartCard title="Popular Categories" subtitle="Most ordered categories" loading={loading}>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="value" name="Orders" fill="hsl(18, 90%, 52%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>

        {/* Top Customers Table */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-foreground">Top Customers</h3>
          </div>
          {loading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : customerData.length === 0 ? (
            <EmptyState
              icon={UserCircle}
              title="No customers found"
              description="No customer data available yet"
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-center">Orders</TableHead>
                    <TableHead className="text-right">Total Spent</TableHead>
                    <TableHead className="text-right">Avg Order</TableHead>
                    <TableHead>First Order</TableHead>
                    <TableHead>Last Order</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customerData.slice(0, 20).map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell>
                        <Badge variant={customer.isRepeat ? "default" : "secondary"}>
                          {customer.isRepeat ? "Repeat" : "New"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">{customer.totalOrders}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(customer.totalSpent)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {customer.avgOrderValue > 0 ? formatCurrency(Math.round(customer.avgOrderValue)) : "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {customer.firstOrder ? format(new Date(customer.firstOrder), "MMM d, yyyy") : "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {customer.lastOrder ? format(new Date(customer.lastOrder), "MMM d, yyyy") : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </ReportsLayout>
  );
};

export default CustomerInsights;
