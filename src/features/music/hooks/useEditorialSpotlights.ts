import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const sb = supabase;

export interface EditorialSpotlight {
  id: string;
  title: string;
  subtitle: string | null;
  cover_url: string | null;
  link_path: string;
  position: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
}

export function useEditorialSpotlights() {
  return useQuery<EditorialSpotlight[]>({
    queryKey: ["music-editorial-spotlights"],
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      const { data } = await sb
        .from("music_editorial_spotlights")
        .select("*")
        .eq("is_active", true)
        .order("position", { ascending: true })
        .limit(20);
      return ((data as EditorialSpotlight[]) ?? []).filter(
        (s) =>
          (!s.starts_at || s.starts_at <= nowIso) &&
          (!s.ends_at || s.ends_at >= nowIso),
      );
    },
  });
}
