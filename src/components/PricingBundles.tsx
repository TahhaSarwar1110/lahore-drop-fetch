import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles } from "lucide-react";

interface PricingBundle {
  id: string;
  name: string;
  price: number;
  items_allowed: number;
  description: string | null;
  is_active: boolean;
}

export const PricingBundles = () => {
  const [bundles, setBundles] = useState<PricingBundle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBundles();
  }, []);

  const fetchBundles = async () => {
    try {
      const { data, error } = await supabase
        .from("pricing_bundles")
        .select("*")
        .eq("is_active", true)
        .order("price", { ascending: true });

      if (error) throw error;
      setBundles(data || []);
    } catch (error) {
      console.error("Error fetching bundles:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-80 rounded-3xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (bundles.length === 0) {
    return null;
  }

  const getPopularIndex = () => Math.floor(bundles.length / 2);

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
      {bundles.map((bundle, index) => {
        const isPopular = index === getPopularIndex();
        
        return (
          <Card 
            key={bundle.id} 
            className={`relative rounded-3xl border-2 transition-all duration-300 hover:-translate-y-2 ${
              isPopular 
                ? "border-primary shadow-glow scale-105 lg:scale-110 z-10" 
                : "border-border/50 shadow-soft hover:shadow-medium"
            }`}
          >
            {isPopular && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground px-4 py-1 rounded-full shadow-glow">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Most Popular
                </Badge>
              </div>
            )}
            
            <CardHeader className="text-center pt-8 pb-4">
              <h3 className="text-2xl font-bold mb-2">{bundle.name}</h3>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-4xl lg:text-5xl font-extrabold text-gradient">
                  ${bundle.price.toFixed(0)}
                </span>
                <span className="text-muted-foreground">/order</span>
              </div>
            </CardHeader>
            
            <CardContent className="pb-8">
              <ul className="space-y-4">
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                    <Check className="h-3 w-3 text-success" />
                  </div>
                  <span className="text-sm">
                    Up to <span className="font-semibold">{bundle.items_allowed} items</span>
                  </span>
                </li>
                {bundle.description && (
                  <li className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="h-3 w-3 text-success" />
                    </div>
                    <span className="text-sm">{bundle.description}</span>
                  </li>
                )}
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                    <Check className="h-3 w-3 text-success" />
                  </div>
                  <span className="text-sm">Real-time tracking</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                    <Check className="h-3 w-3 text-success" />
                  </div>
                  <span className="text-sm">Photo verification</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                    <Check className="h-3 w-3 text-success" />
                  </div>
                  <span className="text-sm">WhatsApp support</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
