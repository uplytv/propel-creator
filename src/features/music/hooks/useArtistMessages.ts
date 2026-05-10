import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

const sb = supabase as unknown as any;

export type MessageTarget = 'all' | 'superfans' | 'buyers';

export interface ArtistMessage {
  id: string;
  artist_id: string;
  title: string;
  body: string;
  link_url: string | null;
  target: MessageTarget;
  sent_at: string;
}

export function useArtistMessages(artistId: string | undefined, limit = 50) {
  return useQuery({
    queryKey: ['music', 'artist-messages', artistId],
    enabled: !!artistId,
    queryFn: async (): Promise<ArtistMessage[]> => {
      const { data, error } = await sb
        .from('artist_messages')
        .select('*')
        .eq('artist_id', artistId!)
        .order('sent_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as ArtistMessage[];
    },
  });
}

export function useSendArtistMessage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { title: string; body: string; link_url?: string | null; target?: MessageTarget }) => {
      if (!user) throw new Error('not authed');
      const { data, error } = await sb
        .from('artist_messages')
        .insert({
          artist_id: user.id,
          title: input.title,
          body: input.body,
          link_url: input.link_url ?? null,
          target: input.target ?? 'all',
        })
        .select()
        .single();
      if (error) throw error;
      return data as ArtistMessage;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['music', 'artist-messages', user?.id] }),
  });
}

export function useMarkMessageRead() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (messageId: string) => {
      if (!user) return;
      await sb.from('artist_message_reads').upsert({ message_id: messageId, user_id: user.id });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['music', 'message-reads', user?.id] }),
  });
}

export function useMessageReadIds() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['music', 'message-reads', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Set<string>> => {
      const { data, error } = await sb
        .from('artist_message_reads')
        .select('message_id')
        .eq('user_id', user!.id);
      if (error) throw error;
      return new Set((data ?? []).map((r: any) => r.message_id));
    },
  });
}
