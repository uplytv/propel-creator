import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export interface RadiateBroadcast {
  id: string;
  user_id: string;
  title: string;
  message: string | null;
  link_url: string | null;
  content_type: string;
  content_id: string | null;
  lat: number;
  lng: number;
  radius_km: number;
  city: string | null;
  expires_at: string;
  created_at: string;
  view_count?: number;
  click_count?: number;
  distance_km?: number;
}

export interface NewRadiate {
  title: string;
  message?: string;
  link_url?: string;
  lat: number;
  lng: number;
  radius_km: number;
  city?: string;
  ttl_hours?: number;
  content_type?: string;
}

export function useNearbyRadiates(coords: { lat: number; lng: number } | null, maxKm = 50) {
  return useQuery({
    queryKey: ["radiate-nearby", coords?.lat, coords?.lng, maxKm],
    enabled: !!coords,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("nearby_radiates", {
        user_lat: coords!.lat,
        user_lng: coords!.lng,
        max_km: maxKm,
      });
      if (error) throw error;
      return (data || []) as RadiateBroadcast[];
    },
  });
}

export function useMyRadiates() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["radiate-mine", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("radiate_broadcasts")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as RadiateBroadcast[];
    },
  });
}

export function useCreateRadiate() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewRadiate) => {
      if (!user) throw new Error("Not authenticated");
      const expires_at = new Date(Date.now() + (input.ttl_hours ?? 24) * 3600_000).toISOString();
      const { data, error } = await supabase
        .from("radiate_broadcasts")
        .insert({
          user_id: user.id,
          title: input.title,
          message: input.message || null,
          link_url: input.link_url || null,
          lat: input.lat,
          lng: input.lng,
          radius_km: input.radius_km,
          city: input.city || null,
          content_type: input.content_type || "announcement",
          expires_at,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["radiate-mine"] });
      qc.invalidateQueries({ queryKey: ["radiate-nearby"] });
    },
  });
}

export function useDeleteRadiate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("radiate_broadcasts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["radiate-mine"] }),
  });
}

export async function trackRadiate(broadcastId: string, action: "view" | "click" | "dismiss") {
  const { data: auth } = await supabase.auth.getUser();
  await supabase.from("radiate_impressions").insert({
    broadcast_id: broadcastId,
    user_id: auth.user?.id ?? null,
    action,
  });
  if (action === "view" || action === "click") {
    await supabase.rpc("increment_radiate_counter", { _broadcast_id: broadcastId, _kind: action });
  }
}

export function useGeolocation() {
  return useQuery({
    queryKey: ["browser-geolocation"],
    staleTime: 60_000,
    queryFn: () =>
      new Promise<{ lat: number; lng: number }>((resolve, reject) => {
        if (!navigator.geolocation) return reject(new Error("Geolocation unsupported"));
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          (err) => reject(err),
          { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 }
        );
      }),
  });
}
