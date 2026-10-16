import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Eye, Pencil, Trash2, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
interface Props { userId: string; userName: string; roles: string[]; isSelf: boolean; onUpdated: () => void }
interface Fields { full_name:string; email:string; phone:string; cnic_number:string; permanent_address:string; alternative_contact:string }
interface Loaded { profile: Tables<"profiles">; details: Tables<"user_details"> | null; email:string; lastSignIn:string|null; emailConfirmed:boolean; latestDeliveryAddress:string }
const empty: Fields = {full_name:"",email:"",phone:"",cnic_number:"",permanent_address:"",alternative_contact:""};
export async function userRequest(body: Record<string,unknown>) {
  const {data,error} = await supabase.functions.invoke("manage-users",{body});
  if (error) {
    const context = (error as {context?: Response}).context;
    if (context) { const result = await context.json().catch(()=>null); if(result?.error) throw new Error(result.error); }
    throw new Error("Could not complete the request. Please try again.");
  }
  if(data?.error) throw new Error(data.error);
  return data;
}
export function UserDetailsDialog({userId,userName,roles,isSelf,onUpdated}:Props) {
  const [open,setOpen]=useState(false),[editing,setEditing]=useState(false),[busy,setBusy]=useState(false),[loading,setLoading]=useState(false);
  const [loaded,setLoaded]=useState<Loaded|null>(null),[fields,setFields]=useState<Fields>(empty),[error,setError]=useState("");
  const [files,setFiles]=useState<Partial<Record<"id_card"|"utility_bill",File>>>({});
  const [deleting,setDeleting]=useState(false),[confirmation,setConfirmation]=useState("");
  const load = async (edit=false) => {
    setOpen(true);setEditing(edit);setLoading(true);setError("");setFiles({});setLoaded(null);
    try { const d:Loaded=await userRequest({action:"get",userId});setLoaded(d);setFields({full_name:d.profile.full_name,email:d.email,phone:d.profile.phone,cnic_number:d.details?.cnic_number??"",permanent_address:d.details?.permanent_address??"",alternative_contact:d.details?.alternative_contact??""}); }
    catch(e){setError(e instanceof Error?e.message:"Could not load user");}finally{setLoading(false);}
  };
  const save = async(e:React.FormEvent) => {
    e.preventDefault();if(busy)return;setBusy(true);setError("");
    try {
      const encoded:Record<string,unknown>={};
      for(const [kind,file] of Object.entries(files)) {
        encoded[kind]={name:file.name,type:file.type,base64:await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>{if(typeof reader.result==="string")resolve(reader.result.split(",")[1]);else reject(new Error("Could not read document"));};reader.onerror=()=>reject(new Error("Could not read document"));reader.readAsDataURL(file);})};
      }
      await userRequest({action:"update",userId,fields,files:encoded});toast.success("User details updated");setOpen(false);onUpdated();
    }catch(e){setError(e instanceof Error?e.message:"Could not save user");}finally{setBusy(false);}
  };
  const remove = async()=> {
    if(busy)return;setBusy(true);setError("");
    try{await userRequest({action:"delete",userId,confirmation});toast.success("User deleted");setDeleting(false);setOpen(false);onUpdated();}
    catch(e){setError(e instanceof Error?e.message:"Could not delete user");}finally{setBusy(false);}
  };
  const openDocument=async(kind:string)=> {
    const windowRef=window.open("","_blank");if(windowRef)windowRef.opener=null;
    try{const data=await userRequest({action:"document",userId,kind});if(windowRef)windowRef.location.href=data.url;else toast.error("Allow pop-ups to open the document");}
    catch(e){windowRef?.close();toast.error(e instanceof Error?e.message:"Could not open document");}
  };
  const field = (key:keyof Fields,label:string,type="text") => <div className="space-y-2"><Label htmlFor={`user-${key}`}>{label}</Label>{editing ? key==="permanent_address"?<Textarea id={`user-${key}`} value={fields[key]} onChange={e=>setFields({...fields,[key]:e.target.value})} maxLength={1000}/>:<Input id={`user-${key}`} type={type} value={fields[key]} onChange={e=>setFields({...fields,[key]:e.target.value})} required={["full_name","email","phone"].includes(key)} maxLength={key==="email"?254:key==="full_name"?100:30}/>:<p className="text-sm break-words whitespace-pre-wrap">{fields[key]||"Not provided"}</p>}</div>;
  return <>
    <div className="flex justify-end gap-1">
      <Button variant="outline" size="sm" onClick={()=>load()}><Eye className="mr-1 h-4 w-4"/>Details</Button>
      <Button variant="ghost" size="icon" title="Edit user details" aria-label={`Edit details for ${userName}`} onClick={()=>load(true)}><Pencil className="h-4 w-4"/></Button>
      <Button variant="ghost" size="icon" className="text-destructive" title={isSelf?"You cannot delete your own account":"Delete user"} aria-label={`Delete ${userName}`} disabled={isSelf} onClick={()=>{setError("");setConfirmation("");setDeleting(true);}}><Trash2 className="h-4 w-4"/></Button>
    </div>
    <Dialog open={open} onOpenChange={v=>{if(!busy)setOpen(v);}}><DialogContent className="sm:max-w-2xl max-h-[85dvh] overflow-y-auto"><DialogHeader><DialogTitle>{editing?"Edit user details":"User details"}</DialogTitle><DialogDescription className="break-words">{userName} · {roles.join(", ")||"No role"}</DialogDescription></DialogHeader>
      {loading?<Loader2 className="mx-auto my-8 h-6 w-6 animate-spin"/>:loaded?<form onSubmit={save} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{field("full_name","Full name")}{field("email","Email","email")}{field("phone","Phone","tel")}{field("alternative_contact","Alternative contact","tel")}{field("cnic_number","CNIC number")}<div className="sm:col-span-2">{field("permanent_address","Permanent address")}</div></div>
        <div className="border-t border-border pt-4 space-y-3"><h3 className="font-semibold">Documents</h3>{(["id_card","utility_bill"] as const).map(kind=><div key={kind} className="space-y-2"><Label htmlFor={`upload-${kind}`}>{kind==="id_card"?"ID card (CNIC)":"Utility bill"}</Label><div>{loaded.details?.[`${kind}_url`]?<Button type="button" size="sm" variant="outline" className="max-w-full" onClick={()=>openDocument(kind)}><FileText className="mr-2 h-4 w-4 shrink-0"/><span className="truncate">{loaded.details?.[`${kind}_name`]||"Open document"}</span></Button>:<p className="text-sm text-muted-foreground">Not uploaded</p>}</div>{editing&&<Input id={`upload-${kind}`} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={e=>{const file=e.target.files?.[0];if(!file){setFiles(previous=>{const next={...previous};delete next[kind];return next;});return;}if(file.size>5*1024*1024||!["image/jpeg","image/png","image/webp","application/pdf"].includes(file.type)){toast.error("Choose a JPG, PNG, WebP or PDF under 5 MB");e.target.value="";return;}setFiles({...files,[kind]:file});}}/>}</div>)}</div>
        <dl className="grid gap-3 text-sm border-t border-border pt-4"><div><dt className="text-muted-foreground">User ID</dt><dd className="break-all">{userId}</dd></div><div><dt className="text-muted-foreground">Joined</dt><dd>{new Date(loaded.profile.created_at??"").toLocaleString()}</dd></div><div><dt className="text-muted-foreground">Last sign-in</dt><dd>{loaded.lastSignIn?new Date(loaded.lastSignIn).toLocaleString():"Never"}</dd></div><div><dt className="text-muted-foreground">Email status</dt><dd>{loaded.emailConfirmed?"Verified":"Not verified"}</dd></div><div><dt className="text-muted-foreground">Latest delivery address</dt><dd className="break-words">{loaded.latestDeliveryAddress||"No orders yet"}</dd></div></dl>
        {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
        <DialogFooter><Button type="button" variant="outline" disabled={busy} onClick={()=>setOpen(false)}>Close</Button>{editing?<Button type="submit" disabled={busy}>{busy?"Saving…":"Save changes"}</Button>:<Button type="button" onClick={()=>setEditing(true)}><Pencil className="mr-2 h-4 w-4"/>Edit details</Button>}</DialogFooter>
      </form>:<p role="alert" className="text-destructive">{error}</p>}
    </DialogContent></Dialog>
    <AlertDialog open={deleting} onOpenChange={v=>{if(!busy)setDeleting(v);}}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete {userName}?</AlertDialogTitle><AlertDialogDescription>This permanently deletes their account, personal details and uploaded user documents. Users with order or support history cannot be deleted.</AlertDialogDescription></AlertDialogHeader><Label htmlFor={`delete-${userId}`}>Type DELETE to confirm</Label><Input id={`delete-${userId}`} value={confirmation} onChange={e=>setConfirmation(e.target.value)} autoComplete="off"/>{error&&<p role="alert" className="text-sm text-destructive">{error}</p>}<AlertDialogFooter><AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel><Button variant="destructive" disabled={busy||confirmation!=="DELETE"} onClick={remove}>{busy?"Deleting…":"Delete user"}</Button></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </>;
}
