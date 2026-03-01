import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, subDays, startOfWeek, startOfMonth, format } from "date-fns";

export interface OrderWithDetails {
  id: string;
  user_id: string;
  created_at: string;
  status: string;
  delivery_address: string;
  additional_charges: number | null;
  delivered_at: string | null;
  confirmed_at: string | null;
  confirmed_by: string | null;
  payment_confirmed_at: string | null;
  profiles: {
    full_name: string;
    phone: string;
  } | null;
  order_items: {
    id: string;
    item_type: string;
    item_data: any;
    approval_status: string | null;
  }[] | null;
  order_assignments: {
    rider_id: string;
    assigned_by: string;
    assigned_at: string;
  }[] | null;
}

export interface RiderStats {
  rider_id: string;
  rider_name: string;
  total_assigned: number;
  total_delivered: number;
  success_rate: number;
  avg_delivery_time_hours: number | null;
}

export interface ManagerStats {
  manager_id: string;
  manager_name: string;
  orders_handled: number;
  orders_confirmed: number;
  avg_handling_time_hours: number | null;
}

export interface CustomerStats {
  customer_id: string;
  customer_name: string;
  total_orders: number;
  total_spent: number;
  avg_order_value: number;
  first_order_date: string;
  last_order_date: string;
}

export const useReportsData = () => {
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          profiles (full_name, phone),
          order_items (id, item_type, item_data, approval_status),
          order_assignments (rider_id, assigned_by, assigned_at)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders((data as unknown as OrderWithDetails[]) || []);
    } catch (err) {
      console.error("Error fetching orders:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Calculate KPIs
  const today = startOfDay(new Date());
  const weekStart = startOfWeek(new Date());
  const monthStart = startOfMonth(new Date());
  const lastMonthStart = startOfMonth(subDays(monthStart, 1));

  const ordersToday = orders.filter(o => new Date(o.created_at) >= today);
  const ordersThisWeek = orders.filter(o => new Date(o.created_at) >= weekStart);
  const ordersThisMonth = orders.filter(o => new Date(o.created_at) >= monthStart);
  const ordersLastMonth = orders.filter(o => {
    const date = new Date(o.created_at);
    return date >= lastMonthStart && date < monthStart;
  });

  const calculateOrderValue = (order: OrderWithDetails): number => {
    const itemsTotal = order.order_items?.reduce((sum, item) => {
      const price = parseFloat(
        item.item_data?.["Price (PKR)"] ||
        item.item_data?.price ||
        item.item_data?.["Expected Price (PKR)"] ||
        "0"
      );
      return sum + (isNaN(price) ? 0 : price);
    }, 0) || 0;
    return itemsTotal + (order.additional_charges || 0);
  };

  const totalRevenue = orders
    .filter(o => o.status === "Delivered")
    .reduce((sum, o) => sum + calculateOrderValue(o), 0);

  const totalRevenueThisMonth = ordersThisMonth
    .filter(o => o.status === "Delivered")
    .reduce((sum, o) => sum + calculateOrderValue(o), 0);

  const totalRevenueLastMonth = ordersLastMonth
    .filter(o => o.status === "Delivered")
    .reduce((sum, o) => sum + calculateOrderValue(o), 0);

  const deliveredOrders = orders.filter(o => o.status === "Delivered");
  const avgOrderValue = deliveredOrders.length > 0
    ? totalRevenue / deliveredOrders.length
    : 0;

  const completedOrders = orders.filter(o => o.status === "Delivered").length;
  const cancelledOrders = orders.filter(o => o.status === "Cancelled").length;

  // Same-day delivery rate
  const sameDayDeliveries = deliveredOrders.filter(o => {
    if (!o.delivered_at) return false;
    const created = startOfDay(new Date(o.created_at));
    const delivered = startOfDay(new Date(o.delivered_at));
    return created.getTime() === delivered.getTime();
  });
  const sameDayRate = deliveredOrders.length > 0
    ? (sameDayDeliveries.length / deliveredOrders.length) * 100
    : 0;

  // Order status distribution
  const statusCounts = orders.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Orders by category
  const categoryCounts = orders.reduce((acc, order) => {
    order.order_items?.forEach(item => {
      const category = item.item_type || "Other";
      acc[category] = (acc[category] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);

  // Revenue trend by day (last 30 days)
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const date = subDays(new Date(), 29 - i);
    return format(date, "yyyy-MM-dd");
  });

  const revenueByDay = last30Days.map(dateStr => {
    const dayOrders = orders.filter(o => 
      format(new Date(o.created_at), "yyyy-MM-dd") === dateStr &&
      o.status === "Delivered"
    );
    const revenue = dayOrders.reduce((sum, o) => sum + calculateOrderValue(o), 0);
    return {
      date: dateStr,
      revenue,
      orders: dayOrders.length,
    };
  });

  // Revenue growth
  const revenueGrowth = totalRevenueLastMonth > 0
    ? ((totalRevenueThisMonth - totalRevenueLastMonth) / totalRevenueLastMonth) * 100
    : 0;

  return {
    orders,
    loading,
    error,
    refetch: fetchOrders,
    kpis: {
      totalOrders: orders.length,
      ordersToday: ordersToday.length,
      ordersThisWeek: ordersThisWeek.length,
      ordersThisMonth: ordersThisMonth.length,
      totalRevenue,
      avgOrderValue,
      completedOrders,
      cancelledOrders,
      sameDayRate,
      revenueGrowth,
    },
    statusCounts,
    categoryCounts,
    revenueByDay,
    calculateOrderValue,
  };
};
