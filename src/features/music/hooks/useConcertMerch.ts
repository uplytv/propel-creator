import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ConcertMerch {
  id: string;
  concert_id: string;
  title: string;
  image_url: string | null;
  price_cents: number;
  currency: string;
  external_url: string | null;
  position: number;
}

export function useConcertMerch(concertId?: string) {
  return useQuery({
    queryKey: ["concert-merch", concertId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_concert_merch")
        .select("*")
        .eq("concert_id", concertId!)
        .order("position", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ConcertMerch[];
    },
    enabled: !!concertId,
  });
}
