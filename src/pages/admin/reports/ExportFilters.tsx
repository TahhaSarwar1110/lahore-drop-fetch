import { useState } from "react";
import { ReportsLayout } from "./ReportsLayout";
import { ChartCard } from "@/components/admin/reports/ChartCard";
import { useReportsData } from "@/hooks/useReportsData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Download, CalendarIcon, FileSpreadsheet, FileText, Image } from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { DateRange } from "react-day-picker";

const ExportFilters = () => {
  const { orders, calculateOrderValue } = useReportsData();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");

  const STATUS_OPTIONS = [
    "all", "Pending", "Order Received", "Shopper Assigned",
    "Purchasing", "In Delivery", "Delivered", "Cancelled"
  ];
  const CATEGORY_OPTIONS = ["all", "Fashion", "Food", "Groceries", "Gifts", "Other"];
  const CITY_OPTIONS = ["all", "Lahore"];

  const filteredOrders = orders.filter(order => {
    const orderDate = new Date(order.created_at);
    const matchesDate = (!dateRange?.from || orderDate >= dateRange.from) &&
      (!dateRange?.to || orderDate <= dateRange.to);
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    const orderCategories = order.order_items?.map(item => item.item_type) || [];
    const matchesCategory = categoryFilter === "all" || orderCategories.includes(categoryFilter);

    return matchesDate && matchesStatus && matchesCategory;
  });

  const exportToCSV = () => {
    const headers = [
      "Order ID",
      "Customer",
      "Phone",
      "Delivery Address",
      "Status",
      "Total Value",
      "Items Count",
      "Created Date",
      "Delivered Date",
    ];

    const rows = filteredOrders.map(order => [
      order.id,
      order.profiles?.full_name || "N/A",
      order.profiles?.phone || "N/A",
      order.delivery_address,
      order.status,
      calculateOrderValue(order),
      order.order_items?.length || 0,
      format(new Date(order.created_at), "yyyy-MM-dd HH:mm"),
      order.delivered_at ? format(new Date(order.delivered_at), "yyyy-MM-dd HH:mm") : "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `orders-export-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();

    toast.success(`Exported ${filteredOrders.length} orders to CSV`);
  };

  const exportToJSON = () => {
    const data = filteredOrders.map(order => ({
      id: order.id,
      customer: order.profiles?.full_name || "N/A",
      phone: order.profiles?.phone || "N/A",
      deliveryAddress: order.delivery_address,
      status: order.status,
      totalValue: calculateOrderValue(order),
      itemsCount: order.order_items?.length || 0,
      createdAt: order.created_at,
      deliveredAt: order.delivered_at,
      items: order.order_items?.map(item => ({
        type: item.item_type,
        data: item.item_data,
        status: item.approval_status,
      })),
    }));

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `orders-export-${format(new Date(), "yyyy-MM-dd")}.json`;
    link.click();

    toast.success(`Exported ${filteredOrders.length} orders to JSON`);
  };

  const setPresetRange = (preset: string) => {
    const today = new Date();
    switch (preset) {
      case "today":
        setDateRange({ from: today, to: today });
        break;
      case "week":
        setDateRange({ from: startOfWeek(today), to: endOfWeek(today) });
        break;
      case "month":
        setDateRange({ from: startOfMonth(today), to: endOfMonth(today) });
        break;
      case "last30":
        setDateRange({ from: subDays(today, 30), to: today });
        break;
      case "last90":
        setDateRange({ from: subDays(today, 90), to: today });
        break;
    }
  };

  return (
    <ReportsLayout activeSection="export">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Export & Filters</h1>
          <p className="text-muted-foreground mt-1">Filter data and export reports</p>
        </div>

        {/* Global Filters */}
        <ChartCard title="Filter Options" subtitle="Apply filters before exporting">
          <div className="space-y-6">
            {/* Date Range */}
            <div className="space-y-2">
              <Label>Date Range</Label>
              <div className="flex flex-wrap gap-2 mb-3">
                {[
                  { label: "Today", value: "today" },
                  { label: "This Week", value: "week" },
                  { label: "This Month", value: "month" },
                  { label: "Last 30 Days", value: "last30" },
                  { label: "Last 90 Days", value: "last90" },
                ].map((preset) => (
                  <Button
                    key={preset.value}
                    variant="outline"
                    size="sm"
                    onClick={() => setPresetRange(preset.value)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateRange && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL dd, y")} -{" "}
                          {format(dateRange.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(dateRange.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-popover" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Other Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status === "all" ? "All Statuses" : status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Categories" />
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

              <div className="space-y-2">
                <Label>City</Label>
                <Select value={cityFilter} onValueChange={setCityFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Cities" />
                  </SelectTrigger>
                  <SelectContent>
                    {CITY_OPTIONS.map((city) => (
                      <SelectItem key={city} value={city}>
                        {city === "all" ? "All Cities" : city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Filter Summary */}
            <div className="bg-muted rounded-lg p-4">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{filteredOrders.length}</span> orders
                match your filters
                {dateRange?.from && dateRange?.to && (
                  <span>
                    {" "}from {format(dateRange.from, "MMM d")} to {format(dateRange.to, "MMM d, yyyy")}
                  </span>
                )}
              </p>
            </div>
          </div>
        </ChartCard>

        {/* Export Options */}
        <ChartCard title="Export Data" subtitle="Download filtered data in various formats">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Button
              variant="outline"
              className="h-auto py-6 flex flex-col items-center gap-3"
              onClick={exportToCSV}
            >
              <FileSpreadsheet className="h-8 w-8 text-green-600" />
              <div className="text-center">
                <p className="font-medium">Export to CSV</p>
                <p className="text-xs text-muted-foreground">Excel compatible format</p>
              </div>
            </Button>

            <Button
              variant="outline"
              className="h-auto py-6 flex flex-col items-center gap-3"
              onClick={exportToJSON}
            >
              <FileText className="h-8 w-8 text-blue-600" />
              <div className="text-center">
                <p className="font-medium">Export to JSON</p>
                <p className="text-xs text-muted-foreground">Developer friendly format</p>
              </div>
            </Button>

            <Button
              variant="outline"
              className="h-auto py-6 flex flex-col items-center gap-3 opacity-50"
              disabled
            >
              <Image className="h-8 w-8 text-purple-600" />
              <div className="text-center">
                <p className="font-medium">Export Charts</p>
                <p className="text-xs text-muted-foreground">Coming soon</p>
              </div>
            </Button>
          </div>
        </ChartCard>

        {/* Quick Stats */}
        <ChartCard title="Quick Stats for Selected Period">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-2xl font-bold text-foreground">{filteredOrders.length}</p>
              <p className="text-xs text-muted-foreground">Total Orders</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-2xl font-bold text-foreground">
                Rs. {filteredOrders.reduce((sum, o) => sum + calculateOrderValue(o), 0).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Total Value</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-2xl font-bold text-success">
                {filteredOrders.filter(o => o.status === "Delivered").length}
              </p>
              <p className="text-xs text-muted-foreground">Delivered</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-2xl font-bold text-destructive">
                {filteredOrders.filter(o => o.status === "Cancelled").length}
              </p>
              <p className="text-xs text-muted-foreground">Cancelled</p>
            </div>
          </div>
        </ChartCard>
      </div>
    </ReportsLayout>
  );
};

export default ExportFilters;
