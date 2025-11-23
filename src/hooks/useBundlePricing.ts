import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PricingBundle {
  id: string;
  name: string;
  price: number;
  items_allowed: number;
  description: string | null;
}

export const useBundlePricing = () => {
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
        .order("items_allowed", { ascending: true });

      if (error) throw error;
      setBundles(data || []);
    } catch (error) {
      console.error("Error fetching bundles:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateBundlePrice = (itemCount: number): { bundle: PricingBundle | null; price: number } => {
    if (itemCount === 0) return { bundle: null, price: 0 };

    // Find the smallest bundle that can accommodate the item count
    const applicableBundle = bundles.find(bundle => itemCount <= bundle.items_allowed);

    if (applicableBundle) {
      return { bundle: applicableBundle, price: Number(applicableBundle.price) };
    }

    // If no bundle matches, return the largest bundle (or 0 if no bundles exist)
    if (bundles.length > 0) {
      const largestBundle = bundles[bundles.length - 1];
      return { bundle: largestBundle, price: Number(largestBundle.price) };
    }

    return { bundle: null, price: 0 };
  };

  return { bundles, loading, calculateBundlePrice };
};
