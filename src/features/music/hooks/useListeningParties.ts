import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useLiveParties(limit = 30) {
  return useQuery({
    queryKey: ['music', 'parties', 'live'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('listening_parties')
        .select('*')
        .eq('status', 'live')
        .order('participant_count', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 15000,
  });
}

export function useParty(partyId?: string) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['music', 'party', partyId],
    queryFn: async () => {
      if (!partyId) return null;
      const { data, error } = await supabase
        .from('listening_parties')
        .select('*')
        .eq('id', partyId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!partyId,
  });

  // Realtime subscription to room changes
  useEffect(() => {
    if (!partyId) return;
    const ch = supabase
      .channel(`party:${partyId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'listening_parties', filter: `id=eq.${partyId}` },
        () => qc.invalidateQueries({ queryKey: ['music', 'party', partyId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [partyId, qc]);

  return query;
}

export function useCreateParty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      title: string;
      cover_url?: string;
      current_track_url?: string;
      current_track_title?: string;
      current_track_artist?: string;
    }) => {
      const { data: u } = await supabase.auth.getUser();
      const host_id = u.user?.id;
      if (!host_id) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('listening_parties')
        .insert({ host_id, ...input, is_playing: true, status: 'live' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['music', 'parties', 'live'] }),
  });
}

export function useUpdatePartyState() {
  return useMutation({
    mutationFn: async (input: {
      id: string;
      position_seconds?: number;
      is_playing?: boolean;
      current_track_url?: string;
      current_track_title?: string;
      current_track_artist?: string;
    }) => {
      const { id, ...patch } = input;
      const { error } = await supabase
        .from('listening_parties')
        .update({ ...patch, last_sync_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
  });
}

export function useEndParty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('listening_parties')
        .update({ status: 'ended', is_playing: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['music', 'parties', 'live'] }),
  });
}

export function useJoinParty(partyId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!partyId) return;
      const { data: u } = await supabase.auth.getUser();
      const user_id = u.user?.id;
      if (!user_id) return;
      await supabase
        .from('listening_party_participants')
        .upsert({ party_id: partyId, user_id }, { onConflict: 'party_id,user_id' });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['music', 'party', partyId] }),
  });
}

export function useLeaveParty(partyId?: string) {
  return useMutation({
    mutationFn: async () => {
      if (!partyId) return;
      const { data: u } = await supabase.auth.getUser();
      const user_id = u.user?.id;
      if (!user_id) return;
      await supabase
        .from('listening_party_participants')
        .delete()
        .eq('party_id', partyId)
        .eq('user_id', user_id);
    },
  });
}

// Live chat
export function usePartyChat(partyId?: string) {
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    if (!partyId) return;
    let active = true;
    (async () => {
      const { data } = await supabase
        .from('listening_party_messages')
        .select('*')
        .eq('party_id', partyId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (active) setMessages((data ?? []).reverse());
    })();

    const ch = supabase
      .channel(`party-chat:${partyId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'listening_party_messages',
          filter: `party_id=eq.${partyId}`,
        },
        (payload) => setMessages((m) => [...m, payload.new]),
      )
      .subscribe();
    return () => {
      active = false;
      supabase.removeChannel(ch);
    };
  }, [partyId]);

  const send = async (body: string) => {
    if (!partyId || !body.trim()) return;
    const { data: u } = await supabase.auth.getUser();
    const user_id = u.user?.id;
    if (!user_id) return;
    await supabase
      .from('listening_party_messages')
      .insert({ party_id: partyId, user_id, body: body.trim() });
  };

  return { messages, send };
}
