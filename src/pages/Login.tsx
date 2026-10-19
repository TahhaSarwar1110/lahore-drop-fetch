import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { resolveLoginEmail } from "@/utils/phoneAuth";
import logo from "@/assets/tabedaar-logo.png";

const loginSchema = z.object({
  identifier: z.string().trim().min(3, "Enter your mobile number or email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const Login = () => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id);

        if (roles && roles.length > 0) {
          const userRole = roles[0].role;
          if (userRole === "admin") {
            navigate("/admin");
          } else if (userRole === "manager") {
            navigate("/manager");
          } else if (userRole === "rider") {
            navigate("/orders");
          } else {
            navigate("/");
          }
        } else {
          navigate("/");
        }
      }
    });
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validatedData = loginSchema.parse({ identifier, password });

      const { data, error } = await supabase.auth.signInWithPassword({
        email: resolveLoginEmail(validatedData.identifier),
        password: validatedData.password,
      });

      if (error) {
        setLoading(false);
        toast({
          title: "Login Failed",
          description: error.message === "Invalid login credentials" 
            ? "Invalid mobile number or password" 
            : error.message,
          variant: "destructive",
        });
        return;
      }
      
      if (data.session) {
        toast({
          title: "Welcome back!",
          description: "Login successful",
        });

        try {
          const { data: roles } = await Promise.race([
            supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", data.session.user.id),
            new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('Timeout')), 3000)
            )
          ]);

          if (roles && roles.length > 0) {
            const userRole = roles[0].role;
            if (userRole === "admin") {
              navigate("/admin");
            } else if (userRole === "manager") {
              navigate("/manager");
            } else if (userRole === "rider") {
              navigate("/orders");
            } else {
              navigate("/");
            }
          } else {
            navigate("/");
          }
        } catch {
          navigate("/");
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = z.string().trim().email("Invalid email address").safeParse(forgotEmail);
    if (!parsed.success) {
      toast({ title: "Invalid email", description: "Please enter a valid email address", variant: "destructive" });
      return;
    }
    setForgotLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
      // Inside the mobile app the origin is a local address the email link can't open,
      // so always send people to the public website's reset page.
      redirectTo: `${/^https?:\/\/(localhost|127\.0\.0\.1)|^capacitor:/.test(window.location.origin) ? "https://tabedaar.com" : window.location.origin}/reset-password`,
    });
    setForgotLoading(false);
    if (error) {
      toast({ title: "Could not send reset email", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Reset email sent", description: "Check your email for a password reset link" });
    setForgotOpen(false);
    setForgotEmail("");
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row tap-highlight-none">
      {/* Left Side - Gradient (desktop only) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary to-accent items-center justify-center p-12">
        <div className="text-primary-foreground text-center space-y-6">
          <div className="inline-block bg-white rounded-2xl p-4"><img src={logo} alt="Tabedaar.com" className="h-16 xl:h-20 w-auto object-contain" /></div>
          <h1 className="text-5xl font-bold">Welcome Back</h1>
          <p className="text-xl opacity-90">
            Login to continue your shopping experience with Tabedaar.com
          </p>
        </div>
      </div>

      {/* Mobile header with logo */}
      <div className="lg:hidden bg-white safe-area-top border-b border-border">
        <div className="flex items-center justify-center py-3 sm:py-4">
          <Link to="/">
            <img src={logo} alt="Tabedaar.com" className="h-10 sm:h-12 md:h-14 w-auto max-w-[60vw] object-contain" />
          </Link>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 flex items-start lg:items-center justify-center px-4 py-8 lg:p-8 bg-muted/30 native-scroll">
        <Card className="w-full max-w-md mobile-card lg:rounded-2xl lg:shadow-lg">
          <CardHeader className="px-5 pt-6 pb-2">
            <CardTitle className="text-2xl">Login</CardTitle>
            <CardDescription>Enter your credentials to access your account</CardDescription>
          </CardHeader>
          <CardContent className="px-5 pb-6">
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="identifier" className="mobile-label">Mobile Number or Email</Label>
                <Input
                  id="identifier"
                  type="text"
                  placeholder="e.g. 03001234567"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  className="mobile-input"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="mobile-label">Password</Label>
                  <Button variant="link"
                    type="button"
                    onClick={() => { setForgotEmail(identifier.includes("@") ? identifier : ""); setForgotOpen(true); }}
                    className="text-sm text-primary font-medium h-auto p-0"
                  >
                    Forgot password?
                  </Button>
                </div>
                <PasswordInput
                  id="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="mobile-input"
                />
              </div>

              <Button type="submit" className="w-full mobile-button btn-cta" disabled={loading} loading={loading}>
                {loading ? "Logging in..." : "Login"}
              </Button>

              <p className="text-sm text-center text-muted-foreground pt-2">
                Don't have an account?{" "}
                <Link to="/signup" className="text-primary font-semibold hover:underline">
                  Sign up here
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>

      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reset your password</DialogTitle>
            <DialogDescription>
              Enter your account email and we'll send you a password reset link.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="forgot-email" className="mobile-label">Email</Label>
              <Input
                id="forgot-email"
                type="email"
                placeholder="Enter your email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                required
                className="mobile-input"
              />
            </div>
            <Button type="submit" className="w-full mobile-button btn-cta" disabled={forgotLoading} loading={forgotLoading}>
              {forgotLoading ? "Sending…" : "Send Reset Link"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Login;
