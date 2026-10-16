import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

export function BankAccountDetails() {
  const [accounts, setAccounts] = useState<Tables<"bank_accounts">[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const load = async () => {
    setLoading(true); setError(false);
    const result = await supabase.from("bank_accounts").select("*").eq("is_active", true).order("created_at");
    setError(!!result.error); setAccounts(result.data ?? []); setLoading(false);
  };
  useEffect(() => { void load(); }, []);
  const copy = async (value: string) => {
    try { await navigator.clipboard.writeText(value); toast.success("Copied"); }
    catch { toast.error("Could not copy account details"); }
  };
  return <section className="space-y-3 border-y border-border py-4">
    <h4 className="font-semibold">Tabedaar.com Bank Details</h4>
    {loading ? <Loader2 className="h-5 w-5 animate-spin" aria-label="Loading bank details" /> : error ? <div role="alert" className="text-sm text-destructive">Bank details could not be loaded. <Button type="button" variant="outline" size="sm" onClick={load}>Retry</Button></div> : accounts.length === 0 ? <p className="text-sm text-muted-foreground">No payment account is available. Please contact contact@tabedaar.com before transferring payment.</p> : accounts.map(account => <dl key={account.id} className="space-y-1 text-sm border-b border-border last:border-0 pb-3 last:pb-0">
      <div><dt className="inline font-medium">Bank: </dt><dd className="inline break-words">{account.bank_name}</dd></div>
      <div><dt className="inline font-medium">Account title: </dt><dd className="inline break-words">{account.account_title}</dd></div>
      <div className="flex items-center gap-2"><div className="min-w-0"><dt className="inline font-medium">Account number: </dt><dd className="inline break-all">{account.account_number}</dd></div><Button type="button" size="icon" variant="ghost" className="shrink-0" aria-label="Copy account number" title="Copy account number" onClick={() => copy(account.account_number)}><Copy className="h-4 w-4" /></Button></div>
      {account.iban && <div className="flex items-center gap-2"><div className="min-w-0"><dt className="inline font-medium">IBAN: </dt><dd className="inline break-all">{account.iban}</dd></div><Button type="button" size="icon" variant="ghost" className="shrink-0" aria-label="Copy IBAN" title="Copy IBAN" onClick={() => copy(account.iban ?? "")}><Copy className="h-4 w-4" /></Button></div>}
      {account.instructions && <p className="whitespace-pre-wrap break-words text-muted-foreground">{account.instructions}</p>}
    </dl>)}
  </section>;
}