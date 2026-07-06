import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ===== Tips =====
// Tips are REAL payments: they go through Stripe Checkout via the existing
// `stripe-create-tip` edge function (95/5 split, transfer to the artist's
// connected account). No tip row is written client-side — the record and
// wallet credit are created by the Stripe webhook only after payment succeeds.
export function useSendTip() {
  return useMutation({
    mutationFn: async (input: {
      artist_id: string;
      track_id?: string | null;
      amount_cents: number;
      message?: string;
    }): Promise<{ url: string }> => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error('Not authenticated');
      if (!input.amount_cents || input.amount_cents < 100) {
        throw new Error('Minimum tip is $1');
      }
      const { data, error } = await supabase.functions.invoke('stripe-create-tip', {
        body: {
          amount: input.amount_cents / 100,
          creator_id: input.artist_id,
          track_id: input.track_id ?? undefined,
          message: input.message,
          // Reconciliation marker so these tips are identifiable in Stripe
          context: input.track_id ? 'music_track' : 'music_artist',
          return_path: window.location.pathname,
        },
      });
      if (error) throw error;
      if (!data?.url) throw new Error(data?.error ?? 'Could not start checkout');
      return { url: data.url as string };
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
// NOTE: The old useArtistSubscription / useSubscribeToArtist /
// useCancelArtistSubscription hooks wrote `artist_subscriptions` rows with
// status 'active' and ZERO payment involvement (fans "subscribed" for free,
// artists saw phantom members). They have been removed. Real artist
// memberships are the community subscription tiers (`subscription_tiers` +
// `member_subscriptions`, Stripe-billed) — see useSubscriptionTiers /
// useMemberSubscription in `@/hooks/useStripeAccount` and the
// /community/:creatorId/pricing checkout flow.
