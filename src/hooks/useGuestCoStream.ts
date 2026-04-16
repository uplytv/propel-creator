import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ICE_SERVERS } from '@/lib/webrtcConfig';

export type GuestLayout = 'pip' | 'side-by-side' | 'grid';

export interface Guest {
  userId: string;
  name: string;
  avatarUrl: string | null;
  stream: MediaStream | null;
  isConnected: boolean;
  isMuted: boolean;
  pc: RTCPeerConnection;
}

export interface PendingRequest {
  userId: string;
  name: string;
  avatarUrl: string | null;
}

const MAX_GUESTS = 4;

export function useGuestCoStream(streamId: string | undefined, isHost: boolean) {
  const [guests, setGuests] = useState<Map<string, Guest>>(new Map());
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [layout, setLayout] = useState<GuestLayout>('pip');
  const channelRef = useRef<any>(null);

  const getInviteLink = useCallback(() => {
    if (!streamId) return '';
    return `${window.location.origin}/stream/${streamId}?join=1`;
  }, [streamId]);

  const removeGuest = useCallback((userId: string) => {
    setGuests(prev => {
      const next = new Map(prev);
      const g = next.get(userId);
      if (g?.pc) g.pc.close();
      next.delete(userId);
      return next;
    });
    if (channelRef.current) {
      channelRef.current.send({ type: 'broadcast', event: 'guest-removed', payload: { userId } });
    }
  }, []);

  useEffect(() => {
    if (!streamId || !isHost) return;

    const channel = supabase.channel(`costream-${streamId}`, {
      config: { broadcast: { self: false } },
    });
    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'guest-request' }, (payload: any) => {
        const { userId, name, avatarUrl } = payload.payload;
        setGuests(currentGuests => {
          if (currentGuests.size >= MAX_GUESTS) {
            channel.send({ type: 'broadcast', event: 'guest-rejected', payload: { userId, reason: 'full' } });
            return currentGuests;
          }
          setPendingRequests(prev => [
            ...prev.filter(r => r.userId !== userId),
            { userId, name, avatarUrl },
          ]);
          return currentGuests;
        });
      })
      .on('broadcast', { event: 'guest-offer' }, async (payload: any) => {
        const { userId, offer, name, avatarUrl } = payload.payload;

        const pc = new RTCPeerConnection(ICE_SERVERS);

        pc.ontrack = (event) => {
          if (event.streams[0]) {
            setGuests(prev => {
              const next = new Map(prev);
              const g = next.get(userId);
              if (g) next.set(userId, { ...g, stream: event.streams[0], isConnected: true });
              return next;
            });
          }
        };

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            channel.send({
              type: 'broadcast',
              event: 'host-ice',
              payload: { targetUserId: userId, candidate: event.candidate.toJSON() },
            });
          }
        };

        pc.oniceconnectionstatechange = () => {
          if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
            removeGuest(userId);
          }
        };

        try {
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          channel.send({
            type: 'broadcast',
            event: 'host-answer',
            payload: { targetUserId: userId, answer: pc.localDescription?.toJSON() },
          });

          setGuests(prev => {
            const next = new Map(prev);
            next.set(userId, { userId, name, avatarUrl, stream: null, isConnected: false, isMuted: false, pc });
            return next;
          });
        } catch (err) {
          console.error('Co-stream offer error:', err);
        }
      })
      .on('broadcast', { event: 'guest-ice' }, async (payload: any) => {
        const { userId, candidate } = payload.payload;
        setGuests(prev => {
          const guest = prev.get(userId);
          if (guest?.pc?.remoteDescription) {
            try { guest.pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
          }
          return prev;
        });
      })
      .on('broadcast', { event: 'guest-leave' }, (payload: any) => {
        removeGuest(payload.payload.userId);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [streamId, isHost, removeGuest]);

  const acceptGuest = useCallback((userId: string) => {
    if (!channelRef.current) return;
    setGuests(prev => {
      if (prev.size >= MAX_GUESTS) return prev;
      setPendingRequests(p => p.filter(r => r.userId !== userId));
      channelRef.current.send({ type: 'broadcast', event: 'guest-accepted', payload: { userId } });
      return prev;
    });
  }, []);

  const rejectGuest = useCallback((userId: string) => {
    if (!channelRef.current) return;
    setPendingRequests(prev => prev.filter(r => r.userId !== userId));
    channelRef.current.send({ type: 'broadcast', event: 'guest-rejected', payload: { userId, reason: 'rejected' } });
  }, []);

  const toggleGuestMute = useCallback((userId: string) => {
    setGuests(prev => {
      const next = new Map(prev);
      const g = next.get(userId);
      if (g) {
        g.stream?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
        next.set(userId, { ...g, isMuted: !g.isMuted });
      }
      return next;
    });
  }, []);

  const requestToJoin = useCallback(async (userId: string, name: string, avatarUrl: string | null) => {
    if (!streamId) return;
    const channel = supabase.channel(`costream-${streamId}`, {
      config: { broadcast: { self: false } },
    });
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        channel.send({ type: 'broadcast', event: 'guest-request', payload: { userId, name, avatarUrl } });
      }
    });
    return channel;
  }, [streamId]);

  const sendGuestOffer = useCallback(async (userId: string, name: string, avatarUrl: string | null, localStream: MediaStream) => {
    if (!streamId) return;
    const channel = supabase.channel(`costream-${streamId}`, {
      config: { broadcast: { self: false } },
    });

    const pc = new RTCPeerConnection(ICE_SERVERS);
    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        channel.send({ type: 'broadcast', event: 'guest-ice', payload: { userId, candidate: event.candidate.toJSON() } });
      }
    };

    channel
      .on('broadcast', { event: 'host-answer' }, async (payload: any) => {
        if (payload.payload.targetUserId !== userId) return;
        try { await pc.setRemoteDescription(new RTCSessionDescription(payload.payload.answer)); } catch {}
      })
      .on('broadcast', { event: 'host-ice' }, async (payload: any) => {
        if (payload.payload.targetUserId !== userId) return;
        try { await pc.addIceCandidate(new RTCIceCandidate(payload.payload.candidate)); } catch {}
      })
      .on('broadcast', { event: 'guest-removed' }, (payload: any) => {
        if (payload.payload.userId === userId) { pc.close(); }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          channel.send({
            type: 'broadcast',
            event: 'guest-offer',
            payload: { userId, name, avatarUrl, offer: pc.localDescription?.toJSON() },
          });
        }
      });

    return { pc, channel };
  }, [streamId]);

  const guestArray = Array.from(guests.values());
  const connectedGuests = guestArray.filter(g => g.isConnected);

  return {
    guests: guestArray,
    connectedGuests,
    pendingRequests,
    layout,
    setLayout,
    acceptGuest,
    rejectGuest,
    removeGuest,
    toggleGuestMute,
    requestToJoin,
    sendGuestOffer,
    getInviteLink,
    guestCount: guests.size,
    isFull: guests.size >= MAX_GUESTS,
  };
}
