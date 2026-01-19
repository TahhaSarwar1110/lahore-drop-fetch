import { useState, useEffect } from "react";
import { ReportsLayout } from "./ReportsLayout";
import { KPICard } from "@/components/admin/reports/KPICard";
import { ChartCard } from "@/components/admin/reports/ChartCard";
import { EmptyState } from "@/components/admin/reports/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { Users, CheckCircle2, Clock, Award, TrendingUp } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { differenceInHours, differenceInMinutes } from "date-fns";

interface ManagerStats {
  manager_id: string;
  manager_name: string;
  orders_handled: number;
  orders_confirmed: number;
  orders_with_feedback: number;
  avg_handling_time_mins: number | null;
  confirmation_rate: number;
}

const ManagerPerformance = () => {
  const [managerStats, setManagerStats] = useState<ManagerStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchManagerStats();
  }, []);

  const fetchManagerStats = async () => {
    try {
      // Fetch all managers
      const { data: managerRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "manager");

      if (!managerRoles) return;

      const managerIds = managerRoles.map(r => r.user_id);

      // Fetch manager profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", managerIds);

      // Fetch all orders
      const { data: orders } = await supabase
        .from("orders")
        .select(`
          id,
          created_at,
          confirmed_at,
          confirmed_by,
          manager_feedback
        `);

      // Fetch order item approvals
      const { data: orderItems } = await supabase
        .from("order_items")
        .select("approved_by, approved_at");

      // Calculate stats per manager
      const stats: ManagerStats[] = managerIds.map(managerId => {
        const profile = profiles?.find(p => p.id === managerId);
        
        // Orders confirmed by this manager
        const confirmedOrders = orders?.filter(o => o.confirmed_by === managerId) || [];
        
        // Orders with feedback from this manager
        const feedbackOrders = orders?.filter(o => 
          o.confirmed_by === managerId && o.manager_feedback
        ) || [];

        // Items approved by this manager
        const approvedItems = orderItems?.filter(i => i.approved_by === managerId) || [];

        // Calculate average handling time (time from order creation to confirmation)
        let totalHandlingMins = 0;
        let handledCount = 0;
        confirmedOrders.forEach(order => {
          if (order.confirmed_at) {
            const mins = differenceInMinutes(
              new Date(order.confirmed_at),
              new Date(order.created_at)
            );
            totalHandlingMins += mins;
            handledCount++;
          }
        });

        const avgHandlingMins = handledCount > 0 ? totalHandlingMins / handledCount : null;

        return {
          manager_id: managerId,
          manager_name: profile?.full_name || "Unknown Manager",
          orders_handled: confirmedOrders.length,
          orders_confirmed: confirmedOrders.length,
          orders_with_feedback: feedbackOrders.length,
          avg_handling_time_mins: avgHandlingMins,
          confirmation_rate: orders?.length ? (confirmedOrders.length / orders.length) * 100 : 0,
        };
      });

      setManagerStats(stats.sort((a, b) => b.orders_handled - a.orders_handled));
    } catch (err) {
      console.error("Error fetching manager stats:", err);
    } finally {
      setLoading(false);
    }
  };

  const totalManagers = managerStats.length;
  const totalHandled = managerStats.reduce((sum, m) => sum + m.orders_handled, 0);
  const avgHandlingTime = managerStats.length > 0
    ? managerStats.reduce((sum, m) => sum + (m.avg_handling_time_mins || 0), 0) / managerStats.filter(m => m.avg_handling_time_mins).length
    : 0;

  const chartData = managerStats.slice(0, 10).map(m => ({
    name: m.manager_name.split(" ")[0],
    handled: m.orders_handled,
    withFeedback: m.orders_with_feedback,
  }));

  const formatTime = (mins: number | null): string => {
    if (mins === null) return "-";
    if (mins < 60) return `${Math.round(mins)} mins`;
    const hours = Math.floor(mins / 60);
    const remainingMins = Math.round(mins % 60);
    return `${hours}h ${remainingMins}m`;
  };

  return (
    <ReportsLayout activeSection="managers">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Manager Performance</h1>
          <p className="text-muted-foreground mt-1">Track manager efficiency and order processing</p>
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
              title="Total Managers"
              value={totalManagers}
              icon={Users}
            />
            <KPICard
              title="Orders Processed"
              value={totalHandled}
              icon={CheckCircle2}
            />
            <KPICard
              title="Avg Processing Time"
              value={formatTime(avgHandlingTime)}
              icon={Clock}
            />
            <KPICard
              title="Top Performer"
              value={managerStats[0]?.manager_name.split(" ")[0] || "-"}
              subtitle={`${managerStats[0]?.orders_handled || 0} orders`}
              icon={Award}
            />
          </div>
        )}

        {/* Manager Comparison Chart */}
        <ChartCard title="Manager Comparison" subtitle="Orders handled by manager" loading={loading}>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="handled" name="Orders Handled" fill="hsl(220, 70%, 17%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="withFeedback" name="With Feedback" fill="hsl(18, 90%, 52%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Managers Table */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-foreground">Manager Rankings</h3>
          </div>
          {loading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : managerStats.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No managers found"
              description="No managers have processed orders yet"
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Manager</TableHead>
                    <TableHead className="text-center">Orders Handled</TableHead>
                    <TableHead className="text-center">With Feedback</TableHead>
                    <TableHead>Avg Time</TableHead>
                    <TableHead>Performance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {managerStats.map((manager, index) => (
                    <TableRow key={manager.manager_id}>
                      <TableCell>
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          index === 0 ? "bg-yellow-100 text-yellow-700" :
                          index === 1 ? "bg-gray-100 text-gray-700" :
                          index === 2 ? "bg-amber-100 text-amber-700" :
                          "bg-muted text-muted-foreground"
                        }`}>
                          {index + 1}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">{manager.manager_name}</TableCell>
                      <TableCell className="text-center">{manager.orders_handled}</TableCell>
                      <TableCell className="text-center">{manager.orders_with_feedback}</TableCell>
                      <TableCell>{formatTime(manager.avg_handling_time_mins)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress 
                            value={Math.min(manager.orders_handled * 10, 100)} 
                            className="w-20 h-2" 
                          />
                          <Badge variant={manager.orders_handled > 5 ? "default" : "secondary"}>
                            {manager.orders_handled > 10 ? "Excellent" : manager.orders_handled > 5 ? "Good" : "New"}
                          </Badge>
                        </div>
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

export default ManagerPerformance;
