import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FanStation {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  mood: string | null;
  genres: string[] | null;
  artwork_url: string | null;
  is_featured: boolean;
}

export interface FanRadioTrack {
  id: string;
  station_id: string;
  title: string;
  artist: string | null;
  audio_url: string;
  artwork_url: string | null;
  duration_seconds: number | null;
  track_position: number;
  affinity?: number;
}

export function useFanStations(mood?: string) {
  return useQuery({
    queryKey: ["fan-stations", mood],
    queryFn: async () => {
      let q = supabase
        .from("music_fan_stations")
        .select("*")
        .eq("is_published", true)
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(40);
      if (mood) q = q.eq("mood", mood);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as FanStation[];
    },
  });
}

export function useFanStation(slug: string | undefined) {
  return useQuery({
    queryKey: ["fan-station", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_fan_stations")
        .select("*")
        .eq("slug", slug!)
        .maybeSingle();
      if (error) throw error;
      return data as FanStation | null;
    },
  });
}

export function usePersonalizedQueue(stationId: string | undefined) {
  return useQuery({
    queryKey: ["personalized-radio", stationId],
    enabled: !!stationId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_personalized_fan_radio", {
        _station_id: stationId!,
        _limit: 30,
      });
      if (error) throw error;
      return (data ?? []) as FanRadioTrack[];
    },
  });
}

export function useLogFanListen() {
  return useMutation({
    mutationFn: async (input: { station_id: string; track_id: string; liked?: boolean; skipped?: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("music_fan_radio_listens").insert({
        user_id: user.id,
        station_id: input.station_id,
        track_id: input.track_id,
        liked: input.liked ?? null,
        skipped: input.skipped ?? false,
      });
    },
  });
}

/**
 * In-memory radio engine: auto-advances tracks, exposes play/pause, supports
 * like / skip signals which are persisted via useLogFanListen.
 */
export function useFanRadioEngine(stationId: string | undefined) {
  const { data: queue } = usePersonalizedQueue(stationId);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const log = useLogFanListen();

  const current: FanRadioTrack | undefined = queue?.[index];

  useEffect(() => {
    if (!audioRef.current) audioRef.current = new Audio();
    const a = audioRef.current;
    if (!current) return;
    a.src = current.audio_url;
    if (isPlaying) a.play().catch(() => setIsPlaying(false));
    const onEnd = () => {
      if (stationId && current) log.mutate({ station_id: stationId, track_id: current.id });
      setIndex((i) => (queue ? (i + 1) % queue.length : i));
    };
    a.addEventListener("ended", onEnd);
    return () => a.removeEventListener("ended", onEnd);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  const play = () => {
    audioRef.current?.play().catch(() => {});
    setIsPlaying(true);
  };
  const pause = () => {
    audioRef.current?.pause();
    setIsPlaying(false);
  };
  const next = () => {
    if (stationId && current) log.mutate({ station_id: stationId, track_id: current.id, skipped: true });
    setIndex((i) => (queue ? (i + 1) % queue.length : i));
  };
  const like = () => {
    if (stationId && current) log.mutate({ station_id: stationId, track_id: current.id, liked: true });
  };

  useEffect(() => () => audioRef.current?.pause(), []);

  return { current, queue, index, isPlaying, play, pause, next, like };
}
