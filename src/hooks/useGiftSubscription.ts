import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

export function useGiftSubscription(streamId: string, creatorId: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [gifting, setGifting] = useState(false);
  const [recentGifts, setRecentGifts] = useState<Array<{ gifterName: string; recipientName: string; count: number }>>([]);

  const giftRandomSubscription = useCallback(async (count: number = 1) => {
    if (!user || gifting) return;
    setGifting(true);

    try {
      // Get active viewers who are NOT already members
      const { data: viewers } = await supabase
        .from('live_stream_sessions')
        .select('viewer_id')
        .eq('stream_id', streamId)
        .not('viewer_id', 'is', null)
        .neq('viewer_id', user.id)
        .neq('viewer_id', creatorId)
        .limit(50);

      if (!viewers?.length) {
        toast({ title: 'No eligible viewers found', variant: 'destructive' });
        setGifting(false);
        return;
      }

      // Check who is already a member
      const viewerIds = viewers.map(v => v.viewer_id).filter(Boolean) as string[];
      const { data: existingMembers } = await supabase
        .from('community_members')
        .select('user_id')
        .eq('creator_id', creatorId)
        .in('user_id', viewerIds);

      const existingSet = new Set(existingMembers?.map(m => m.user_id) || []);
      const eligible = viewerIds.filter(id => !existingSet.has(id));

      if (!eligible.length) {
        toast({ title: 'All viewers are already members! 🎉' });
        setGifting(false);
        return;
      }

      // Pick random recipients
      const shuffled = eligible.sort(() => Math.random() - 0.5);
      const recipients = shuffled.slice(0, Math.min(count, shuffled.length));

      // Create community memberships for recipients
      const inserts = recipients.map(uid => ({
        creator_id: creatorId,
        user_id: uid,
        email_opt_in: true,
      }));

      const { error } = await supabase.from('community_members').insert(inserts);
      if (error) throw error;

      // Get gifter name
      const { data: gifterProfile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('user_id', user.id)
        .single();

      const gift = {
        gifterName: gifterProfile?.display_name || 'Anonymous',
        recipientName: `${recipients.length} viewer${recipients.length > 1 ? 's' : ''}`,
        count: recipients.length,
      };

      setRecentGifts(prev => [gift, ...prev].slice(0, 10));

      toast({
        title: `🎁 Gifted ${recipients.length} subscription${recipients.length > 1 ? 's' : ''}!`,
        description: `You just made ${recipients.length} viewer${recipients.length > 1 ? 's' : ''} very happy!`,
      });
    } catch (err: any) {
      toast({ title: 'Gift failed', description: err.message, variant: 'destructive' });
    } finally {
      setGifting(false);
    }
  }, [user, gifting, streamId, creatorId, toast]);

  return { giftRandomSubscription, gifting, recentGifts };
}
