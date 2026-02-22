import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import logo from "@/assets/tabedaar-logo.png";

const loginSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
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
      const validatedData = loginSchema.parse({ email, password });

      const { data, error } = await supabase.auth.signInWithPassword({
        email: validatedData.email,
        password: validatedData.password,
      });

      if (error) {
        setLoading(false);
        toast({
          title: "Login Failed",
          description: error.message === "Invalid login credentials" 
            ? "Invalid email or password" 
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

  return (
    <div className="min-h-screen flex flex-col lg:flex-row tap-highlight-none">
      {/* Left Side - Gradient (desktop only) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary to-accent items-center justify-center p-12">
        <div className="text-primary-foreground text-center space-y-6">
          <h1 className="text-5xl font-bold">Welcome Back</h1>
          <p className="text-xl opacity-90">
            Login to continue your shopping experience with Tabedaar.com
          </p>
        </div>
      </div>

      {/* Mobile header with logo */}
      <div className="lg:hidden bg-primary safe-area-top">
        <div className="flex items-center justify-center py-6">
          <Link to="/">
            <img src={logo} alt="Tabedaar.com" className="h-20 w-auto object-contain" />
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
                <Label htmlFor="email" className="mobile-label">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mobile-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="mobile-label">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="mobile-input"
                />
              </div>

              <Button type="submit" className="w-full mobile-button btn-cta" disabled={loading}>
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
    </div>
  );
};

export default Login;
