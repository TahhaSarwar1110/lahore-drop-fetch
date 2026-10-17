import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { StorageImage } from "@/components/StorageImage";
import { toast } from "sonner";
import { Receipt, ShieldCheck, ShieldX, Undo2 } from "lucide-react";
import { EXPENSE_STATUS_LABELS } from "@/utils/orderFinancials";

interface ReceiptRow {
  id: string;
  file_url: string;
  file_name: string;
  created_at: string;
}

interface ExpenseReviewProps {
  orderId: string;
  expenseAmount: number | null;
  expenseStatus: string | null;
  expenseNotes: string | null;
  expenseSubmittedAt: string | null;
  rejectionReason: string | null;
  onUpdate: () => void;
}

export const ExpenseReview = ({
  orderId,
  expenseAmount,
  expenseStatus,
  expenseNotes,
  expenseSubmittedAt,
  rejectionReason,
  onUpdate,
}: ExpenseReviewProps) => {
  const [receipts, setReceipts] = useState<ReceiptRow[]>([]);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("order_expense_receipts")
        .select("id, file_url, file_name, created_at")
        .eq("order_id", orderId)
        .order("created_at", { ascending: true });
      setReceipts(data || []);
    };
    load();
  }, [orderId, expenseSubmittedAt]);

  const act = async (action: "verify" | "reject" | "reopen") => {
    if (action === "reject" && !reason.trim()) {
      toast.error("A rejection reason is required");
      return;
    }
    try {
      setSaving(true);
      const { error } =
        action === "reopen"
          ? await supabase.rpc("reopen_shopping_expense", { p_order_id: orderId, p_reason: reason.trim() || null })
          : await supabase.rpc("verify_shopping_expense", {
              p_order_id: orderId,
              p_approved: action === "verify",
              p_reason: action === "reject" ? reason.trim() : null,
            });
      if (error) throw error;
      toast.success(
        action === "verify" ? "Expense verified" : action === "reject" ? "Expense rejected" : "Expense reopened for the rider"
      );
      setReason("");
      onUpdate();
    } catch (error: any) {
      console.error("Expense review error:", error);
      toast.error(error?.message || "Failed to update expense");
    } finally {
      setSaving(false);
    }
  };

  if (!expenseStatus) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            Rider Shopping Expense
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">The rider has not submitted a shopping expense yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Receipt className="h-5 w-5 text-primary" />
          Rider Shopping Expense
          <Badge
            variant={expenseStatus === "verified" ? "default" : expenseStatus === "rejected" ? "destructive" : "outline"}
            className="ml-2"
          >
            {EXPENSE_STATUS_LABELS[expenseStatus] || expenseStatus}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Actual Shopping Expense</span>
            <span className="font-medium">Rs. {(expenseAmount ?? 0).toLocaleString()}</span>
          </div>
          {expenseSubmittedAt && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Submitted</span>
              <span>{new Date(expenseSubmittedAt).toLocaleString()}</span>
            </div>
          )}
        </div>

        {expenseNotes && (
          <div>
            <p className="text-sm font-medium">Rider Notes</p>
            <p className="text-sm text-muted-foreground">{expenseNotes}</p>
          </div>
        )}

        {receipts.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Purchase Receipts ({receipts.length})</p>
            <div className="flex flex-wrap gap-3">
              {receipts.map((r) => (
                <StorageImage key={r.id} bucket="pickup-proofs" src={r.file_url} alt={r.file_name} className="h-28 w-28 object-cover rounded-md border" />
              ))}
            </div>
          </div>
        )}

        {expenseStatus === "rejected" && rejectionReason && (
          <p className="text-sm text-destructive">Reason: {rejectionReason}</p>
        )}

        {(expenseStatus === "pending_review" || expenseStatus === "verified") && (
          <div className="space-y-3 border-t pt-4">
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={expenseStatus === "verified" ? "Reason for reopening (optional)" : "Rejection reason"}
              rows={2}
            />
            {expenseStatus === "pending_review" ? (
              <div className="flex gap-2">
                <Button onClick={() => act("verify")} disabled={saving} className="flex-1">
                  <ShieldCheck className="h-4 w-4 mr-1" />
                  Verify Expense
                </Button>
                <Button variant="destructive" onClick={() => act("reject")} disabled={saving} className="flex-1">
                  <ShieldX className="h-4 w-4 mr-1" />
                  Reject
                </Button>
              </div>
            ) : (
              <Button variant="outline" onClick={() => act("reopen")} disabled={saving}>
                <Undo2 className="h-4 w-4 mr-1" />
                Reopen for Correction
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
