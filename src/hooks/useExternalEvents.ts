import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ExternalEvent {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  city: string | null;
  country: string | null;
  venue_name: string | null;
  start_date: string | null;
  category: string | null;
  affiliate_url: string;
  min_price: number | null;
  max_price: number | null;
  currency: string | null;
  is_featured: boolean;
}

export function useExternalEvents(opts?: { featuredOnly?: boolean; limit?: number }) {
  return useQuery({
    queryKey: ["external-events", opts?.featuredOnly, opts?.limit],
    queryFn: async () => {
      let q = supabase
        .from("events_external")
        .select("id,title,description,image_url,city,country,venue_name,start_date,category,affiliate_url,min_price,max_price,currency,is_featured")
        .gte("start_date", new Date().toISOString())
        .order("is_featured", { ascending: false })
        .order("start_date", { ascending: true })
        .limit(opts?.limit ?? 24);
      if (opts?.featuredOnly) q = q.eq("is_featured", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as ExternalEvent[];
    },
    staleTime: 10 * 60_000,
  });
}

export async function trackExternalEventClick(eventId: string, userId?: string) {
  try {
    await supabase.from("events_external_clicks").insert({
      event_external_id: eventId,
      user_id: userId ?? null,
      referrer: typeof window !== "undefined" ? window.location.pathname : null,
    });
  } catch {
    // silent — never block the affiliate redirect
  }
}
