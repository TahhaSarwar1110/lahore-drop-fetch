import { ReportsLayout } from "./ReportsLayout";
import { KPICard } from "@/components/admin/reports/KPICard";
import { ChartCard } from "@/components/admin/reports/ChartCard";
import { useReportsData } from "@/hooks/useReportsData";
import { DollarSign, TrendingUp, Receipt, AlertCircle, Award } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  Legend,
} from "recharts";
import { format, startOfMonth, subMonths } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const COLORS = [
  "hsl(220, 70%, 17%)",
  "hsl(18, 90%, 52%)",
  "hsl(142, 76%, 36%)",
  "hsl(45, 93%, 47%)",
  "hsl(280, 65%, 50%)",
];

const SalesReport = () => {
  const { orders, loading, revenueByDay, kpis, categoryCounts, calculateOrderValue } = useReportsData();

  const formatCurrency = (value: number) => `Rs. ${value.toLocaleString()}`;

  // Calculate additional metrics
  const deliveredOrders = orders.filter(o => o.status === "Delivered");
  const cancelledOrders = orders.filter(o => o.status === "Cancelled");
  
  const totalDeliveryCharges = deliveredOrders.reduce((sum, o) => sum + (o.additional_charges || 0), 0);
  const refundValue = cancelledOrders.reduce((sum, o) => sum + calculateOrderValue(o), 0);

  // Revenue by category
  const revenueByCategory: Record<string, number> = {};
  deliveredOrders.forEach(order => {
    order.order_items?.forEach(item => {
      const category = item.item_type || "Other";
      const price = parseFloat(
        item.item_data?.["Price (PKR)"] ||
        item.item_data?.price ||
        item.item_data?.["Expected Price (PKR)"] ||
        "0"
      );
      revenueByCategory[category] = (revenueByCategory[category] || 0) + (isNaN(price) ? 0 : price);
    });
  });

  const categoryRevenueData = Object.entries(revenueByCategory)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Top categories
  const topCategories = categoryRevenueData.slice(0, 5);

  // Top spending customers
  const customerSpending: Record<string, { name: string; total: number }> = {};
  deliveredOrders.forEach(order => {
    const customerId = order.user_id;
    const customerName = order.profiles?.full_name || "Unknown";
    if (!customerSpending[customerId]) {
      customerSpending[customerId] = { name: customerName, total: 0 };
    }
    customerSpending[customerId].total += calculateOrderValue(order);
  });

  const topCustomers = Object.entries(customerSpending)
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // Chart data
  const chartData = revenueByDay.slice(-14).map(item => ({
    ...item,
    date: format(new Date(item.date), "MMM d"),
  }));

  // AOV by category
  const aovByCategory = Object.entries(categoryCounts).map(([category, count]) => {
    const revenue = revenueByCategory[category] || 0;
    return {
      name: category,
      aov: count > 0 ? revenue / count : 0,
    };
  });

  return (
    <ReportsLayout activeSection="sales">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sales & Revenue</h1>
          <p className="text-muted-foreground mt-1">Financial performance and revenue analysis</p>
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
              title="Total Revenue"
              value={formatCurrency(kpis.totalRevenue)}
              icon={DollarSign}
              trend={{
                value: Math.round(kpis.revenueGrowth),
                label: "vs last month",
              }}
            />
            <KPICard
              title="Delivery Charges"
              value={formatCurrency(totalDeliveryCharges)}
              icon={Receipt}
            />
            <KPICard
              title="Failed/Refunds"
              value={formatCurrency(refundValue)}
              subtitle={`${cancelledOrders.length} cancelled orders`}
              icon={AlertCircle}
            />
            <KPICard
              title="Revenue Growth"
              value={`${kpis.revenueGrowth > 0 ? "+" : ""}${kpis.revenueGrowth.toFixed(1)}%`}
              icon={TrendingUp}
            />
          </div>
        )}

        {/* Revenue Trend Chart */}
        <ChartCard title="Revenue Trend" subtitle="Last 14 days" loading={loading}>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(18, 90%, 52%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(18, 90%, 52%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `Rs.${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => [formatCurrency(value), "Revenue"]}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(18, 90%, 52%)"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue by Category */}
          <ChartCard title="Revenue by Category" loading={loading}>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topCategories}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `Rs.${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), "Revenue"]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {topCategories.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          {/* Top Spending Customers */}
          <ChartCard title="Top Spending Customers" loading={loading}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Total Spent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topCustomers.map((customer, index) => (
                  <TableRow key={customer.id}>
                    <TableCell>
                      {index === 0 && <Award className="h-4 w-4 text-yellow-500" />}
                      {index === 1 && <Award className="h-4 w-4 text-gray-400" />}
                      {index === 2 && <Award className="h-4 w-4 text-amber-600" />}
                      {index > 2 && <span className="text-muted-foreground">{index + 1}</span>}
                    </TableCell>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell className="text-right">{formatCurrency(customer.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ChartCard>
        </div>

        {/* AOV by Category */}
        <ChartCard title="Average Order Value by Category" loading={loading}>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={aovByCategory} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" tickFormatter={(v) => `Rs.${v.toLocaleString()}`} />
                <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(Math.round(value)), "AOV"]}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="aov" fill="hsl(220, 70%, 17%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>
    </ReportsLayout>
  );
};

export default SalesReport;
