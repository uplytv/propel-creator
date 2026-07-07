import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

const sb = supabase;

export interface Premiere {
  id: string;
  track_id: string;
  creator_id: string;
  scheduled_at: string;
  started_at: string | null;
  ended_at: string | null;
  status: "scheduled" | "live" | "ended";
  reminders_count: number;
}

export interface PremiereChat {
  id: string;
  premiere_id: string;
  user_id: string;
  message: string;
  created_at: string;
}

export function useUpcomingPremieres() {
  return useQuery<Premiere[]>({
    queryKey: ["premieres-upcoming"],
    queryFn: async () => {
      const { data } = await sb
        .from("music_premieres")
        .select("*")
        .neq("status", "ended")
        .order("scheduled_at", { ascending: true })
        .limit(20);
      return (data as Premiere[]) ?? [];
    },
  });
}

export function usePremiere(id?: string) {
  return useQuery<Premiere | null>({
    queryKey: ["premiere", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await sb.from("music_premieres").select("*").eq("id", id).maybeSingle();
      return (data as Premiere) ?? null;
    },
  });
}

export function useSchedulePremiere() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { track_id: string; scheduled_at: string }) => {
      if (!user) throw new Error("Sign in required");
      const { data, error } = await sb
        .from("music_premieres")
        .insert({ ...input, creator_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as Premiere;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["premieres-upcoming"] }),
  });
}

export function useTogglePremiereReminder(premiereId?: string) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const reminded = useQuery({
    queryKey: ["premiere-reminded", premiereId, user?.id],
    enabled: !!user && !!premiereId,
    queryFn: async () => {
      const { data } = await sb
        .from("music_premiere_reminders")
        .select("id")
        .eq("premiere_id", premiereId)
        .eq("user_id", user!.id)
        .maybeSingle();
      return !!data;
    },
  });
  const toggle = useMutation({
    mutationFn: async () => {
      if (!user || !premiereId) throw new Error("missing");
      if (reminded.data) {
        await sb.from("music_premiere_reminders").delete().eq("premiere_id", premiereId).eq("user_id", user.id);
      } else {
        await sb.from("music_premiere_reminders").insert({ premiere_id: premiereId, user_id: user.id });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["premiere-reminded", premiereId] }),
  });
  return { reminded: !!reminded.data, toggle: toggle.mutate, isPending: toggle.isPending };
}

export function usePremiereChat(premiereId?: string) {
  const qc = useQueryClient();
  const { user } = useAuth();

  const query = useQuery<PremiereChat[]>({
    queryKey: ["premiere-chat", premiereId],
    enabled: !!premiereId,
    queryFn: async () => {
      const { data } = await sb
        .from("music_premiere_chat")
        .select("*")
        .eq("premiere_id", premiereId)
        .order("created_at", { ascending: true })
        .limit(200);
      return (data as PremiereChat[]) ?? [];
    },
  });

  useEffect(() => {
    if (!premiereId) return;
    const ch = sb
      .channel(`premiere-chat-${premiereId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "music_premiere_chat", filter: `premiere_id=eq.${premiereId}` },
        () => qc.invalidateQueries({ queryKey: ["premiere-chat", premiereId] })
      )
      .subscribe();
    return () => {
      sb.removeChannel(ch);
    };
  }, [premiereId, qc]);

  const send = useMutation({
    mutationFn: async (message: string) => {
      if (!user || !premiereId) throw new Error("missing");
      await sb.from("music_premiere_chat").insert({ premiere_id: premiereId, user_id: user.id, message });
    },
  });

  return { messages: query.data ?? [], send: send.mutate, isLoading: query.isLoading };
}
