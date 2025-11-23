import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Package, ShoppingBag, Gift, Clock } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AIBotButton } from "@/components/AIBotButton";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const Home = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isRider, setIsRider] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
      
      if (session?.user) {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .eq("role", "rider");
        
        setIsRider(roles && roles.length > 0);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setIsAuthenticated(!!session);
      
      if (session?.user) {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .eq("role", "rider");
        
        setIsRider(roles && roles.length > 0);
      } else {
        setIsRider(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header isAuthenticated={isAuthenticated} />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-accent/10 py-20">
          <div className="container mx-auto px-4">
            <div className="flex flex-col items-center text-center space-y-8">
              <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
                Welcome to{" "}
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Desi Drop
                </span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl">
                Order anything from Lahore - clothes, food, groceries, gifts, and more.
                Fast delivery, trusted service.
              </p>
              <div className="flex gap-4">
                {!isRider && (
                  <Link to={isAuthenticated ? "/place-order" : "/signup"}>
                    <Button size="lg" className="text-lg px-8">
                      {isAuthenticated ? "Place Order Now" : "Get Started"}
                    </Button>
                  </Link>
                )}
                {!isAuthenticated && (
                  <Link to="/login">
                    <Button size="lg" variant="outline" className="text-lg px-8">
                      Login
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">What We Deliver</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="border-2 hover:border-primary/50 transition-colors">
                <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                  <div className="rounded-full bg-primary/10 p-4">
                    <ShoppingBag className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg">Clothing</h3>
                  <p className="text-sm text-muted-foreground">
                    Designer wear, traditional outfits, and more from your favorite brands
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 hover:border-primary/50 transition-colors">
                <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                  <div className="rounded-full bg-primary/10 p-4">
                    <Package className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg">Food</h3>
                  <p className="text-sm text-muted-foreground">
                    Delicious meals from top restaurants and local eateries
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 hover:border-primary/50 transition-colors">
                <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                  <div className="rounded-full bg-primary/10 p-4">
                    <ShoppingBag className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg">Groceries</h3>
                  <p className="text-sm text-muted-foreground">
                    Fresh produce, daily essentials, and household items
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 hover:border-primary/50 transition-colors">
                <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                  <div className="rounded-full bg-primary/10 p-4">
                    <Gift className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg">Gifts & More</h3>
                  <p className="text-sm text-muted-foreground">
                    Special gifts, custom items, and anything else you need
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="rounded-full bg-gradient-to-br from-primary to-accent p-6 text-primary-foreground">
                  <span className="text-3xl font-bold">1</span>
                </div>
                <h3 className="font-semibold text-xl">Place Your Order</h3>
                <p className="text-muted-foreground">
                  Tell us what you need - clothes, food, groceries, or custom items
                </p>
              </div>

              <div className="flex flex-col items-center text-center space-y-4">
                <div className="rounded-full bg-gradient-to-br from-primary to-accent p-6 text-primary-foreground">
                  <span className="text-3xl font-bold">2</span>
                </div>
                <h3 className="font-semibold text-xl">We Shop For You</h3>
                <p className="text-muted-foreground">
                  Our trusted shoppers pick up your items with care
                </p>
              </div>

              <div className="flex flex-col items-center text-center space-y-4">
                <div className="rounded-full bg-gradient-to-br from-primary to-accent p-6 text-primary-foreground">
                  <span className="text-3xl font-bold">3</span>
                </div>
                <h3 className="font-semibold text-xl">Fast Delivery</h3>
                <p className="text-muted-foreground">
                  Track your order in real-time until it reaches your doorstep
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-gradient-to-br from-primary to-accent text-primary-foreground">
          <div className="container mx-auto px-4 text-center">
            <div className="flex flex-col items-center space-y-6">
              <Clock className="h-16 w-16" />
              <h2 className="text-3xl font-bold">Ready to Order?</h2>
              <p className="text-lg max-w-2xl opacity-90">
                Join thousands of satisfied customers who trust Desi Drop for their delivery needs
              </p>
              {!isRider && (
                <Link to={isAuthenticated ? "/place-order" : "/signup"}>
                  <Button size="lg" variant="secondary" className="text-lg px-8">
                    {isAuthenticated ? "Place Order Now" : "Sign Up Today"}
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <AIBotButton />
    </div>
  );
};

export default Home;
