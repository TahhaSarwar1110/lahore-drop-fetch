import { ReportsLayout } from "./ReportsLayout";
import { KPICard } from "@/components/admin/reports/KPICard";
import { ChartCard } from "@/components/admin/reports/ChartCard";
import { useReportsData } from "@/hooks/useReportsData";
import {
  ShoppingCart,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import {
  LineChart,
  Line,
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

const COLORS = [
  "hsl(220, 70%, 17%)",
  "hsl(18, 90%, 52%)",
  "hsl(142, 76%, 36%)",
  "hsl(45, 93%, 47%)",
  "hsl(280, 65%, 50%)",
  "hsl(200, 75%, 45%)",
  "hsl(0, 84%, 60%)",
];

const BusinessOverview = () => {
  const { loading, kpis, statusCounts, revenueByDay } = useReportsData();

  const formatCurrency = (value: number) => `Rs. ${value.toLocaleString()}`;

  const statusData = Object.entries(statusCounts).map(([name, value]) => ({
    name,
    value,
  }));

  const chartData = revenueByDay.map(item => ({
    ...item,
    date: format(new Date(item.date), "MMM d"),
  }));

  return (
    <ReportsLayout activeSection="overview">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Business Overview</h1>
          <p className="text-muted-foreground mt-1">High-level performance metrics and trends</p>
        </div>

        {/* KPI Cards */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <KPICard
              title="Orders Today"
              value={kpis.ordersToday}
              subtitle={`${kpis.ordersThisWeek} this week`}
              icon={ShoppingCart}
            />
            <KPICard
              title="Orders This Month"
              value={kpis.ordersThisMonth}
              subtitle={`${kpis.totalOrders} total`}
              icon={ShoppingCart}
            />
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
              title="Average Order Value"
              value={formatCurrency(Math.round(kpis.avgOrderValue))}
              icon={TrendingUp}
            />
            <KPICard
              title="Completed vs Cancelled"
              value={`${kpis.completedOrders} / ${kpis.cancelledOrders}`}
              subtitle={`${((kpis.completedOrders / (kpis.completedOrders + kpis.cancelledOrders || 1)) * 100).toFixed(1)}% success rate`}
              icon={CheckCircle2}
            />
            <KPICard
              title="Same-Day Delivery Rate"
              value={`${kpis.sameDayRate.toFixed(1)}%`}
              icon={Clock}
            />
          </div>
        )}

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard
            title="Orders & Revenue Trend"
            subtitle="Last 30 days"
            loading={loading}
          >
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number, name: string) => [
                      name === "revenue" ? formatCurrency(value) : value,
                      name === "revenue" ? "Revenue" : "Orders",
                    ]}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="orders"
                    stroke="hsl(220, 70%, 17%)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(18, 90%, 52%)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <ChartCard
            title="Order Status Distribution"
            subtitle="Current orders breakdown"
            loading={loading}
          >
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    fill="#8884d8"
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {statusData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>
      </div>
    </ReportsLayout>
  );
};

export default BusinessOverview;
