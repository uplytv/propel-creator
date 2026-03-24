import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface WatchPartyState {
  partyId: string;
  hostId: string;
  contentId: string;
  contentType: 'recording' | 'video';
  playbackTime: number;
  isPlaying: boolean;
  participants: Array<{ userId: string; displayName: string; avatarUrl?: string }>;
}

export function useWatchParty() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [party, setParty] = useState<WatchPartyState | null>(null);
  const [messages, setMessages] = useState<Array<{ userId: string; name: string; text: string; time: number }>>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const isHost = party?.hostId === user?.id;

  const createParty = useCallback(async (contentId: string, contentType: 'recording' | 'video') => {
    if (!user) return null;

    const partyId = `wp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, avatar_url')
      .eq('user_id', user.id)
      .single();

    const newParty: WatchPartyState = {
      partyId,
      hostId: user.id,
      contentId,
      contentType,
      playbackTime: 0,
      isPlaying: false,
      participants: [{
        userId: user.id,
        displayName: profile?.display_name || 'Host',
        avatarUrl: profile?.avatar_url || undefined,
      }],
    };

    setParty(newParty);
    joinChannel(partyId, newParty);

    toast({ title: '🎉 Watch party created!', description: `Share code: ${partyId}` });
    return partyId;
  }, [user, toast]);

  const joinParty = useCallback(async (partyId: string) => {
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, avatar_url')
      .eq('user_id', user.id)
      .single();

    const channel = supabase.channel(`watch-party-${partyId}`);

    channel.on('broadcast', { event: 'party_state' }, ({ payload }) => {
      if (payload?.state) {
        setParty(payload.state);
      }
    });

    channel.on('broadcast', { event: 'party_chat' }, ({ payload }) => {
      if (payload?.message) {
        setMessages(prev => [...prev, payload.message].slice(-100));
      }
    });

    await channel.subscribe();
    channelRef.current = channel;

    // Announce join
    await channel.send({
      type: 'broadcast',
      event: 'party_join',
      payload: {
        userId: user.id,
        displayName: profile?.display_name || 'Viewer',
        avatarUrl: profile?.avatar_url,
      },
    });

    toast({ title: '🎬 Joined watch party!' });
  }, [user, toast]);

  const joinChannel = useCallback((partyId: string, initialState: WatchPartyState) => {
    const channel = supabase.channel(`watch-party-${partyId}`);

    channel.on('broadcast', { event: 'party_join' }, ({ payload }) => {
      setParty(prev => {
        if (!prev) return prev;
        const updated = {
          ...prev,
          participants: [
            ...prev.participants.filter(p => p.userId !== payload.userId),
            { userId: payload.userId, displayName: payload.displayName, avatarUrl: payload.avatarUrl },
          ],
        };
        // Sync state to new joiner
        channel.send({ type: 'broadcast', event: 'party_state', payload: { state: updated } });
        return updated;
      });
    });

    channel.on('broadcast', { event: 'party_chat' }, ({ payload }) => {
      if (payload?.message) {
        setMessages(prev => [...prev, payload.message].slice(-100));
      }
    });

    channel.subscribe();
    channelRef.current = channel;
  }, []);

  const syncPlayback = useCallback((time: number, isPlaying: boolean) => {
    if (!party || !isHost || !channelRef.current) return;

    const updated = { ...party, playbackTime: time, isPlaying };
    setParty(updated);

    channelRef.current.send({
      type: 'broadcast',
      event: 'party_state',
      payload: { state: updated },
    });
  }, [party, isHost]);

  const sendMessage = useCallback(async (text: string) => {
    if (!user || !channelRef.current || !party) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('user_id', user.id)
      .single();

    const message = {
      userId: user.id,
      name: profile?.display_name || 'Anonymous',
      text,
      time: party.playbackTime,
    };

    setMessages(prev => [...prev, message].slice(-100));

    await channelRef.current.send({
      type: 'broadcast',
      event: 'party_chat',
      payload: { message },
    });
  }, [user, party]);

  const leaveParty = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
    }
    setParty(null);
    setMessages([]);
  }, []);

  useEffect(() => {
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    };
  }, []);

  return {
    party,
    messages,
    isHost,
    createParty,
    joinParty,
    syncPlayback,
    sendMessage,
    leaveParty,
  };
}
