import { DollarSign, Receipt, Undo2, Truck } from "lucide-react";
import { KPICard } from "./KPICard";
import { Skeleton } from "@/components/ui/skeleton";
import { getReportFinancialTotals, type ReportFinancialOrder } from "@/utils/reportFinancials";

export const formatReportCurrency = (value: number) => `Rs. ${value.toLocaleString("en-PK")}`;

export const FinancialTotals = ({ orders, loading }: { orders: ReportFinancialOrder[]; loading: boolean }) => {
  const totals = getReportFinancialTotals(orders);
  return <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
    {loading ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-36 rounded-lg" />) : <>
      <KPICard title="Total Sales Received" value={formatReportCurrency(totals.received)} subtitle="Manager-verified customer payments · all orders" icon={DollarSign} />
      <KPICard title="Actual Shopping Expense" value={formatReportCurrency(totals.shopping)} subtitle="Rider shopping bills · excludes charges" icon={Receipt} />
      <KPICard title="Total Refunds Paid" value={formatReportCurrency(totals.completedRefund)} subtitle="Completed customer refunds only" icon={Undo2} />
      <KPICard title="Delivery & Service Charges" value={formatReportCurrency(totals.charges)} subtitle={`Service: ${formatReportCurrency(totals.service)} · Delivery: ${formatReportCurrency(totals.delivery)}`} icon={Truck} />
    </>}
  </div>;
};