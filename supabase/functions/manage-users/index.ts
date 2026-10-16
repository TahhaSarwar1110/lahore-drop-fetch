import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
serve(async req => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  try {
    const db = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return reply({ error: "Unauthorized" }, 401);
    const { data: { user }, error: authError } = await db.auth.getUser(token);
    if (authError || !user) return reply({ error: "Unauthorized" }, 401);
    const { data: role, error: roleError } = await db.from("user_roles").select("id").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (roleError || !role) return reply({ error: "Admin access required" }, 403);
    const body = await req.json();
    if (body.action === "list") {
      const [profiles, roles] = await Promise.all([db.from("profiles").select("*").order("created_at", { ascending: false }), db.from("user_roles").select("user_id,role")]);
      if (profiles.error || roles.error) throw new Error("Unable to load users");
      const users = await Promise.all((profiles.data ?? []).map(async p => {
        const { data, error } = await db.auth.admin.getUserById(p.id);
        if (error) throw new Error("Unable to load account details");
        return { ...p, email: data.user.email ?? "", roles: (roles.data ?? []).filter(r => r.user_id === p.id).map(r => r.role) };
      }));
      return reply({ users, currentUserId: user.id });
    }
    const id = body.userId;
    if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) return reply({ error: "Invalid user" }, 400);
    const { data: account, error: accountError } = await db.auth.admin.getUserById(id);
    if (accountError || !account.user) return reply({ error: "User not found" }, 404);
    if (body.action === "role") {
      if (!["admin", "manager", "rider", "customer", "user"].includes(body.role)) return reply({ error: "Invalid role" }, 400);
      if (id === user.id && body.role !== "admin") return reply({ error: "You cannot remove your own admin access" }, 409);
      const { error } = await db.rpc("assign_admin_created_user_role", { p_user_id: id, p_role: body.role });
      if (error) throw new Error("Unable to update role");
      return reply({ success: true });
    }
    const { data: details, error: detailsError } = await db.from("user_details").select("*").eq("user_id", id).maybeSingle();
    if (detailsError) throw new Error("Unable to load user details");
    const documentPath = (url: string) => {
      const prefix = `${Deno.env.get("SUPABASE_URL")}/storage/v1/object/public/user-documents/`;
      const path = url.startsWith(prefix) ? decodeURIComponent(url.slice(prefix.length)) : url;
      if (!path.startsWith(`${id}/`) || path.includes("..")) throw new Error("Invalid document");
      return path;
    };
    if (body.action === "get") {
      const [profile, orders] = await Promise.all([db.from("profiles").select("*").eq("id", id).single(), db.from("orders").select("id,delivery_address,created_at").eq("user_id", id).order("created_at", { ascending: false }).limit(1)]);
      if (profile.error || orders.error) throw new Error("Unable to load user details");
      return reply({ profile: profile.data, details, email: account.user.email ?? "", lastSignIn: account.user.last_sign_in_at, emailConfirmed: !!account.user.email_confirmed_at, latestDeliveryAddress: orders.data?.[0]?.delivery_address ?? "" });
    }
    if (body.action === "document") {
      const key = body.kind === "id_card" ? "id_card_url" : body.kind === "utility_bill" ? "utility_bill_url" : null;
      if (!key || !details?.[key]) return reply({ error: "Document not found" }, 404);
      const { data, error } = await db.storage.from("user-documents").createSignedUrl(documentPath(details[key]), 60);
      if (error) throw new Error("Unable to open document");
      return reply({ url: data.signedUrl });
    }
    if (body.action === "update") {
      const f = body.fields ?? {};
      const value = (key: string, max: number) => { const v = typeof f[key] === "string" ? f[key].trim() : ""; if (v.length > max) throw new Error(`${key.replaceAll("_", " ")} is too long`); return v; };
      const name = value("full_name",100), phone = value("phone",20), email = value("email",254);
      if (name.length < 2 || !/^[+\d\s()-]{7,20}$/.test(phone) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return reply({ error: "Enter a valid name, phone and email" },400);
      const uploaded: string[] = [];
      const args: Record<string, unknown> = { p_user_id:id, p_full_name:name,p_phone:phone,p_cnic:value("cnic_number",30)||null,p_address:value("permanent_address",1000)||null,p_alternative:value("alternative_contact",20)||null,p_id_url:details?.id_card_url??null,p_id_name:details?.id_card_name??null,p_bill_url:details?.utility_bill_url??null,p_bill_name:details?.utility_bill_name??null };
      let emailChanged = false;
      try {
        for (const kind of ["id_card", "utility_bill"]) {
          const file = body.files?.[kind];
          if (!file) continue;
          const ext = ({ "image/jpeg":"jpg","image/png":"png","image/webp":"webp","application/pdf":"pdf" } as Record<string,string>)[file.type];
          if (!ext || typeof file.base64 !== "string" || file.base64.length > 7000000 || typeof file.name !== "string" || file.name.length>255) throw new Error("Upload a JPG, PNG, WebP or PDF under 5 MB");
          const bytes = Uint8Array.from(atob(file.base64), c => c.charCodeAt(0));
          if (!bytes.length || bytes.length > 5*1024*1024) throw new Error("Document must be under 5 MB");
          const path = `${id}/${kind}-${crypto.randomUUID()}.${ext}`;
          const { error } = await db.storage.from("user-documents").upload(path,bytes,{contentType:file.type});
          if (error) throw new Error("Unable to upload document");
          uploaded.push(path);
          const prefix = kind === "id_card" ? "p_id" : "p_bill";
          args[`${prefix}_url`] = path; args[`${prefix}_name`] = file.name;
        }
        if (email !== account.user.email) {
          const { error } = await db.auth.admin.updateUserById(id,{email});
          if (error) throw new Error("Could not update email; it may already be in use");
          emailChanged = true;
        }
        const { error } = await db.rpc("admin_save_user_details",args);
        if (error) throw new Error("Unable to save user details");
      } catch (err) {
        if (uploaded.length) await db.storage.from("user-documents").remove(uploaded);
        if (emailChanged) { const {error} = await db.auth.admin.updateUserById(id,{email:account.user.email}); if(error) console.error("manage-users: email rollback failed"); }
        throw err;
      }
      return reply({ success:true });
    }
    if (body.action === "delete") {
      if (id === user.id) return reply({ error: "You cannot delete your own account" },409);
      if (body.confirmation !== "DELETE") return reply({ error: "Type DELETE to confirm" },400);
      // Never cascade-delete a customer's orders or staff operational history.
      const checks = [db.from("orders").select("id",{count:"exact",head:true}).or(`user_id.eq.${id},confirmed_by.eq.${id},payment_confirmed_by.eq.${id},delivery_payment_confirmed_by.eq.${id},delivery_charges_set_by.eq.${id}`),db.from("order_assignments").select("id",{count:"exact",head:true}).or(`rider_id.eq.${id},assigned_by.eq.${id}`),db.from("order_items").select("id",{count:"exact",head:true}).eq("approved_by",id),db.from("order_attachments").select("id",{count:"exact",head:true}).eq("uploaded_by",id),db.from("item_pickups").select("id",{count:"exact",head:true}).eq("rider_id",id),db.from("whatsapp_messages").select("id",{count:"exact",head:true}).eq("sent_by",id)];
      const results = await Promise.all(checks);
      if (results.some(r=>r.error)) throw new Error("Unable to check linked records");
      if (results.some(r=>(r.count??0)>0)) return reply({error:"This user has order or support history and cannot be deleted. Their details can still be edited."},409);
      const {error} = await db.auth.admin.deleteUser(id);
      if(error) throw new Error("Unable to delete user; linked records may still exist");
      const {data: objects,error:listError} = await db.storage.from("user-documents").list(id,{limit:1000});
      if (!listError && objects?.length) { const {error} = await db.storage.from("user-documents").remove(objects.map(o=>`${id}/${o.name}`)); if(error) console.error("manage-users: document cleanup failed"); }
      return reply({success:true});
    }
    return reply({error:"Invalid action"},400);
  } catch(error) {
    console.error("manage-users: request failed");
    return reply({error:error instanceof Error ? error.message : "Unable to process request"},400);
  }
});
