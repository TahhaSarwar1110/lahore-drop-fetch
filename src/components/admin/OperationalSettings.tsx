import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Tables } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { useOperatingCities } from "@/hooks/useOperatingCities";
import { operatingCityNameSchema } from "@/utils/operatingCities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export function OperationalSettings() {
  const { data: cities = [], isLoading, isError, refetch } = useOperatingCities(true);
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Tables<"operating_cities"> | null>(null);
  const [deleting, setDeleting] = useState<Tables<"operating_cities"> | null>(null);
  const [name, setName] = useState("");
  const [active, setActive] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["operating-cities"] });
  const edit = (city: Tables<"operating_cities"> | null) => {
    setEditing(city); setName(city?.name ?? ""); setActive(city?.is_active ?? true); setError(""); setOpen(true);
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const parsed = operatingCityNameSchema.safeParse(name);
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Enter a valid city name."); return; }
    setBusy(true); setError("");
    try {
      const values = { name: parsed.data, is_active: active };
      const result = editing
        ? await supabase.from("operating_cities").update(values).eq("id", editing.id).select("id").single()
        : await supabase.from("operating_cities").insert(values).select("id").single();
      if (result.error) {
        setError(result.error.code === "23505" ? "This city is already in the list." : "Could not save the city. Please try again.");
        return;
      }
      await refresh(); setOpen(false); toast.success("Operating city saved");
    } catch { setError("Could not save the city. Please try again."); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    if (!deleting || busy) return;
    setBusy(true); setError("");
    try {
      const { error: deleteError } = await supabase.from("operating_cities").delete().eq("id", deleting.id).select("id").single();
      if (deleteError) throw deleteError;
      await refresh(); setDeleting(null); toast.success("Operating city deleted");
    } catch { setError("Could not delete the city. Please try again."); }
    finally { setBusy(false); }
  };
  return <section className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">Operating Cities</h2><Button onClick={() => edit(null)}><Plus className="mr-2 h-4 w-4" />Add city</Button></div>
    {isLoading ? <p className="py-8 text-center text-muted-foreground">Loading cities…</p> : isError ? <div role="alert" className="text-destructive">Could not load operating cities. <Button variant="outline" onClick={() => refetch()}>Retry</Button></div> :
      <Table><TableHeader><TableRow><TableHead>City</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>
        {cities.length === 0 ? <TableRow><TableCell colSpan={3} className="py-10 text-center text-muted-foreground">No operating cities added.</TableCell></TableRow> : cities.map(city => <TableRow key={city.id}>
          <TableCell className="font-medium break-words">{city.name}</TableCell><TableCell>{city.is_active ? "Active" : "Inactive"}</TableCell>
          <TableCell><div className="flex justify-end gap-2"><Button variant="outline" size="icon" title={`Edit ${city.name}`} aria-label={`Edit ${city.name}`} onClick={() => edit(city)}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="text-destructive" title={`Delete ${city.name}`} aria-label={`Delete ${city.name}`} onClick={() => { setError(""); setDeleting(city); }}><Trash2 className="h-4 w-4" /></Button></div></TableCell>
        </TableRow>)}
      </TableBody></Table>}
    <Dialog open={open} onOpenChange={value => { if (!busy) setOpen(value); }}><DialogContent><DialogHeader><DialogTitle>{editing ? "Edit operating city" : "Add operating city"}</DialogTitle></DialogHeader>
      <form onSubmit={save} className="space-y-4"><div className="space-y-2"><Label htmlFor="operating-city-name">City name</Label><Input id="operating-city-name" value={name} onChange={event => setName(event.target.value)} maxLength={100} required /></div>
        <div className="flex items-center justify-between gap-3"><Label htmlFor="operating-city-active">Active</Label><Switch id="operating-city-active" checked={active} onCheckedChange={setActive} /></div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}<DialogFooter><Button type="button" variant="outline" disabled={busy} onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" loading={busy} disabled={busy}>Save city</Button></DialogFooter>
      </form></DialogContent></Dialog>
    <AlertDialog open={Boolean(deleting)} onOpenChange={value => { if (!busy && !value) setDeleting(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete {deleting?.name}?</AlertDialogTitle><AlertDialogDescription>This city will no longer be available for new orders. Existing orders keep their selected city.</AlertDialogDescription></AlertDialogHeader>{error && <p role="alert" className="text-destructive">{error}</p>}<AlertDialogFooter><AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel><Button variant="destructive" loading={busy} disabled={busy} onClick={remove}>Delete city</Button></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </section>;
}