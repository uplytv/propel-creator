import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ===== Tips =====
export function useArtistTips(artistId?: string) {
  return useQuery({
    queryKey: ['music', 'tips', 'artist', artistId],
    queryFn: async () => {
      if (!artistId) return [];
      const { data, error } = await supabase
        .from('music_tips')
        .select('*')
        .eq('artist_id', artistId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!artistId,
  });
}

export function useSendTip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      artist_id: string;
      track_id?: string | null;
      amount_cents: number;
      message?: string;
    }) => {
      const { data: u } = await supabase.auth.getUser();
      const fan_id = u.user?.id;
      if (!fan_id) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('music_tips')
        .insert({
          fan_id,
          artist_id: input.artist_id,
          track_id: input.track_id ?? null,
          amount_cents: input.amount_cents,
          message: input.message ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['music', 'tips', 'artist', vars.artist_id] });
    },
  });
}

// ===== Merch =====
export function useArtistMerch(artistId?: string) {
  return useQuery({
    queryKey: ['music', 'merch', artistId],
    queryFn: async () => {
      if (!artistId) return [];
      const { data, error } = await supabase
        .from('artist_merch')
        .select('*')
        .eq('artist_id', artistId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!artistId,
  });
}

export function useUpsertMerch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id?: string;
      artist_id: string;
      title: string;
      description?: string;
      image_url?: string;
      external_url?: string;
      price_cents: number;
      kind: 'physical' | 'digital';
      in_stock?: boolean;
    }) => {
      if (input.id) {
        const { data, error } = await supabase
          .from('artist_merch')
          .update(input)
          .eq('id', input.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase
        .from('artist_merch')
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['music', 'merch', vars.artist_id] });
    },
  });
}

export function useDeleteMerch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('artist_merch').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['music', 'merch'] }),
  });
}

// ===== Subscription tiers =====
export function useArtistSubTiers(artistId?: string) {
  return useQuery({
    queryKey: ['music', 'sub-tiers', artistId],
    queryFn: async () => {
      if (!artistId) return [];
      const { data, error } = await supabase
        .from('artist_sub_tiers')
        .select('*')
        .eq('artist_id', artistId)
        .eq('active', true)
        .order('monthly_price_cents', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!artistId,
  });
}

export function useUpsertSubTier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id?: string;
      artist_id: string;
      name: string;
      description?: string;
      monthly_price_cents: number;
      perks?: string[];
      active?: boolean;
    }) => {
      const payload = { ...input, perks: input.perks ?? [] };
      if (input.id) {
        const { data, error } = await supabase
          .from('artist_sub_tiers')
          .update(payload)
          .eq('id', input.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase
        .from('artist_sub_tiers')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) =>
      qc.invalidateQueries({ queryKey: ['music', 'sub-tiers', vars.artist_id] }),
  });
}

// ===== Active subscription =====
export function useArtistSubscription(artistId?: string) {
  return useQuery({
    queryKey: ['music', 'artist-sub', artistId],
    queryFn: async () => {
      if (!artistId) return null;
      const { data: u } = await supabase.auth.getUser();
      const fan_id = u.user?.id;
      if (!fan_id) return null;
      const { data, error } = await supabase
        .from('artist_subscriptions')
        .select('*')
        .eq('artist_id', artistId)
        .eq('fan_id', fan_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!artistId,
  });
}

export function useSubscribeToArtist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { artist_id: string; tier_id: string }) => {
      const { data: u } = await supabase.auth.getUser();
      const fan_id = u.user?.id;
      if (!fan_id) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('artist_subscriptions')
        .upsert(
          {
            fan_id,
            artist_id: input.artist_id,
            tier_id: input.tier_id,
            status: 'active',
          },
          { onConflict: 'fan_id,artist_id' },
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) =>
      qc.invalidateQueries({ queryKey: ['music', 'artist-sub', vars.artist_id] }),
  });
}

export function useCancelArtistSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('artist_subscriptions')
        .update({ status: 'canceled' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['music', 'artist-sub'] }),
  });
}
