import { Link } from "react-router-dom";
import { Undo2, Wallet } from "lucide-react";
import { ReportsLayout } from "./ReportsLayout";
import { useReportsData } from "@/hooks/useReportsData";
import { getReportOrderFinancials } from "@/utils/reportFinancials";
import { formatReportCurrency } from "@/components/admin/reports/FinancialTotals";
import { KPICard } from "@/components/admin/reports/KPICard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const PendingSettlements = () => {
  const { orders, loading, error, financialTotals } = useReportsData();
  const rows = orders.map(order => ({ order, amounts: getReportOrderFinancials(order) }));
  const refunds = rows.filter(row => row.amounts.pendingRefund > 0);
  const payments = rows.filter(row => row.amounts.outstanding > 0);
  return <ReportsLayout activeSection="settlements">
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Pending Refunds & Payments</h1>
      {error ? <p role="alert" className="text-destructive">Unable to load financial records: {error}</p> : <>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <KPICard title="Refunds Owed to Customers" value={loading ? "—" : formatReportCurrency(financialTotals.pendingRefund)} subtitle={`${refunds.length} orders · verified bills`} icon={Undo2} />
          <KPICard title="Pending Customer Payments" value={loading ? "—" : formatReportCurrency(financialTotals.outstanding)} subtitle={`${payments.length} orders · excludes unverified payments`} icon={Wallet} />
        </div>
        <Tabs defaultValue="refunds">
          <TabsList className="h-auto flex flex-wrap w-fit">
            <TabsTrigger value="refunds">Pending Refunds ({refunds.length})</TabsTrigger>
            <TabsTrigger value="payments">Customer Payments ({payments.length})</TabsTrigger>
          </TabsList>
          {(["refunds", "payments"] as const).map(view => <TabsContent key={view} value={view}>
            <Table>
              <TableHeader><TableRow>
                <TableHead>Order</TableHead><TableHead>Customer</TableHead><TableHead>Status</TableHead>
                <TableHead className="text-right">Verified Received</TableHead>
                <TableHead className="text-right">Shopping Expense</TableHead>
                <TableHead className="text-right">Charges</TableHead>
                <TableHead className="text-right">{view === "refunds" ? "Refund Due" : "Amount Due"}</TableHead>
                <TableHead>Review</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {loading ? <TableRow><TableCell colSpan={8}>Loading financial records…</TableCell></TableRow> :
                  (view === "refunds" ? refunds : payments).length === 0 ? <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">{view === "refunds" ? "No pending refunds" : "No pending customer payments"}</TableCell></TableRow> :
                  (view === "refunds" ? refunds : payments).map(({ order, amounts }) => <TableRow key={order.id}>
                    <TableCell className="whitespace-nowrap">#{order.id.slice(0, 8)}</TableCell>
                    <TableCell><p className="font-medium">{order.profiles?.full_name || "Unknown"}</p><p className="text-xs text-muted-foreground">{order.profiles?.phone}</p></TableCell>
                    <TableCell><Badge variant="outline">{view === "refunds" ? order.refund_status : order.status}</Badge></TableCell>
                    <TableCell className="text-right whitespace-nowrap">{formatReportCurrency(amounts.received)}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">{order.shopping_expense_pkr === null ? "—" : formatReportCurrency(amounts.shopping)}<p className="text-xs text-muted-foreground">{order.expense_status === "verified" ? "Verified" : "Not verified"}</p></TableCell>
                    <TableCell className="text-right whitespace-nowrap">{formatReportCurrency(amounts.charges)}</TableCell>
                    <TableCell className="text-right whitespace-nowrap font-semibold">{formatReportCurrency(view === "refunds" ? amounts.pendingRefund : amounts.outstanding)}</TableCell>
                    <TableCell><Button asChild variant="outline" size="sm"><Link to={`/admin/orders/${order.id}`}>View Order</Link></Button></TableCell>
                  </TableRow>)}
              </TableBody>
            </Table>
          </TabsContent>)}
        </Tabs>
      </>}
    </div>
  </ReportsLayout>;
};

export default PendingSettlements;