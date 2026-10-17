import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet } from "lucide-react";
import {
  getOutstandingAmount,
  getRefundDue,
  hasUncoveredExpense,
  PAYMENT_VERIFICATION_LABELS,
  EXPENSE_STATUS_LABELS,
  REFUND_STATUS_LABELS,
} from "@/utils/orderFinancials";

interface PaymentSummaryProps {
  orderTotal: number | null;
  paidAmount: number;
  paymentVerification: string;
  paymentRejectionReason: string | null;
  shoppingExpense: number | null;
  expenseStatus: string | null;
  customerBalance: number | null;
  refundStatus: string;
}

export const PaymentSummary = ({
  orderTotal,
  paidAmount,
  paymentVerification,
  paymentRejectionReason,
  shoppingExpense,
  expenseStatus,
  customerBalance,
  refundStatus,
}: PaymentSummaryProps) => {
  if (orderTotal === null || orderTotal === undefined) return null;

  const outstanding = getOutstandingAmount(orderTotal, paidAmount);
  const refundDue = customerBalance !== null ? getRefundDue(customerBalance) : 0;
  const uncovered = customerBalance !== null && hasUncoveredExpense(customerBalance);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          Payment Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Order Total</span>
          <span className="font-medium">Rs. {orderTotal.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Amount Paid</span>
          <span className="font-medium">Rs. {paidAmount.toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Payment Status</span>
          <Badge
            variant={
              paymentVerification === "verified" ? "default" : paymentVerification === "rejected" ? "destructive" : "outline"
            }
          >
            {PAYMENT_VERIFICATION_LABELS[paymentVerification] || "Pending Verification"}
          </Badge>
        </div>

        {paymentVerification === "rejected" && paymentRejectionReason && (
          <p className="text-destructive">Payment issue: {paymentRejectionReason}</p>
        )}

        {paymentVerification !== "rejected" && outstanding > 0 && (
          <div className="rounded-md bg-destructive/10 border border-destructive/30 p-3">
            <p className="text-destructive font-medium">
              Outstanding amount: Rs. {outstanding.toLocaleString()}
            </p>
            <p className="text-muted-foreground text-xs mt-1">
              Please pay the remaining amount so your order can be approved.
            </p>
          </div>
        )}

        {expenseStatus === "verified" && shoppingExpense !== null && (
          <div className="flex justify-between border-t pt-3">
            <span className="text-muted-foreground">Actual Shopping Cost</span>
            <span className="font-medium">Rs. {shoppingExpense.toLocaleString()}</span>
          </div>
        )}

        {expenseStatus && expenseStatus !== "verified" && (
          <div className="flex justify-between items-center border-t pt-3">
            <span className="text-muted-foreground">Shopping Expense</span>
            <Badge variant="outline">{EXPENSE_STATUS_LABELS[expenseStatus] || expenseStatus}</Badge>
          </div>
        )}

        {refundDue > 0 && (
          <div className="rounded-md bg-primary/10 border border-primary/30 p-3 space-y-1">
            <div className="flex justify-between items-center">
              <span className="font-medium">
                {refundStatus === "completed" ? "Refund Completed" : "Refund Due"}
              </span>
              <span className="font-semibold">Rs. {refundDue.toLocaleString()}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {REFUND_STATUS_LABELS[refundStatus] || refundStatus}
            </p>
          </div>
        )}

        {uncovered && (
          <p className="text-xs text-muted-foreground border-t pt-3">
            The actual shopping cost exceeded the amount paid. Our team will contact you about the difference.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
