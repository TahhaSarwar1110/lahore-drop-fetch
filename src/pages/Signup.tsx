import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const countryCodes = [
  { code: "+92", country: "Pakistan", flag: "🇵🇰", minLength: 10, maxLength: 10, placeholder: "3001234567" },
  { code: "+1", country: "USA/Canada", flag: "🇺🇸", minLength: 10, maxLength: 10, placeholder: "2025551234" },
  { code: "+44", country: "UK", flag: "🇬🇧", minLength: 10, maxLength: 11, placeholder: "7911123456" },
  { code: "+971", country: "UAE", flag: "🇦🇪", minLength: 9, maxLength: 9, placeholder: "501234567" },
  { code: "+966", country: "Saudi Arabia", flag: "🇸🇦", minLength: 9, maxLength: 9, placeholder: "512345678" },
  { code: "+61", country: "Australia", flag: "🇦🇺", minLength: 9, maxLength: 9, placeholder: "412345678" },
  { code: "+49", country: "Germany", flag: "🇩🇪", minLength: 10, maxLength: 11, placeholder: "15123456789" },
  { code: "+33", country: "France", flag: "🇫🇷", minLength: 9, maxLength: 9, placeholder: "612345678" },
  { code: "+39", country: "Italy", flag: "🇮🇹", minLength: 9, maxLength: 10, placeholder: "3123456789" },
  { code: "+86", country: "China", flag: "🇨🇳", minLength: 11, maxLength: 11, placeholder: "13812345678" },
  { code: "+91", country: "India", flag: "🇮🇳", minLength: 10, maxLength: 10, placeholder: "9876543210" },
  { code: "+81", country: "Japan", flag: "🇯🇵", minLength: 10, maxLength: 11, placeholder: "9012345678" },
  { code: "+82", country: "South Korea", flag: "🇰🇷", minLength: 9, maxLength: 10, placeholder: "1012345678" },
  { code: "+60", country: "Malaysia", flag: "🇲🇾", minLength: 9, maxLength: 10, placeholder: "123456789" },
  { code: "+65", country: "Singapore", flag: "🇸🇬", minLength: 8, maxLength: 8, placeholder: "81234567" },
  { code: "+974", country: "Qatar", flag: "🇶🇦", minLength: 8, maxLength: 8, placeholder: "33123456" },
  { code: "+973", country: "Bahrain", flag: "🇧🇭", minLength: 8, maxLength: 8, placeholder: "36001234" },
  { code: "+968", country: "Oman", flag: "🇴🇲", minLength: 8, maxLength: 8, placeholder: "92123456" },
  { code: "+965", country: "Kuwait", flag: "🇰🇼", minLength: 8, maxLength: 8, placeholder: "50012345" },
];

const getPhoneValidation = (countryCode: string) => {
  const country = countryCodes.find(c => c.code === countryCode);
  if (!country) return { minLength: 8, maxLength: 11 };
  return { minLength: country.minLength, maxLength: country.maxLength };
};

const createSignupSchema = (countryCode: string) => {
  const { minLength, maxLength } = getPhoneValidation(countryCode);
  const country = countryCodes.find(c => c.code === countryCode);
  const countryName = country?.country || "selected country";
  
  return z.object({
    fullName: z.string().trim().min(2, "Name must be at least 2 characters"),
    email: z.string().trim().email("Invalid email address"),
    phone: z.string().trim()
      .min(minLength, `Phone number must be ${minLength === maxLength ? minLength : `${minLength}-${maxLength}`} digits for ${countryName}`)
      .max(maxLength, `Phone number must be ${minLength === maxLength ? minLength : `${minLength}-${maxLength}`} digits for ${countryName}`)
      .regex(/^\d+$/, "Phone number must contain only digits"),
    password: z.string().min(6, "Password must be at least 6 characters"),
  });
};

const Signup = () => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState("+92");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const fullPhoneNumber = `${countryCode}${phone.replace(/^0+/, '')}`;
    const signupSchema = createSignupSchema(countryCode);

    try {
      const validatedData = signupSchema.parse({
        fullName,
        email,
        phone: phone.replace(/^0+/, ''),
        password,
      });

      const { data, error } = await supabase.auth.signUp({
        email: validatedData.email,
        password: validatedData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: validatedData.fullName,
            phone: fullPhoneNumber,
          },
        },
      });

      if (error) {
        if (error.message.includes("already registered")) {
          toast({
            title: "Account exists",
            description: "This email is already registered. Please login instead.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error",
            description: error.message,
            variant: "destructive",
          });
        }
      } else if (data.user) {
        // Assign customer role to new user
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({ user_id: data.user.id, role: "customer" });
        
        if (roleError) {
          console.error("Error assigning customer role:", roleError);
        }
        
        toast({
          title: "Success!",
          description: "Account created successfully! Redirecting...",
        });
        setTimeout(() => navigate("/place-order"), 1500);
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
          <h1 className="text-5xl font-bold">Join Tabedar</h1>
          <p className="text-xl opacity-90">
            Start ordering from Pakistan's best stores, restaurants, and shops
          </p>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-muted/30">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">Create Account</CardTitle>
            <CardDescription>Sign up to start ordering with Tabedar</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

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
                <Label htmlFor="phone">Phone Number</Label>
                <div className="flex gap-2">
                  <Select value={countryCode} onValueChange={setCountryCode}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {countryCodes.map((cc) => (
                        <SelectItem key={cc.code} value={cc.code}>
                          <span className="flex items-center gap-2">
                            <span>{cc.flag}</span>
                            <span>{cc.code}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder={countryCodes.find(c => c.code === countryCode)?.placeholder || "Phone number"}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    required
                    className="flex-1"
                    maxLength={countryCodes.find(c => c.code === countryCode)?.maxLength || 11}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating Account..." : "Sign Up"}
              </Button>

              <p className="text-sm text-center text-muted-foreground">
                Already have an account?{" "}
                <Link to="/login" className="text-primary hover:underline">
                  Login here
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Signup;
