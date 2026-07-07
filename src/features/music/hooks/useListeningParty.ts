import { useEffect, useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

const sb = supabase;

export interface ListeningParty {
  id: string;
  host_id: string;
  share_code: string;
  title: string | null;
  current_track_id: string | null;
  position_seconds: number;
  is_playing: boolean;
  last_sync_at: string;
  is_active: boolean;
}

export interface PartyMember {
  id: string;
  party_id: string;
  user_id: string;
  joined_at: string;
  profiles?: { display_name: string | null; username: string | null; avatar_url: string | null };
}

function generateCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

async function fetchMembersWithProfiles(partyId: string): Promise<PartyMember[]> {
  const { data: rows } = await sb
    .from("music_party_members")
    .select("*")
    .eq("party_id", partyId);
  const members = (rows as PartyMember[]) ?? [];
  const userIds = members.map((m) => m.user_id);
  if (!userIds.length) return members;
  const { data: profiles } = await sb
    .from("profiles")
    .select("user_id, display_name, username, avatar_url")
    .in("user_id", userIds);
  const byId = new Map((profiles ?? []).map((p: any) => [p.user_id, p]));
  return members.map((m) => ({ ...m, profiles: byId.get(m.user_id) ?? null } as any));
}

export function useListeningParty(shareCode?: string) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [party, setParty] = useState<ListeningParty | null>(null);
  const [members, setMembers] = useState<PartyMember[]>([]);

  const isHost = !!(user && party && user.id === party.host_id);

  // Initial fetch
  useEffect(() => {
    if (!shareCode) return;
    let cancelled = false;
    (async () => {
      const { data: p } = await sb
        .from("music_listening_parties")
        .select("*")
        .eq("share_code", shareCode)
        .maybeSingle();
      if (!cancelled) setParty((p as ListeningParty) ?? null);
      if (p) {
        const m = await fetchMembersWithProfiles((p as any).id);
        if (!cancelled) setMembers(m);
      }
    })();
    return () => { cancelled = true; };
  }, [shareCode]);

  // Auto-join + leave on unmount
  useEffect(() => {
    if (!party || !user || isHost) return;
    sb.from("music_party_members").insert({ party_id: party.id, user_id: user.id }).then(() => {});
    return () => {
      sb.from("music_party_members").delete().eq("party_id", party.id).eq("user_id", user.id).then(() => {});
    };
  }, [party?.id, user?.id, isHost]);

  // Realtime sync
  useEffect(() => {
    if (!party) return;
    const channel = supabase
      .channel(`party:${party.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "music_listening_parties", filter: `id=eq.${party.id}` },
        (payload) => setParty(payload.new as ListeningParty),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "music_party_members", filter: `party_id=eq.${party.id}` },
        async () => {
          const m = await fetchMembersWithProfiles(party.id);
          setMembers(m);
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [party?.id]);

  const updateState = useCallback(
    async (patch: Partial<Pick<ListeningParty, "current_track_id" | "position_seconds" | "is_playing">>) => {
      if (!party || !isHost) return;
      await sb
        .from("music_listening_parties")
        .update({ ...patch, last_sync_at: new Date().toISOString() })
        .eq("id", party.id);
    },
    [party?.id, isHost],
  );

  return { party, members, isHost, updateState };
}

export async function createListeningParty(userId: string, title?: string): Promise<ListeningParty> {
  const code = generateCode();
  const { data, error } = await sb
    .from("music_listening_parties")
    .insert({ host_id: userId, share_code: code, title: title ?? "Listening Party" })
    .select()
    .single();
  if (error) throw error;
  return data as ListeningParty;
}

export function usePartyQueue(partyId?: string) {
  return useQuery({
    queryKey: ["party-queue", partyId],
    queryFn: async () => {
      if (!partyId) return [];
      const { data } = await sb
        .from("music_party_queue")
        .select("*, tracks(*)")
        .eq("party_id", partyId)
        .order("position", { ascending: true });
      return (data as any[]) ?? [];
    },
    enabled: !!partyId,
  });
}
