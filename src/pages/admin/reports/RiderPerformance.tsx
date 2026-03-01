import { useState, useEffect } from "react";
import { ReportsLayout } from "./ReportsLayout";
import { KPICard } from "@/components/admin/reports/KPICard";
import { ChartCard } from "@/components/admin/reports/ChartCard";
import { EmptyState } from "@/components/admin/reports/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { Bike, CheckCircle2, Clock, XCircle, Star } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
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

interface RiderStats {
  rider_id: string;
  rider_name: string;
  total_assigned: number;
  total_delivered: number;
  total_cancelled: number;
  success_rate: number;
  active: boolean;
}

const COLORS = [
  "hsl(220, 70%, 17%)",
  "hsl(18, 90%, 52%)",
  "hsl(142, 76%, 36%)",
  "hsl(45, 93%, 47%)",
  "hsl(280, 65%, 50%)",
];

const RiderPerformance = () => {
  const [riderStats, setRiderStats] = useState<RiderStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRiderStats();
  }, []);

  const fetchRiderStats = async () => {
    try {
      // Fetch all riders
      const { data: riderRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "rider");

      if (!riderRoles) return;

      const riderIds = riderRoles.map(r => r.user_id);

      // Fetch rider profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", riderIds);

      // Fetch all orders with assignments
      const { data: orders } = await supabase
        .from("orders")
        .select(`
          id,
          status,
          delivered_at,
          order_assignments (rider_id)
        `);

      // Fetch active rider locations (active in last 30 mins)
      const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const { data: activeLocations } = await supabase
        .from("rider_locations")
        .select("rider_id")
        .gte("updated_at", thirtyMinsAgo);

      const activeRiderIds = new Set(activeLocations?.map(l => l.rider_id) || []);

      // Calculate stats per rider
      const stats: RiderStats[] = riderIds.map(riderId => {
        const profile = profiles?.find(p => p.id === riderId);
        const assignedOrders = orders?.filter(o => 
          Array.isArray(o.order_assignments) && o.order_assignments.some((a: any) => a.rider_id === riderId)
        ) || [];

        const delivered = assignedOrders.filter(o => o.status === "Delivered").length;
        const cancelled = assignedOrders.filter(o => o.status === "Cancelled").length;
        const total = assignedOrders.length;

        return {
          rider_id: riderId,
          rider_name: profile?.full_name || "Unknown Rider",
          total_assigned: total,
          total_delivered: delivered,
          total_cancelled: cancelled,
          success_rate: total > 0 ? (delivered / total) * 100 : 0,
          active: activeRiderIds.has(riderId),
        };
      });

      setRiderStats(stats.sort((a, b) => b.total_delivered - a.total_delivered));
    } catch (err) {
      console.error("Error fetching rider stats:", err);
    } finally {
      setLoading(false);
    }
  };

  const totalRiders = riderStats.length;
  const activeRiders = riderStats.filter(r => r.active).length;
  const totalDelivered = riderStats.reduce((sum, r) => sum + r.total_delivered, 0);
  const avgSuccessRate = riderStats.length > 0
    ? riderStats.reduce((sum, r) => sum + r.success_rate, 0) / riderStats.length
    : 0;

  const chartData = riderStats.slice(0, 10).map(r => ({
    name: r.rider_name.split(" ")[0],
    delivered: r.total_delivered,
    cancelled: r.total_cancelled,
  }));

  return (
    <ReportsLayout activeSection="riders">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Rider Performance</h1>
          <p className="text-muted-foreground mt-1">Track rider efficiency and delivery metrics</p>
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
              title="Total Riders"
              value={totalRiders}
              subtitle={`${activeRiders} currently active`}
              icon={Bike}
            />
            <KPICard
              title="Total Deliveries"
              value={totalDelivered}
              icon={CheckCircle2}
            />
            <KPICard
              title="Avg Success Rate"
              value={`${avgSuccessRate.toFixed(1)}%`}
              icon={Star}
            />
            <KPICard
              title="Active Now"
              value={activeRiders}
              subtitle="In last 30 minutes"
              icon={Clock}
            />
          </div>
        )}

        {/* Rider Comparison Chart */}
        <ChartCard title="Rider Comparison" subtitle="Top 10 riders by deliveries" loading={loading}>
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
                <Bar dataKey="delivered" name="Delivered" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cancelled" name="Cancelled" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Riders Table */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-foreground">All Riders</h3>
          </div>
          {loading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : riderStats.length === 0 ? (
            <EmptyState
              icon={Bike}
              title="No riders found"
              description="No riders have been assigned to orders yet"
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rider</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Assigned</TableHead>
                    <TableHead className="text-center">Delivered</TableHead>
                    <TableHead className="text-center">Cancelled</TableHead>
                    <TableHead>Success Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {riderStats.map((rider, index) => (
                    <TableRow key={rider.rider_id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {index < 3 && (
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              index === 0 ? "bg-yellow-100 text-yellow-700" :
                              index === 1 ? "bg-gray-100 text-gray-700" :
                              "bg-amber-100 text-amber-700"
                            }`}>
                              {index + 1}
                            </span>
                          )}
                          {rider.rider_name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={rider.active ? "default" : "secondary"}>
                          {rider.active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">{rider.total_assigned}</TableCell>
                      <TableCell className="text-center text-success font-medium">{rider.total_delivered}</TableCell>
                      <TableCell className="text-center text-destructive">{rider.total_cancelled}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={rider.success_rate} className="w-20 h-2" />
                          <span className="text-sm text-muted-foreground">
                            {rider.success_rate.toFixed(0)}%
                          </span>
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

export default RiderPerformance;
