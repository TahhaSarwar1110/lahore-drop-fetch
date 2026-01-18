import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ShoppingCart, 
  CheckCircle, 
  CreditCard, 
  ShoppingBag as ShoppingBagIcon, 
  Truck, 
  ArrowRight,
  Users,
  Camera,
  DollarSign,
  Zap,
  ChevronDown
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AIBotButton } from "@/components/AIBotButton";
import { PricingBundles } from "@/components/PricingBundles";
import { useAuth } from "@/hooks/useAuth";
import clothingImg from "@/assets/clothing-delivery.jpg";
import foodImg from "@/assets/food-delivery.jpg";
import groceriesImg from "@/assets/groceries-delivery.jpg";
import giftsImg from "@/assets/gifts-delivery.jpg";

const Home = () => {
  const { isAuthenticated, isRider } = useAuth();

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const deliveryItems = [
    {
      title: "Clothing",
      subtitle: "Fashion, designer wear & traditional outfits",
      image: clothingImg,
    },
    {
      title: "Food",
      subtitle: "Meals from your favorite restaurants",
      image: foodImg,
    },
    {
      title: "Groceries",
      subtitle: "Fresh produce & daily essentials",
      image: groceriesImg,
    },
    {
      title: "Gifts & More",
      subtitle: "Custom gifts & special requests",
      image: giftsImg,
    },
  ];

  const steps = [
    {
      icon: ShoppingCart,
      title: "Place Your Order",
      description: "Tell us what you need",
      step: 1,
    },
    {
      icon: CheckCircle,
      title: "We Verify & Confirm",
      description: "We review details and pricing",
      step: 2,
    },
    {
      icon: CreditCard,
      title: "Secure Payment",
      description: "Pay online securely",
      step: 3,
    },
    {
      icon: ShoppingBagIcon,
      title: "We Shop For You",
      description: "Our team purchases your items",
      step: 4,
    },
    {
      icon: Truck,
      title: "Fast Delivery",
      description: "Same-day in Lahore, worldwide shipping available",
      step: 5,
    },
  ];

  const trustFeatures = [
    {
      icon: Users,
      title: "Trusted Local Shoppers",
      description: "Experienced team who knows the best local stores and markets",
    },
    {
      icon: Camera,
      title: "Photo Verification",
      description: "We send photos of your items before purchase for your approval",
    },
    {
      icon: DollarSign,
      title: "Transparent Pricing",
      description: "No hidden fees — you only pay for items and delivery",
    },
    {
      icon: Zap,
      title: "Fast & Reliable",
      description: "Quick turnaround with real-time tracking and updates",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden min-h-[90vh] flex items-center">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-hero" />
          
          {/* Animated background elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-20 right-[10%] w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse-soft" />
            <div className="absolute bottom-20 left-[5%] w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-pulse-soft" style={{ animationDelay: '1s' }} />
            <div className="absolute top-1/2 right-[30%] w-48 h-48 bg-accent/10 rounded-full blur-2xl animate-float" />
            
            {/* Floating dots */}
            <div className="absolute top-32 left-[15%] w-3 h-3 bg-primary/30 rounded-full animate-float" />
            <div className="absolute top-48 right-[25%] w-2 h-2 bg-secondary/40 rounded-full animate-float" style={{ animationDelay: '0.5s' }} />
            <div className="absolute bottom-40 left-[40%] w-4 h-4 bg-accent/30 rounded-full animate-float" style={{ animationDelay: '1.5s' }} />
          </div>
          
          <div className="container mx-auto px-4 relative z-10">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              {/* Left side content */}
              <div className="space-y-8 text-center lg:text-left">
                <div className="space-y-6">
                  <h1 
                    className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold tracking-tight leading-[1.1] opacity-0 animate-fade-in"
                    style={{ animationDelay: '0.1s' }}
                  >
                    Shop Anything from{" "}
                    <span className="text-gradient">Lahore.</span>
                    <br />
                    Delivered Worldwide.
                  </h1>
                  <p 
                    className="text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto lg:mx-0 opacity-0 animate-fade-in"
                    style={{ animationDelay: '0.3s' }}
                  >
                    From groceries and food to fashion and gifts — we shop, verify, and deliver on your behalf. Same-day delivery within Lahore!
                  </p>
                </div>
                
                <div 
                  className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start opacity-0 animate-fade-in"
                  style={{ animationDelay: '0.5s' }}
                >
                  {!isRider && (
                    <Link to={isAuthenticated ? "/place-order" : "/signup"}>
                      <Button 
                        size="lg" 
                        className="w-full sm:w-auto text-lg px-8 h-14 rounded-2xl shadow-glow hover:shadow-hover transition-all duration-300 hover:-translate-y-1"
                      >
                        Place Order
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </Link>
                  )}
                  <Button 
                    size="lg" 
                    variant="outline" 
                    className="w-full sm:w-auto text-lg px-8 h-14 rounded-2xl border-2 hover:bg-muted/50 transition-all duration-300 hover:-translate-y-1"
                    onClick={() => scrollToSection('how-it-works')}
                  >
                    How It Works
                    <ChevronDown className="ml-2 h-5 w-5" />
                  </Button>
                </div>
                
                {/* Trust badges */}
                <div 
                  className="flex flex-wrap gap-4 justify-center lg:justify-start opacity-0 animate-fade-in"
                  style={{ animationDelay: '0.7s' }}
                >
                  <div className="trust-badge">
                    <CheckCircle className="h-4 w-4" />
                    <span>Verified Shoppers</span>
                  </div>
                  <div className="trust-badge">
                    <Zap className="h-4 w-4" />
                    <span>Same-Day Lahore Delivery</span>
                  </div>
                </div>
              </div>
              
              {/* Right side - Hero image/illustration */}
              <div 
                className="relative hidden lg:block opacity-0 animate-scale-in"
                style={{ animationDelay: '0.4s' }}
              >
                <div className="relative">
                  {/* Main image container */}
                  <div className="relative rounded-3xl overflow-hidden shadow-large">
                    <div className="aspect-[4/3] bg-gradient-to-br from-primary/20 via-secondary/20 to-accent/20 flex items-center justify-center">
                      <div className="grid grid-cols-2 gap-4 p-8">
                        {deliveryItems.slice(0, 4).map((item, idx) => (
                          <div 
                            key={idx}
                            className="rounded-2xl overflow-hidden shadow-medium bg-card transform hover:scale-105 transition-transform duration-300"
                          >
                            <img 
                              src={item.image} 
                              alt={item.title}
                              className="w-full h-32 object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {/* Floating card */}
                  <div className="absolute -bottom-6 -left-6 bg-card rounded-2xl shadow-large p-4 animate-float">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                        <CheckCircle className="h-6 w-6 text-success" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">Order Delivered!</p>
                        <p className="text-xs text-muted-foreground">Just now</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* What We Deliver Section */}
        <section className="py-20 lg:py-28 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 opacity-0 animate-fade-in" style={{ animationDelay: '0.1s' }}>
                What We Deliver
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto opacity-0 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                From everyday essentials to special gifts — we shop and deliver it all
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
              {deliveryItems.map((item, index) => (
                <Card 
                  key={index}
                  className="group relative overflow-hidden rounded-3xl border-0 shadow-soft hover:shadow-hover transition-all duration-500 cursor-pointer opacity-0 animate-fade-in-up"
                  style={{ animationDelay: `${0.1 + index * 0.1}s` }}
                >
                  <div className="relative h-56 overflow-hidden">
                    <img 
                      src={item.image} 
                      alt={item.title} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <h3 className="font-bold text-xl text-white mb-1">{item.title}</h3>
                      <p className="text-white/80 text-sm">{item.subtitle}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="py-20 lg:py-28">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
                How It Works
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Simple, transparent, and hassle-free shopping experience
              </p>
            </div>
            
            <div className="relative">
              {/* Connection line - desktop */}
              <div className="hidden lg:block absolute top-12 left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-primary/20 via-primary to-primary/20" />
              
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-8 lg:gap-4">
                {steps.map((step, index) => (
                  <div 
                    key={index}
                    className="relative flex flex-col items-center text-center group"
                  >
                    {/* Step number badge */}
                    <div className="relative mb-6">
                      <div className="step-icon text-primary-foreground group-hover:scale-110 transition-transform duration-300">
                        <step.icon className="h-7 w-7" />
                      </div>
                      <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-card border-2 border-primary flex items-center justify-center text-sm font-bold text-primary">
                        {step.step}
                      </div>
                    </div>
                    
                    <h3 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors">
                      {step.title}
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-[180px]">
                      {step.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Why Choose Us Section */}
        <section className="py-20 lg:py-28 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
                Why Choose Us?
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                We're committed to making your shopping experience safe, transparent, and convenient
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
              {trustFeatures.map((feature, index) => (
                <div 
                  key={index}
                  className="premium-card text-center group"
                >
                  <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-bold text-lg mb-3">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="py-20 lg:py-28">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
                Delivery Pricing
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Choose the bundle that fits your needs
              </p>
            </div>
            
            <PricingBundles />
            
            {/* Trust microcopy */}
            <div className="mt-12 flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-success" />
                <span>No hidden charges</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-success" />
                <span>Item cost billed separately</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-success" />
                <span>WhatsApp support available</span>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 lg:py-28 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-secondary" />
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-72 h-72 bg-white rounded-full blur-3xl" />
          </div>
          
          <div className="container mx-auto px-4 relative z-10 text-center">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 text-primary-foreground">
              Ready to Shop from Lahore?
            </h2>
            <p className="text-xl text-primary-foreground/90 mb-10 max-w-2xl mx-auto">
              Join satisfied customers who trust us for their shopping needs — worldwide delivery available!
            </p>
            <Link to={isAuthenticated ? "/place-order" : "/signup"}>
              <Button 
                size="lg" 
                variant="secondary"
                className="text-lg px-10 h-14 rounded-2xl shadow-large hover:shadow-hover transition-all duration-300 hover:-translate-y-1"
              >
                {isAuthenticated ? "Place Your Order" : "Get Started Today"}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
      <AIBotButton />
    </div>
  );
};

export default Home;
