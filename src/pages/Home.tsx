import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShoppingCart, CheckCircle, CreditCard, ShoppingBag as ShoppingBagIcon, TruckIcon, ArrowRight } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AIBotButton } from "@/components/AIBotButton";
import { PricingBundles } from "@/components/PricingBundles";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import clothingImg from "@/assets/clothing-delivery.jpg";
import foodImg from "@/assets/food-delivery.jpg";
import groceriesImg from "@/assets/groceries-delivery.jpg";
import giftsImg from "@/assets/gifts-delivery.jpg";

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
              <Card className="border-2 hover:border-primary/50 transition-all duration-300 overflow-hidden group cursor-pointer hover:scale-105">
                <div className="relative h-48 overflow-hidden">
                  <img 
                    src={clothingImg} 
                    alt="Clothing delivery" 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                </div>
                <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                  <h3 className="font-semibold text-lg">Clothing</h3>
                  <p className="text-sm text-muted-foreground">
                    Designer wear, traditional outfits, and more from your favorite brands
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 hover:border-primary/50 transition-all duration-300 overflow-hidden group cursor-pointer hover:scale-105">
                <div className="relative h-48 overflow-hidden">
                  <img 
                    src={foodImg} 
                    alt="Food delivery" 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                </div>
                <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                  <h3 className="font-semibold text-lg">Food</h3>
                  <p className="text-sm text-muted-foreground">
                    Delicious meals from top restaurants and local eateries
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 hover:border-primary/50 transition-all duration-300 overflow-hidden group cursor-pointer hover:scale-105">
                <div className="relative h-48 overflow-hidden">
                  <img 
                    src={groceriesImg} 
                    alt="Groceries delivery" 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                </div>
                <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                  <h3 className="font-semibold text-lg">Groceries</h3>
                  <p className="text-sm text-muted-foreground">
                    Fresh produce, daily essentials, and household items
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 hover:border-primary/50 transition-all duration-300 overflow-hidden group cursor-pointer hover:scale-105">
                <div className="relative h-48 overflow-hidden">
                  <img 
                    src={giftsImg} 
                    alt="Gifts delivery" 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                </div>
                <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
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
        <section className="py-16 overflow-hidden">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12 animate-fade-in">How It Works</h2>
            <div className="relative grid grid-cols-1 md:grid-cols-5 gap-6 items-start group/cascade">
              {/* Step 1 */}
              <div className="flex flex-col items-center text-center space-y-4 animate-fade-in relative" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
                <div 
                  className="relative rounded-full bg-gradient-to-br from-primary to-accent p-6 text-primary-foreground cursor-pointer transition-all duration-300 hover:scale-110 hover:shadow-[0_0_30px_rgba(var(--primary),0.5)] active:scale-95 z-10"
                  onClick={(e) => {
                    e.currentTarget.classList.add('animate-bounce');
                    setTimeout(() => e.currentTarget.classList.remove('animate-bounce'), 1000);
                  }}
                >
                  <ShoppingCart className="h-10 w-10" />
                  <div className="absolute -top-2 -right-2 bg-primary-foreground text-primary rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
                    1
                  </div>
                </div>
                {/* Arrow 1 - appears first in cascade */}
                <svg 
                  className="hidden md:block absolute top-[41px] left-[calc(50%+41px)] w-[calc(100%+24px)] h-[100px] opacity-0 group-hover/cascade:opacity-100 transition-opacity duration-700 z-0 pointer-events-none"
                  style={{ transitionDelay: '0s' }}
                  viewBox="0 0 300 100"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="arrow1" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" style={{ stopColor: 'hsl(var(--primary))', stopOpacity: 0.2 }} />
                      <stop offset="20%" style={{ stopColor: 'hsl(var(--primary))', stopOpacity: 0.8 }} />
                      <stop offset="80%" style={{ stopColor: 'hsl(var(--accent))', stopOpacity: 1 }} />
                      <stop offset="100%" style={{ stopColor: 'hsl(var(--accent))', stopOpacity: 0.2 }} />
                    </linearGradient>
                  </defs>
                  
                  {[...Array(25)].map((_, i) => (
                    <circle
                      key={`p1-${i}`}
                      cx={10 + i * 8}
                      cy={50 + (Math.sin(i * 0.5) * 15)}
                      r={2.5}
                      fill="hsl(var(--primary))"
                      opacity={0.4 + Math.random() * 0.4}
                      className="animate-[slide-in-right_2s_ease-out_infinite]"
                      style={{ animationDelay: `${i * 0.04}s` }}
                    />
                  ))}
                  
                  <path
                    d="M 80 50 L 270 50 L 270 40 L 295 50 L 270 60 L 270 50 Z"
                    fill="url(#arrow1)"
                    className="animate-[slide-in-right_1.5s_ease-out_infinite]"
                  />
                </svg>
                <h3 className="font-semibold text-lg group-hover/cascade:text-primary transition-colors">Place Your Order</h3>
                <p className="text-sm text-muted-foreground">
                  Tell us what you need
                </p>
              </div>

              {/* Step 2 */}
              <div className="flex flex-col items-center text-center space-y-4 animate-fade-in relative" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
                <div 
                  className="relative rounded-full bg-gradient-to-br from-primary to-accent p-6 text-primary-foreground cursor-pointer transition-all duration-300 hover:scale-110 hover:shadow-[0_0_30px_rgba(var(--primary),0.5)] active:scale-95 z-10"
                  onClick={(e) => {
                    e.currentTarget.classList.add('animate-pulse');
                    setTimeout(() => e.currentTarget.classList.remove('animate-pulse'), 1000);
                  }}
                >
                  <CheckCircle className="h-10 w-10" />
                  <div className="absolute -top-2 -right-2 bg-primary-foreground text-primary rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
                    2
                  </div>
                </div>
                {/* Arrow 2 - appears second in cascade */}
                <svg 
                  className="hidden md:block absolute top-[41px] left-[calc(50%+41px)] w-[calc(100%+24px)] h-[100px] opacity-0 group-hover/cascade:opacity-100 transition-opacity duration-700 z-0 pointer-events-none"
                  style={{ transitionDelay: '0.3s' }}
                  viewBox="0 0 300 100"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="arrow2" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" style={{ stopColor: 'hsl(var(--primary))', stopOpacity: 0.2 }} />
                      <stop offset="20%" style={{ stopColor: 'hsl(var(--primary))', stopOpacity: 0.8 }} />
                      <stop offset="80%" style={{ stopColor: 'hsl(var(--accent))', stopOpacity: 1 }} />
                      <stop offset="100%" style={{ stopColor: 'hsl(var(--accent))', stopOpacity: 0.2 }} />
                    </linearGradient>
                  </defs>
                  
                  {[...Array(25)].map((_, i) => (
                    <circle
                      key={`p2-${i}`}
                      cx={10 + i * 8}
                      cy={50 + (Math.sin(i * 0.5) * 15)}
                      r={2.5}
                      fill="hsl(var(--primary))"
                      opacity={0.4 + Math.random() * 0.4}
                      className="animate-[slide-in-right_2s_ease-out_infinite]"
                      style={{ animationDelay: `${i * 0.04}s` }}
                    />
                  ))}
                  
                  <path
                    d="M 80 50 L 270 50 L 270 40 L 295 50 L 270 60 L 270 50 Z"
                    fill="url(#arrow2)"
                    className="animate-[slide-in-right_1.5s_ease-out_infinite]"
                  />
                </svg>
                <h3 className="font-semibold text-lg group-hover/cascade:text-primary transition-colors" style={{ transitionDelay: '0.3s' }}>We Verify & Confirm</h3>
                <p className="text-sm text-muted-foreground">
                  We review and confirm details
                </p>
              </div>

              {/* Step 3 */}
              <div className="flex flex-col items-center text-center space-y-4 animate-fade-in relative" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>
                <div 
                  className="relative rounded-full bg-gradient-to-br from-primary to-accent p-6 text-primary-foreground cursor-pointer transition-all duration-300 hover:scale-110 hover:shadow-[0_0_30px_rgba(var(--primary),0.5)] active:scale-95 z-10"
                  onClick={(e) => {
                    e.currentTarget.classList.add('animate-spin');
                    setTimeout(() => e.currentTarget.classList.remove('animate-spin'), 1000);
                  }}
                >
                  <CreditCard className="h-10 w-10" />
                  <div className="absolute -top-2 -right-2 bg-primary-foreground text-primary rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
                    3
                  </div>
                </div>
                {/* Arrow 3 - appears third in cascade */}
                <svg 
                  className="hidden md:block absolute top-[41px] left-[calc(50%+41px)] w-[calc(100%+24px)] h-[100px] opacity-0 group-hover/cascade:opacity-100 transition-opacity duration-700 z-0 pointer-events-none"
                  style={{ transitionDelay: '0.6s' }}
                  viewBox="0 0 300 100"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="arrow3" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" style={{ stopColor: 'hsl(var(--primary))', stopOpacity: 0.2 }} />
                      <stop offset="20%" style={{ stopColor: 'hsl(var(--primary))', stopOpacity: 0.8 }} />
                      <stop offset="80%" style={{ stopColor: 'hsl(var(--accent))', stopOpacity: 1 }} />
                      <stop offset="100%" style={{ stopColor: 'hsl(var(--accent))', stopOpacity: 0.2 }} />
                    </linearGradient>
                  </defs>
                  
                  {[...Array(25)].map((_, i) => (
                    <circle
                      key={`p3-${i}`}
                      cx={10 + i * 8}
                      cy={50 + (Math.sin(i * 0.5) * 15)}
                      r={2.5}
                      fill="hsl(var(--primary))"
                      opacity={0.4 + Math.random() * 0.4}
                      className="animate-[slide-in-right_2s_ease-out_infinite]"
                      style={{ animationDelay: `${i * 0.04}s` }}
                    />
                  ))}
                  
                  <path
                    d="M 80 50 L 270 50 L 270 40 L 295 50 L 270 60 L 270 50 Z"
                    fill="url(#arrow3)"
                    className="animate-[slide-in-right_1.5s_ease-out_infinite]"
                  />
                </svg>
                <h3 className="font-semibold text-lg group-hover/cascade:text-primary transition-colors" style={{ transitionDelay: '0.6s' }}>Payment</h3>
                <p className="text-sm text-muted-foreground">
                  Secure payment processing
                </p>
              </div>

              {/* Step 4 */}
              <div className="flex flex-col items-center text-center space-y-4 animate-fade-in relative" style={{ animationDelay: '0.4s', animationFillMode: 'both' }}>
                <div 
                  className="relative rounded-full bg-gradient-to-br from-primary to-accent p-6 text-primary-foreground cursor-pointer transition-all duration-300 hover:scale-110 hover:shadow-[0_0_30px_rgba(var(--primary),0.5)] active:scale-95 z-10"
                  onClick={(e) => {
                    e.currentTarget.classList.add('animate-bounce');
                    setTimeout(() => e.currentTarget.classList.remove('animate-bounce'), 1000);
                  }}
                >
                  <ShoppingBagIcon className="h-10 w-10" />
                  <div className="absolute -top-2 -right-2 bg-primary-foreground text-primary rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
                    4
                  </div>
                </div>
                {/* Arrow 4 - appears fourth in cascade */}
                <svg 
                  className="hidden md:block absolute top-[41px] left-[calc(50%+41px)] w-[calc(100%+24px)] h-[100px] opacity-0 group-hover/cascade:opacity-100 transition-opacity duration-700 z-0 pointer-events-none"
                  style={{ transitionDelay: '0.9s' }}
                  viewBox="0 0 300 100"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="arrow4" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" style={{ stopColor: 'hsl(var(--primary))', stopOpacity: 0.2 }} />
                      <stop offset="20%" style={{ stopColor: 'hsl(var(--primary))', stopOpacity: 0.8 }} />
                      <stop offset="80%" style={{ stopColor: 'hsl(var(--accent))', stopOpacity: 1 }} />
                      <stop offset="100%" style={{ stopColor: 'hsl(var(--accent))', stopOpacity: 0.2 }} />
                    </linearGradient>
                  </defs>
                  
                  {[...Array(25)].map((_, i) => (
                    <circle
                      key={`p4-${i}`}
                      cx={10 + i * 8}
                      cy={50 + (Math.sin(i * 0.5) * 15)}
                      r={2.5}
                      fill="hsl(var(--primary))"
                      opacity={0.4 + Math.random() * 0.4}
                      className="animate-[slide-in-right_2s_ease-out_infinite]"
                      style={{ animationDelay: `${i * 0.04}s` }}
                    />
                  ))}
                  
                  <path
                    d="M 80 50 L 270 50 L 270 40 L 295 50 L 270 60 L 270 50 Z"
                    fill="url(#arrow4)"
                    className="animate-[slide-in-right_1.5s_ease-out_infinite]"
                  />
                </svg>
                <h3 className="font-semibold text-lg group-hover/cascade:text-primary transition-colors" style={{ transitionDelay: '0.9s' }}>We Shop For You</h3>
                <p className="text-sm text-muted-foreground">
                  Our team gets your items
                </p>
              </div>

              {/* Step 5 */}
              <div className="flex flex-col items-center text-center space-y-4 animate-fade-in relative" style={{ animationDelay: '0.5s', animationFillMode: 'both' }}>
                <div 
                  className="relative rounded-full bg-gradient-to-br from-primary to-accent p-6 text-primary-foreground cursor-pointer transition-all duration-300 hover:scale-110 hover:shadow-[0_0_30px_rgba(var(--primary),0.5)] active:scale-95 z-10"
                  onClick={(e) => {
                    e.currentTarget.classList.add('animate-pulse');
                    setTimeout(() => e.currentTarget.classList.remove('animate-pulse'), 1000);
                  }}
                >
                  <TruckIcon className="h-10 w-10" />
                  <div className="absolute -top-2 -right-2 bg-primary-foreground text-primary rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
                    5
                  </div>
                </div>
                <h3 className="font-semibold text-lg group-hover/cascade:text-primary transition-colors" style={{ transitionDelay: '1.2s' }}>Fast Delivery</h3>
                <p className="text-sm text-muted-foreground">
                  Quick delivery to your door
                </p>
              </div>
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
