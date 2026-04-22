import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DiscoverStory {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string;
  link_url: string | null;
  cta_label: string | null;
  position: number;
}

export function useDiscoverStories() {
  return useQuery({
    queryKey: ["discover-stories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("discover_stories")
        .select("id,title,subtitle,image_url,link_url,cta_label,position")
        .eq("is_active", true)
        .order("position", { ascending: true })
        .limit(20);
      if (error) throw error;
      return (data || []) as DiscoverStory[];
    },
    staleTime: 5 * 60_000,
  });
}
