import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface RaidTarget {
  streamId: string;
  creatorId: string;
  displayName: string;
  title: string;
  viewerCount: number;
}

/**
 * Raid system — lets creators redirect their viewers to another live stream.
 * Sends a realtime broadcast so all connected viewers navigate to the target.
 */
export function useRaidSystem(streamId: string | undefined, isHost: boolean) {
  const [availableTargets, setAvailableTargets] = useState<RaidTarget[]>([]);
  const [isRaiding, setIsRaiding] = useState(false);
  const [raidCountdown, setRaidCountdown] = useState<number | null>(null);
  const [incomingRaid, setIncomingRaid] = useState<{ from: string; viewerCount: number } | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch live streams to raid
  const fetchTargets = useCallback(async () => {
    const { data } = await supabase
      .from('mux_live_streams')
      .select('id, user_id, title, viewer_count')
      .eq('status', 'active')
      .neq('id', streamId || '')
      .limit(10);

    if (!data) return;

    const creatorIds = data.map(s => s.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, display_name')
      .in('user_id', creatorIds);

    const profileMap = new Map(profiles?.map(p => [p.user_id, p.display_name]) || []);

    setAvailableTargets(data.map(s => ({
      streamId: s.id,
      creatorId: s.user_id,
      displayName: profileMap.get(s.user_id) || 'Creator',
      title: s.title || 'Live Stream',
      viewerCount: s.viewer_count || 0,
    })));
  }, [streamId]);

  // Listen for incoming raids
  useEffect(() => {
    if (!streamId) return;
    const channel = supabase.channel(`raid-${streamId}`)
      .on('broadcast', { event: 'raid' }, (payload: any) => {
        const { from, viewerCount, targetStreamId } = payload.payload;
        if (targetStreamId === streamId) {
          setIncomingRaid({ from, viewerCount });
          setTimeout(() => setIncomingRaid(null), 8000);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [streamId]);

  const initiateRaid = useCallback(async (target: RaidTarget) => {
    if (!streamId) return;
    setIsRaiding(true);
    setRaidCountdown(10);

    countdownRef.current = setInterval(() => {
      setRaidCountdown(prev => {
        if (prev === null || prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          // Send raid broadcast
          supabase.channel(`stream-raid-${streamId}`)
            .send({
              type: 'broadcast',
              event: 'raid-redirect',
              payload: { targetStreamId: target.streamId, targetName: target.displayName },
            });
          
          // Notify target
          supabase.channel(`raid-${target.streamId}`)
            .send({
              type: 'broadcast',
              event: 'raid',
              payload: {
                from: 'Creator',
                viewerCount: 0,
                targetStreamId: target.streamId,
              },
            });

          setIsRaiding(false);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  }, [streamId]);

  const cancelRaid = useCallback(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setIsRaiding(false);
    setRaidCountdown(null);
  }, []);

  return {
    availableTargets,
    fetchTargets,
    isRaiding,
    raidCountdown,
    initiateRaid,
    cancelRaid,
    incomingRaid,
  };
}
