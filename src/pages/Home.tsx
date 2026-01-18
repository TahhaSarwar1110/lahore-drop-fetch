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
  ChevronDown,
  Star,
  MessageCircle,
  Shirt,
  Gift,
  UtensilsCrossed,
  Apple,
  Package,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AIBotButton } from "@/components/AIBotButton";
import { PricingBundles } from "@/components/PricingBundles";
import { useAuth } from "@/hooks/useAuth";
import { TestimonialSlider } from "@/components/TestimonialSlider";
import clothingImg from "@/assets/clothing-delivery.jpg";
import foodImg from "@/assets/food-delivery.jpg";
import groceriesImg from "@/assets/groceries-delivery.jpg";
import giftsImg from "@/assets/gifts-delivery.jpg";
import heroBg from "@/assets/pickyrider-hero-bg.jpg";

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
      title: "Delivered to Your Door",
      description: "Same-day in Lahore",
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
      <main className="flex-1">
        {/* Hero Section with Header */}
        <section className="relative overflow-hidden min-h-screen flex flex-col">
          {/* Hero background image - spans header and hero */}
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${heroBg})` }}
          />
          {/* Dark overlay for readability */}
          <div className="absolute inset-0 bg-primary/75" />
          
          {/* Subtle pattern overlay */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />

          {/* Header inside the hero */}
          <Header />

          {/* Animated background elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-20 right-[10%] w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse" />
            <div
              className="absolute bottom-20 left-[5%] w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse"
              style={{ animationDelay: "1s" }}
            />
          </div>

          <div className="container mx-auto px-4 relative z-10 flex-1 flex items-center pt-24 md:pt-28">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              {/* Left side content */}
              <div className="space-y-8 text-center lg:text-left">
                <div className="space-y-6">
                  <h1
                    className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight leading-[1.1] text-white opacity-0 animate-fade-in"
                    style={{ animationDelay: "0.1s" }}
                  >
                    We Shop Anything from Anywhere —{" "}
                    <span className="text-secondary">Delivered Straight to Your Door</span>
                  </h1>
                  <p
                    className="text-lg sm:text-xl text-white/90 max-w-xl mx-auto lg:mx-0 opacity-0 animate-fade-in"
                    style={{ animationDelay: "0.3s" }}
                  >
                    From fashion and gifts to food and groceries — we handle the shopping, verification, and delivery for you.
                    <span className="block mt-2 font-semibold">Same-day delivery in Lahore.</span>
                  </p>
                </div>

                <div
                  className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start opacity-0 animate-fade-in"
                  style={{ animationDelay: "0.5s" }}
                >
                  {!isRider && (
                    <Link to={isAuthenticated ? "/place-order" : "/signup"}>
                      <Button
                        size="lg"
                        className="w-full sm:w-auto text-lg px-8 h-14 rounded-2xl btn-cta"
                      >
                        Place Order
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </Link>
                  )}
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto text-lg px-8 h-14 rounded-2xl bg-white/10 border-2 border-white/30 text-white hover:bg-white/20 hover:border-white/50 transition-all duration-300 backdrop-blur-sm"
                    onClick={() => scrollToSection("how-it-works")}
                  >
                    How It Works
                    <ChevronDown className="ml-2 h-5 w-5" />
                  </Button>
                </div>

                {/* Trust badges */}
                <div
                  className="flex flex-wrap gap-4 justify-center lg:justify-start opacity-0 animate-fade-in"
                  style={{ animationDelay: "0.7s" }}
                >
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-white/15 text-white backdrop-blur-sm">
                    <CheckCircle className="h-4 w-4" />
                    <span>Verified Shoppers</span>
                  </div>
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-white/15 text-white backdrop-blur-sm">
                    <Zap className="h-4 w-4" />
                    <span>Same-day Delivery</span>
                  </div>
                </div>
              </div>

              {/* Right side - Hero image/illustration */}
              <div className="relative hidden lg:block opacity-0 animate-scale-in" style={{ animationDelay: "0.4s" }}>
                <div className="relative">
                  {/* Main image container */}
                  <div className="relative rounded-3xl overflow-hidden shadow-2xl bg-white/10 backdrop-blur-sm p-2">
                    <div className="rounded-2xl overflow-hidden">
                      <div className="grid grid-cols-2 gap-3 p-4 bg-white/5">
                        {serviceItems.slice(0, 4).map((item, idx) => (
                          <div
                            key={idx}
                            className="rounded-2xl overflow-hidden shadow-lg bg-card transform hover:scale-105 transition-transform duration-300"
                          >
                            <img src={item.image!} alt={item.title} className="w-full h-32 object-cover" />
                            <div className="p-3 bg-card">
                              <p className="font-semibold text-sm text-foreground">{item.title}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Floating card */}
                  <div className="absolute -bottom-6 -left-6 bg-card rounded-2xl shadow-xl p-4 animate-float">
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

        {/* What We Shop Section */}
        <section className="py-20 lg:py-28 bg-background">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2
                className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 opacity-0 animate-fade-in"
                style={{ animationDelay: "0.1s" }}
              >
                What We Shop
              </h2>
              <p
                className="text-lg text-muted-foreground max-w-2xl mx-auto opacity-0 animate-fade-in"
                style={{ animationDelay: "0.2s" }}
              >
                From everyday essentials to special gifts — we shop and deliver it all
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
              {serviceItems.map((item, index) => (
                <Card
                  key={index}
                  className="group service-card cursor-pointer opacity-0 animate-fade-in-up border-0"
                  style={{ animationDelay: `${0.1 + index * 0.1}s` }}
                >
                  {item.image ? (
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-5">
                        <h3 className="font-bold text-lg text-white mb-1">{item.title}</h3>
                        <p className="text-white/80 text-sm">{item.subtitle}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="h-48 bg-primary/5 flex flex-col items-center justify-center p-5 text-center">
                      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                        <item.icon className="h-7 w-7 text-primary" />
                      </div>
                      <h3 className="font-bold text-lg mb-1">{item.title}</h3>
                      <p className="text-muted-foreground text-sm">{item.subtitle}</p>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="py-20 lg:py-28 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">How It Works</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Simple, transparent, and hassle-free shopping experience
              </p>
            </div>

            <div className="relative max-w-6xl mx-auto">
              {/* Connection line - desktop */}
              <div className="hidden lg:block absolute top-12 left-[12%] right-[12%] h-0.5 bg-gradient-to-r from-primary/20 via-primary to-primary/20" />

              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-8 lg:gap-6">
                {steps.map((step, index) => (
                  <div key={index} className="relative flex flex-col items-center text-center group">
                    {/* Step number badge */}
                    <div className="relative mb-6">
                      <div className="step-icon group-hover:scale-110 transition-transform duration-300">
                        <step.icon className="h-7 w-7" />
                      </div>
                      <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-card border-2 border-primary flex items-center justify-center text-sm font-bold text-primary shadow-md">
                        {step.step}
                      </div>
                    </div>

                    <h3 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors">{step.title}</h3>
                    <p className="text-sm text-muted-foreground max-w-[180px]">{step.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Why Choose Us Section */}
        <section className="py-20 lg:py-28 bg-background">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">Why Choose PickyRider?</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                We're committed to making your shopping experience safe, transparent, and convenient
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 mb-16">
              {trustFeatures.map((feature, index) => (
                <div key={index} className="feature-card text-center group">
                  <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:shadow-glow-primary transition-all duration-300">
                    <feature.icon className="h-8 w-8 text-primary group-hover:text-white transition-colors" />
                  </div>
                  <h3 className="font-bold text-lg mb-3">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>

            {/* Testimonials */}
            <div className="max-w-4xl mx-auto">
              <h3 className="text-2xl font-bold text-center mb-8">What Our Customers Say</h3>
              <TestimonialSlider />
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="py-20 lg:py-28 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">Service Pricing</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
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
        <section className="py-20 lg:py-28 relative overflow-hidden bg-primary">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-72 h-72 bg-white rounded-full blur-3xl" />
          </div>

          <div className="container mx-auto px-4 relative z-10 text-center">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 text-white">
              Ready to Shop from Pakistan?
            </h2>
            <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto">
              Join satisfied customers who trust us for their shopping needs — worldwide delivery available!
            </p>
            <Link to={isAuthenticated ? "/place-order" : "/signup"}>
              <Button
                size="lg"
                className="text-lg px-10 h-14 rounded-2xl btn-cta"
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