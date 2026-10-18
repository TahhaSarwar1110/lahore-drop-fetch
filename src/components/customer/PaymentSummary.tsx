import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet } from "lucide-react";
import {
  getCustomerPaymentDisplay,
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
  submittedAmount?: number;
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
  submittedAmount = 0,
}: PaymentSummaryProps) => {
  if (orderTotal === null || orderTotal === undefined) return null;

  const target = expenseStatus === "verified" && shoppingExpense !== null ? shoppingExpense : orderTotal;
  const display = getCustomerPaymentDisplay(target, paidAmount, submittedAmount, paymentVerification);
  const outstanding = display.outstanding;
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
          <span className="font-medium">Rs. {display.amountPaid.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total Outstanding</span>
          <span className="font-medium">Rs. {outstanding.toLocaleString()}</span>
        </div>
        {display.pendingAmount > 0 && <p className="text-xs text-muted-foreground">Rs. {display.pendingAmount.toLocaleString()} awaiting verification · Rs. {paidAmount.toLocaleString()} verified. Delivery remains subject to manager verification.</p>}
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
              Please pay the remaining amount. Payments must be verified by our team.
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
            {display.pendingAmount > 0 ? "Your additional payment is awaiting manager verification before delivery." : "The actual shopping cost exceeded the verified amount paid. Please pay the difference before delivery."}
          </p>
        )}
      </CardContent>
    </Card>
  );
};
