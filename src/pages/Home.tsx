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
  Star,
  MessageCircle,
  Shirt,
  Gift,
  UtensilsCrossed,
  Apple,
  Package,
  Globe,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AIBotButton } from "@/components/AIBotButton";
import { PricingBundles } from "@/components/PricingBundles";
import { useAuth } from "@/hooks/useAuth";
import { TestimonialSlider } from "@/components/TestimonialSlider";
import heroImg from "@/assets/hero-delivery.jpg";
import clothingImg from "@/assets/clothing-delivery.jpg";
import foodImg from "@/assets/food-delivery.jpg";
import groceriesImg from "@/assets/groceries-delivery.jpg";
import giftsImg from "@/assets/gifts-delivery.jpg";

const Home = () => {
  const { isAuthenticated, isRider } = useAuth();

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const serviceItems = [
    {
      title: "Fashion & Clothing",
      subtitle: "Designer wear, traditional outfits & local brands",
      icon: Shirt,
      image: clothingImg,
    },
    {
      title: "Gifting & Personal Items",
      subtitle: "Surprise your loved ones with thoughtful gifts",
      icon: Gift,
      image: giftsImg,
    },
    {
      title: "Food Delivery",
      subtitle: "Meals from your favorite restaurants",
      icon: UtensilsCrossed,
      image: foodImg,
    },
    {
      title: "Groceries",
      subtitle: "Daily essentials and fresh items",
      icon: Apple,
      image: groceriesImg,
    },
    {
      title: "Anything Else",
      subtitle: "No product limitations — we shop it all",
      icon: Package,
      image: null,
    },
  ];

  const steps = [
    {
      icon: ShoppingCart,
      title: "Purchase",
      description: "Tell us what you need",
      step: 1,
    },
    {
      icon: CheckCircle,
      title: "Confirm",
      description: "We verify details & pricing",
      step: 2,
    },
    {
      icon: CreditCard,
      title: "Payment",
      description: "Pay securely online",
      step: 3,
    },
    {
      icon: Truck,
      title: "Shipping",
      description: "We deliver to your door",
      step: 4,
    },
    {
      icon: Globe,
      title: "International",
      description: "Serving overseas customers",
      step: 5,
    },
  ];

  const trustFeatures = [
    {
      icon: Camera,
      title: "Photo Confirmation",
      description: "We send photos of your items before purchase for your approval",
    },
    {
      icon: Users,
      title: "Trusted Local Shoppers",
      description: "Experienced team who knows the best local stores and markets",
    },
    {
      icon: DollarSign,
      title: "Transparent Pricing",
      description: "No hidden fees — you only pay for items and delivery",
    },
    {
      icon: MessageCircle,
      title: "WhatsApp Support",
      description: "Get real-time updates and support via WhatsApp",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1">
        {/* Hero Section with Image Background */}
        <section className="relative min-h-[85vh] lg:min-h-[90vh] flex items-center overflow-hidden">
          {/* Background Image */}
          <div className="absolute inset-0">
            <img 
              src={heroImg} 
              alt="Delivery service" 
              className="w-full h-full object-cover"
            />
            <div className="hero-overlay" />
          </div>

          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-2xl">
              {/* Hero Content */}
              <div className="space-y-6">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight opacity-0 animate-fade-in"
                    style={{ animationDelay: "0.1s" }}>
                  Pickyrider
                </h1>
                <p className="text-lg sm:text-xl text-white/90 max-w-lg opacity-0 animate-fade-in"
                   style={{ animationDelay: "0.3s" }}>
                  Proxy shopping for overseas Pakistanis —<br />
                  Your personal shopping & delivery service.
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-wrap gap-4 pt-4 opacity-0 animate-fade-in"
                     style={{ animationDelay: "0.5s" }}>
                  {!isRider && (
                    <Link to={isAuthenticated ? "/place-order" : "/signup"}>
                      <Button size="lg" className="btn-cta text-lg px-8 h-14 rounded-xl">
                        Get Started
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </Link>
                  )}
                </div>

                {/* Service Icons Row */}
                <div className="flex items-center gap-8 pt-8 opacity-0 animate-fade-in"
                     style={{ animationDelay: "0.7s" }}>
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center mb-2">
                      <ShoppingCart className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-xs text-white/70">Shopping</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center mb-2">
                      <Package className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-xs text-white/70">Delivery</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center mb-2">
                      <Globe className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-xs text-white/70">International</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="py-20 lg:py-24 bg-background">
          <div className="container mx-auto px-4">
            <div className="text-center mb-4">
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground">How it Works</h2>
            </div>
            <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
              Simple, transparent, and hassle-free shopping experience
            </p>

            <div className="flex flex-wrap justify-center gap-8 lg:gap-12 max-w-5xl mx-auto">
              {steps.map((step, index) => (
                <div key={index} className="flex flex-col items-center text-center group">
                  <div className="step-icon mb-4 group-hover:scale-110 transition-transform duration-300">
                    <step.icon className="h-7 w-7" />
                  </div>
                  <h3 className="font-semibold text-foreground">{step.title}</h3>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Services Section */}
        <section className="py-20 lg:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-4">
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground">Services</h2>
            </div>
            <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
              We shop and deliver anything you need from Pakistan
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6 max-w-5xl mx-auto">
              {serviceItems.map((item, index) => (
                <div
                  key={index}
                  className="flex flex-col items-center text-center group cursor-pointer"
                >
                  <div className="w-16 h-16 rounded-2xl bg-card border border-border/50 flex items-center justify-center mb-4 shadow-card group-hover:shadow-glow-accent group-hover:border-accent/30 transition-all duration-300 group-hover:-translate-y-1">
                    <item.icon className="h-8 w-8 text-accent" />
                  </div>
                  <h3 className="font-medium text-sm text-foreground">{item.title}</h3>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="py-20 lg:py-24 bg-background">
          <div className="container mx-auto px-4">
            <div className="text-center mb-4">
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground">Testimonials</h2>
            </div>
            <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
              Hear from our satisfied customers around the world
            </p>

            <div className="max-w-4xl mx-auto mb-12">
              <TestimonialSlider />
            </div>

            {/* Track Your Order CTA */}
            <div className="text-center">
              <Link to="/track">
                <Button size="lg" className="btn-cta px-8 h-12 rounded-xl">
                  Track Your Order
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Why Choose Us Section */}
        <section className="py-20 lg:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-foreground">Why Choose PickyRider?</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                We're committed to making your shopping experience safe, transparent, and convenient
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
              {trustFeatures.map((feature, index) => (
                <div key={index} className="feature-card text-center group">
                  <div className="w-14 h-14 mx-auto mb-5 rounded-xl bg-accent/10 flex items-center justify-center group-hover:bg-accent group-hover:shadow-glow-accent transition-all duration-300">
                    <feature.icon className="h-7 w-7 text-accent group-hover:text-white transition-colors" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2 text-foreground">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="py-20 lg:py-24 bg-background">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-foreground">Service Pricing</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Transparent pricing with no hidden charges
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
                <span>Photo confirmation</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-success" />
                <span>WhatsApp support</span>
              </div>
            </div>

            {/* Payment methods */}
            <div className="mt-8 text-center">
              <p className="text-muted-foreground">
                <span className="font-medium text-foreground">Payment Options:</span> Online Payment • Cash on Delivery
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 lg:py-24 bg-primary">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-white">
              Ready to Start Shopping?
            </h2>
            <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
              Join thousands of satisfied customers who trust PickyRider for their shopping needs
            </p>
            {!isRider && (
              <Link to={isAuthenticated ? "/place-order" : "/signup"}>
                <Button size="lg" className="btn-cta text-lg px-10 h-14 rounded-xl">
                  Place Your First Order
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            )}
          </div>
        </section>
      </main>

      <Footer />
      <AIBotButton />
    </div>
  );
};

export default Home;