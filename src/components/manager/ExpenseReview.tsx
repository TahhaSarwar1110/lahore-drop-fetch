import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { getPickupProofs } from "@/utils/pickupProofs";
import { StorageImage } from "@/components/StorageImage";
import { toast } from "sonner";
import { Receipt, ShieldCheck, ShieldX, Undo2 } from "lucide-react";
import { EXPENSE_STATUS_LABELS } from "@/utils/orderFinancials";
import { triggerNotification } from "@/utils/notify";

interface ReceiptRow {
  id: string;
  file_url: string;
  file_name: string;
  created_at: string;
}

interface ItemPurchase {
  id: string;
  name: string;
  managerPrice: number | null;
  actualPaid: number | null;
  proofs: { path: string; name: string }[];
  notAvailable: boolean;
  unavailableReason: string | null;
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

const itemName = (d: Record<string, unknown>, type: string) => {
  const e = Object.entries(d || {}).find(([k]) => /item name|description|gift/i.test(k));
  return String(e?.[1] ?? "").trim() || type;
};

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
  const [purchases, setPurchases] = useState<ItemPurchase[]>([]);
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

      const { data: items } = await supabase
        .from("order_items")
        .select("id, item_type, item_data, approval_status, manager_price_pkr")
        .eq("order_id", orderId);
      const active = (items ?? []).filter((i) => i.approval_status !== "rejected");
      const { data: pickups } = active.length
        ? await supabase
            .from("item_pickups")
            .select("order_item_id, actual_paid_pkr, pickup_proof_url, pickup_proof_name, receipt_url, receipt_name, proof_files, not_available, unavailable_reason")
            .in("order_item_id", active.map((i) => i.id))
        : { data: [] as any[] };
      setPurchases(
        active.map((i) => {
          const p = (pickups ?? []).find((x: any) => x.order_item_id === i.id);
          return {
            id: i.id,
            name: itemName(i.item_data as Record<string, unknown>, i.item_type),
            managerPrice: i.manager_price_pkr,
            actualPaid: p?.actual_paid_pkr ?? null,
            proofs: getPickupProofs(p),
            notAvailable: !!p?.not_available,
            unavailableReason: p?.unavailable_reason ?? null,
          };
        })
      );
    };
    load();
  }, [orderId, expenseSubmittedAt, expenseStatus]);

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

      if (action === "verify") {
        // Tell the customer whether they owe money or will receive a refund.
        const { data: o } = await supabase
          .from("orders")
          .select("customer_balance_pkr")
          .eq("id", orderId)
          .single();
        const balance = o?.customer_balance_pkr ?? 0;
        if (balance < 0) {
          void triggerNotification({ event_type: "outstanding_payment_due", order_id: orderId, event_version: `b${balance}` });
        } else if (balance > 0) {
          void triggerNotification({ event_type: "refund_due", order_id: orderId, event_version: `b${balance}` });
        }
      }

      toast.success(
        action === "verify" ? "Shopping bill verified" : action === "reject" ? "Shopping bill rejected" : "Shopping bill reopened for the rider"
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

  const itemBreakdown = purchases.length > 0 && (
    <div className="space-y-3">
      <p className="text-sm font-medium">Item Purchases</p>
      {purchases.map((p) => (
        <div key={p.id} className="rounded-md border p-3 space-y-2">
          <div className="flex flex-wrap justify-between gap-2 text-sm">
            <span className="font-medium break-words">{p.name}</span>
            <span>
              {p.managerPrice != null && <span className="text-muted-foreground">Price Rs. {p.managerPrice.toLocaleString()} · </span>}
              <span className="font-semibold">
                {p.actualPaid != null ? `Paid Rs. ${p.actualPaid.toLocaleString()}` : "Not picked yet"}
              </span>
            </span>
          </div>
          {p.notAvailable && (
            <p className="text-sm text-destructive break-words">Not available{p.unavailableReason ? `: ${p.unavailableReason}` : ""} (Rs. 0)</p>
          )}
          {p.proofs.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {p.proofs.map((f: { path: string }, i: number) => (
                <StorageImage key={f.path} bucket="pickup-proofs" src={f.path} alt={`Proof ${i + 1}`} className="h-28 w-full object-cover rounded-md border" />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  if (!expenseStatus) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            Rider Shopping Bill
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The bill is submitted automatically once the rider picks every item with its amount and receipt.
          </p>
          {itemBreakdown}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Receipt className="h-5 w-5 text-primary" />
          Rider Shopping Bill
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
            <span className="text-muted-foreground">Total Paid by Rider</span>
            <span className="font-medium">Rs. {(expenseAmount ?? 0).toLocaleString()}</span>
          </div>
          {expenseSubmittedAt && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Submitted</span>
              <span>{new Date(expenseSubmittedAt).toLocaleString()}</span>
            </div>
          )}
        </div>

        {itemBreakdown}

        {expenseNotes && expenseNotes !== "Sum of item purchases" && (
          <div>
            <p className="text-sm font-medium">Rider Notes</p>
            <p className="text-sm text-muted-foreground">{expenseNotes}</p>
          </div>
        )}

        {receipts.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Other Receipts ({receipts.length})</p>
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
                  Verify Bill
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
