import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, User, Mail, Phone, MapPin, Lock, ShieldCheck } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { supabase } from "@/integrations/supabase/client";

const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  phone: z.string().trim().regex(/^\+?[0-9]{10,15}$/, "Enter a valid phone number, e.g. 03001234567"),
});

const passwordSchema = z
  .object({
    current: z.string().min(1, "Enter your current password"),
    next: z.string().min(8, "New password must be at least 8 characters").max(72),
    confirm: z.string(),
  })
  .refine((v) => v.next === v.confirm, { message: "Passwords do not match", path: ["confirm"] })
  .refine((v) => v.next !== v.current, { message: "New password must be different", path: ["next"] });

const Profile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [memberSince, setMemberSince] = useState("");
  const [roles, setRoles] = useState<string[]>([]);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }
      setUserId(user.id);
      setEmail(user.email ?? "");
      setMemberSince(user.created_at ? new Date(user.created_at).toLocaleDateString("en-PK", { dateStyle: "medium" }) : "");

      const [{ data: profile }, { data: details }, { data: lastOrder }, { data: roleRows }] = await Promise.all([
        supabase.from("profiles").select("full_name, phone").eq("id", user.id).maybeSingle(),
        supabase.from("user_details").select("permanent_address").eq("user_id", user.id).maybeSingle(),
        supabase.from("orders").select("delivery_address").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);
      setFullName(profile?.full_name ?? "");
      setPhone(profile?.phone ?? "");
      setAddress(details?.permanent_address || lastOrder?.delivery_address || "");
      setRoles((roleRows ?? []).map((r) => r.role));
      setLoading(false);
    };
    load();
  }, [navigate]);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = profileSchema.safeParse({ fullName, phone: phone.replace(/[\s-]/g, "") });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSavingProfile(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: parsed.data.fullName, phone: parsed.data.phone })
      .eq("id", userId);
    setSavingProfile(false);
    if (error) toast.error("Could not save your details. Please try again.");
    else toast.success("Your details have been updated");
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = passwordSchema.safeParse({ current, next, confirm });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSavingPassword(true);
    const { error: verifyError } = await supabase.auth.signInWithPassword({ email, password: current });
    if (verifyError) {
      setSavingPassword(false);
      toast.error("Your current password is incorrect");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: next });
    setSavingPassword(false);
    if (error) {
      toast.error(error.message.includes("weak") || error.message.includes("pwned")
        ? "This password is too common. Please choose a stronger one."
        : "Could not update password. Please try again.");
      return;
    }
    setCurrent(""); setNext(""); setConfirm("");
    toast.success("Your password has been changed");
  };

  const roleLabel = roles.length
    ? roles.map((r) => r.charAt(0).toUpperCase() + r.slice(1)).join(", ")
    : "Customer";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-6 md:py-10 max-w-2xl">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>

        <div className="flex items-center gap-4 mb-6">
          <div className="h-14 w-14 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-xl font-bold shrink-0">
            {(fullName || email || "?").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-foreground truncate">{loading ? "My Profile" : fullName || "My Profile"}</h1>
            <p className="text-sm text-muted-foreground">
              {roleLabel}{memberSince ? ` · Member since ${memberSince}` : ""}
            </p>
          </div>
        </div>

        {loading ? (
          <Card className="p-6 text-muted-foreground">Loading your details…</Card>
        ) : (
          <div className="space-y-6">
            <Card className="p-5 md:p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <User className="h-5 w-5 text-secondary" /> Personal details
              </h2>
              <form onSubmit={saveProfile} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full name</Label>
                  <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={100} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> Email</Label>
                  <Input id="email" value={email} disabled />
                  <p className="text-xs text-muted-foreground">Contact support to change your email address.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> Phone</Label>
                  <Input id="phone" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="03001234567" maxLength={16} />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> Address</Label>
                  <p className="text-sm rounded-md border border-input bg-muted/40 px-3 py-2 min-h-10">
                    {address || "No address yet — it will appear here after your first order."}
                  </p>
                </div>
                <Button type="submit" disabled={savingProfile} className="w-full sm:w-auto">
                  {savingProfile ? "Saving…" : "Save changes"}
                </Button>
              </form>
            </Card>

            <Card className="p-5 md:p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Lock className="h-5 w-5 text-secondary" /> Change password
              </h2>
              <form onSubmit={savePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current">Current password</Label>
                  <PasswordInput id="current" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="next">New password</Label>
                  <PasswordInput id="next" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
                  <p className="text-xs text-muted-foreground">At least 8 characters.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm">Confirm new password</Label>
                  <PasswordInput id="confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
                </div>
                <Button type="submit" disabled={savingPassword} className="w-full sm:w-auto">
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  {savingPassword ? "Updating…" : "Update password"}
                </Button>
              </form>
            </Card>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Profile;
