import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

const sb = supabase;

export interface RadioStation {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  genre: string | null;
  is_live: boolean;
  current_track_id: string | null;
  current_started_at: string | null;
  listeners_count: number;
}

export function useRadioStations() {
  return useQuery<RadioStation[]>({
    queryKey: ["radio-stations"],
    queryFn: async () => {
      const { data } = await sb
        .from("music_radio_stations")
        .select("*")
        .order("is_live", { ascending: false })
        .order("listeners_count", { ascending: false })
        .limit(40);
      return (data as RadioStation[]) ?? [];
    },
  });
}

export function useRadioStation(id?: string) {
  return useQuery<RadioStation | null>({
    queryKey: ["radio-station", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await sb.from("music_radio_stations").select("*").eq("id", id).maybeSingle();
      return (data as RadioStation) ?? null;
    },
  });
}

export function useRadioTracks(stationId?: string) {
  return useQuery({
    queryKey: ["radio-tracks", stationId],
    enabled: !!stationId,
    queryFn: async () => {
      const { data: rows } = await sb
        .from("music_radio_tracks")
        .select("*")
        .eq("station_id", stationId)
        .order("position", { ascending: true });
      const trackIds = (rows ?? []).map((r: any) => r.track_id);
      if (!trackIds.length) return [];
      const { data: tracks } = await sb.from("tracks").select("*").in("id", trackIds);
      const map = new Map((tracks ?? []).map((t: any) => [t.id, t]));
      return (rows ?? []).map((r: any) => map.get(r.track_id)).filter(Boolean);
    },
  });
}

export function useCreateRadioStation() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; description?: string; genre?: string; cover_url?: string }) => {
      if (!user) throw new Error("Sign in required");
      const { data, error } = await sb
        .from("music_radio_stations")
        .insert({ ...input, owner_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as RadioStation;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["radio-stations"] }),
  });
}

export function useToggleRadioLive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_live }: { id: string; is_live: boolean }) => {
      const { error } = await sb.from("music_radio_stations").update({ is_live }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["radio-stations"] }),
  });
}
