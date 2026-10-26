import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useOperatingCities(all = false, enabled = true) {
  return useQuery({
    queryKey: ["operating-cities", all],
    enabled,
    queryFn: async () => {
      let query = supabase.from("operating_cities").select("*").order("name");
      if (!all) query = query.eq("is_active", true);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    staleTime: 0,
  });
}