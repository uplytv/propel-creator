import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export type VerificationStatus = 'pending' | 'approved' | 'rejected';

export interface VerificationApplication {
  id: string;
  user_id: string;
  legal_name: string;
  artist_name: string;
  primary_link: string | null;
  social_links: Record<string, string>;
  evidence_urls: string[];
  monthly_listeners: number | null;
  reason: string | null;
  status: VerificationStatus;
  admin_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useMyVerificationApplication() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['music', 'verification', 'mine', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('artist_verification_applications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as VerificationApplication | null) ?? null;
    },
    enabled: !!user,
  });
}

export function useSubmitVerificationApplication() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<VerificationApplication>) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await (supabase as any)
        .from('artist_verification_applications')
        .insert({ user_id: user.id, status: 'pending', ...payload })
        .select()
        .single();
      if (error) throw error;
      return data as VerificationApplication;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['music', 'verification', 'mine', user?.id] });
    },
  });
}
