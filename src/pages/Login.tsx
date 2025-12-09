import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

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
        // Check user role and redirect accordingly
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

        // Fetch roles with a timeout to prevent hanging
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
              navigate("/rider");
            } else {
              navigate("/");
            }
          } else {
            navigate("/");
          }
        } catch {
          // On timeout or error, just navigate to home
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
    <div className="min-h-screen flex">
      {/* Left Side - Image */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary to-accent items-center justify-center p-12">
        <div className="text-primary-foreground text-center space-y-6">
          <h1 className="text-5xl font-bold">Welcome Back</h1>
          <p className="text-xl opacity-90">
            Login to continue your shopping experience with Desi Drop
          </p>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-muted/30">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">Login</CardTitle>
            <CardDescription>Enter your credentials to access your account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Logging in..." : "Login"}
              </Button>

              <p className="text-sm text-center text-muted-foreground">
                Don't have an account?{" "}
                <Link to="/signup" className="text-primary hover:underline">
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
