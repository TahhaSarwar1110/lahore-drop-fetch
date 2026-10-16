import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Loader2, Landmark } from "lucide-react";
import { toast } from "sonner";

const empty = { bank_name: "", account_title: "", account_number: "", iban: "", instructions: "", is_active: true };
export function BankDetailsManagement() {
  const [accounts, setAccounts] = useState<Tables<"bank_accounts">[]>([]);
  const [loading, setLoading] = useState(true), [loadError, setLoadError] = useState(false);
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null), [fields, setFields] = useState(empty);
  const [deleting, setDeleting] = useState<Tables<"bank_accounts"> | null>(null);
  const load = async () => {
    setLoading(true); setLoadError(false);
    const result = await supabase.from("bank_accounts").select("*").order("created_at");
    setAccounts(result.data ?? []); setLoadError(!!result.error); setLoading(false);
  };
  useEffect(() => { void load(); }, []);
  const edit = (account?: Tables<"bank_accounts">) => {
    setEditingId(account?.id ?? null); setFields(account ? { bank_name: account.bank_name, account_title: account.account_title, account_number: account.account_number, iban: account.iban ?? "", instructions: account.instructions, is_active: account.is_active } : { ...empty });
    setError(""); setOpen(true);
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); if (busy) return;
    const values = { ...fields, bank_name: fields.bank_name.trim(), account_title: fields.account_title.trim(), account_number: fields.account_number.trim(), iban: fields.iban.replace(/\s/g, "").toUpperCase() || null, instructions: fields.instructions.trim() };
    if (values.bank_name.length < 2 || values.account_title.length < 2 || !/^[0-9A-Za-z -]{5,40}$/.test(values.account_number) || (values.iban && !/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(values.iban))) { setError("Enter a valid bank name, account title, account number and optional IBAN."); return; }
    setBusy(true); setError("");
    try {
      const result = editingId ? await supabase.from("bank_accounts").update(values).eq("id", editingId).select("id").single() : await supabase.from("bank_accounts").insert(values).select("id").single();
      if (result.error) throw result.error;
      toast.success("Bank details saved"); setOpen(false); await load();
    } catch { setError("Could not save bank details. Please try again."); } finally { setBusy(false); }
  };
  const remove = async () => {
    if (!deleting || busy) return; setBusy(true); setError("");
    try {
      const result = await supabase.from("bank_accounts").delete().eq("id", deleting.id).select("id").single();
      if (result.error) throw result.error;
      toast.success("Bank account deleted"); setDeleting(null); await load();
    } catch { setError("Could not delete bank account. Please try again."); } finally { setBusy(false); }
  };
  return <div className="space-y-5">
    <div className="flex flex-wrap justify-between items-center gap-3"><h2 className="text-xl font-semibold">Bank Details</h2><Button onClick={() => edit()}><Plus className="mr-2 h-4 w-4" />Add bank account</Button></div>
    {loading ? <Loader2 className="h-6 w-6 animate-spin mx-auto my-8" /> : loadError ? <div role="alert" className="text-destructive">Could not load bank accounts. <Button variant="outline" onClick={load}>Retry</Button></div> : accounts.length === 0 ? <div className="border-y border-border py-10 text-center text-muted-foreground"><Landmark className="h-8 w-8 mx-auto mb-3" /><p>No bank accounts added.</p></div> : <div className="grid gap-4 md:grid-cols-2">{accounts.map(account => <article key={account.id} className="rounded-lg border border-border p-4 space-y-3">
      <div className="flex items-start justify-between gap-3"><h3 className="font-semibold break-words">{account.bank_name}</h3><Badge variant={account.is_active ? "default" : "outline"}>{account.is_active ? "Active" : "Inactive"}</Badge></div>
      <dl className="text-sm space-y-2"><div><dt className="text-muted-foreground">Account title</dt><dd className="break-words">{account.account_title}</dd></div><div><dt className="text-muted-foreground">Account number</dt><dd className="break-all">{account.account_number}</dd></div>{account.iban && <div><dt className="text-muted-foreground">IBAN</dt><dd className="break-all">{account.iban}</dd></div>}{account.instructions && <div><dt className="text-muted-foreground">Payment instructions</dt><dd className="whitespace-pre-wrap break-words">{account.instructions}</dd></div>}</dl>
      <div className="flex justify-end gap-2"><Button variant="outline" size="icon" title="Edit bank account" aria-label={`Edit ${account.bank_name}`} onClick={() => edit(account)}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="text-destructive" title="Delete bank account" aria-label={`Delete ${account.bank_name}`} onClick={() => { setError(""); setDeleting(account); }}><Trash2 className="h-4 w-4" /></Button></div>
    </article>)}</div>}
    <Dialog open={open} onOpenChange={value => { if (!busy) setOpen(value); }}><DialogContent className="max-h-[85dvh] overflow-y-auto"><DialogHeader><DialogTitle>{editingId ? "Edit bank account" : "Add bank account"}</DialogTitle></DialogHeader><form className="space-y-4" onSubmit={save}>
      {([ ["bank_name", "Bank name", 100], ["account_title", "Account title", 150], ["account_number", "Account number", 40], ["iban", "IBAN (optional)", 34] ] as const).map(([key, label, max]) => <div key={key} className="space-y-2"><Label htmlFor={`bank-${key}`}>{label}</Label><Input id={`bank-${key}`} value={fields[key]} required={key !== "iban"} maxLength={max} onChange={e => setFields({ ...fields, [key]: e.target.value })} /></div>)}
      <div className="space-y-2"><Label htmlFor="bank-instructions">Payment instructions (optional)</Label><Textarea id="bank-instructions" value={fields.instructions} maxLength={1000} onChange={e => setFields({ ...fields, instructions: e.target.value })} /></div>
      <div className="flex items-center justify-between"><Label htmlFor="bank-active">Active for customer payments</Label><Switch id="bank-active" checked={fields.is_active} onCheckedChange={is_active => setFields({ ...fields, is_active })} /></div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}<DialogFooter><Button type="button" variant="outline" disabled={busy} onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save bank account"}</Button></DialogFooter>
    </form></DialogContent></Dialog>
    <AlertDialog open={!!deleting} onOpenChange={value => { if (!busy && !value) setDeleting(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete bank account?</AlertDialogTitle><AlertDialogDescription>{deleting?.bank_name} — {deleting?.account_title}. Customers will no longer see this account for payments.</AlertDialogDescription></AlertDialogHeader>{error && <p role="alert" className="text-destructive">{error}</p>}<AlertDialogFooter><AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel><Button variant="destructive" disabled={busy} onClick={remove}>{busy ? "Deleting…" : "Delete bank account"}</Button></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}