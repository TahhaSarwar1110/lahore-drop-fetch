import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/tabedaar-logo.png";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Recovery links arrive with type=recovery in the URL hash
    const hash = window.location.hash;
    if (hash.includes("type=recovery") || sessionStorage.getItem("tabedaar_password_recovery") === "1") {
      setIsRecovery(true);
      setChecking(false);
      return;
    }
    // Also catch the event in case the hash is processed after load
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
        setChecking(false);
      }
    });
    const timer = setTimeout(() => setChecking(false), 3000);
    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: "Password too short", description: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", description: "Please enter the same password twice", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast({ title: "Could not update password", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Password updated", description: "You can now log in with your new password" });
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex flex-col tap-highlight-none">
      <div className="bg-white safe-area-top border-b border-border">
        <div className="flex items-center justify-center py-3 sm:py-4">
          <Link to="/">
            <img src={logo} alt="Tabedaar.com" className="h-10 sm:h-12 w-auto max-w-[60vw] object-contain" />
          </Link>
        </div>
      </div>

      <div className="flex-1 flex items-start lg:items-center justify-center px-4 py-8 bg-muted/30 native-scroll">
        <Card className="w-full max-w-md mobile-card lg:rounded-2xl lg:shadow-lg">
          <CardHeader className="px-5 pt-6 pb-2">
            <CardTitle className="text-2xl">Set New Password</CardTitle>
            <CardDescription>Choose a new password for your account</CardDescription>
          </CardHeader>
          <CardContent className="px-5 pb-6">
            {checking ? (
              <p className="text-sm text-muted-foreground text-center py-4">Checking your reset link…</p>
            ) : !isRecovery ? (
              <div className="space-y-4 text-center">
                <p className="text-sm text-muted-foreground">
                  This password reset link is invalid or has expired. Please request a new one.
                </p>
                <Link to="/login" className="text-primary font-semibold hover:underline text-sm">
                  Back to Login
                </Link>
              </div>
            ) : (
              <form onSubmit={handleReset} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="new-password" className="mobile-label">New Password</Label>
                  <PasswordInput
                    id="new-password"
                    placeholder="Enter new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="mobile-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="mobile-label">Confirm Password</Label>
                  <PasswordInput
                    id="confirm-password"
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="mobile-input"
                  />
                </div>
                <Button type="submit" className="w-full mobile-button btn-cta" disabled={loading}>
                  {loading ? "Updating…" : "Update Password"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
