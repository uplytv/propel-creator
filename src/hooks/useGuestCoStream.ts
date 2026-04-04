import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ICE_SERVERS } from '@/lib/webrtcConfig';
import { Sentry } from "@/lib/sentry";

export interface GuestState {
  guestId: string | null;
  guestName: string | null;
  guestStream: MediaStream | null;
  isConnected: boolean;
  isPending: boolean;
  pendingRequests: { userId: string; name: string; avatarUrl: string | null }[];
}

/**
 * Guest co-streaming hook.
 * Allows a host to invite/accept a guest who joins via WebRTC.
 * The guest's audio+video is received and can be composited.
 */
export function useGuestCoStream(streamId: string | undefined, isHost: boolean) {
  const [state, setState] = useState<GuestState>({
    guestId: null,
    guestName: null,
    guestStream: null,
    isConnected: false,
    isPending: false,
    pendingRequests: [],
  });
  const guestPcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<any>(null);

  // Listen for guest join requests (host side)
  useEffect(() => {
    if (!streamId || !isHost) return;

    const channel = supabase.channel(`costream-${streamId}`, {
      config: { broadcast: { self: false } },
    });
    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'guest-request' }, (payload: any) => {
        const { userId, name, avatarUrl } = payload.payload;
        setState(prev => ({
          ...prev,
          pendingRequests: [...prev.pendingRequests.filter(r => r.userId !== userId), { userId, name, avatarUrl }],
        }));
      })
      .on('broadcast', { event: 'guest-offer' }, async (payload: any) => {
        const { userId, offer, name } = payload.payload;
        if (state.guestId && state.guestId !== userId) return; // already have a guest

        const pc = new RTCPeerConnection(ICE_SERVERS);
        guestPcRef.current = pc;

        pc.ontrack = (event) => {
          if (event.streams[0]) {
            setState(prev => ({
              ...prev,
              guestStream: event.streams[0],
              guestId: userId,
              guestName: name,
              isConnected: true,
              isPending: false,
            }));
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
            removeGuest();
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
        } catch (err) {
          Sentry.captureException(err, { tags: { context: "guest_costream" } });
        }
      })
      .on('broadcast', { event: 'guest-ice' }, async (payload: any) => {
        const { candidate } = payload.payload;
        if (guestPcRef.current?.remoteDescription) {
          try {
            await guestPcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          } catch {}
        }
      })
      .on('broadcast', { event: 'guest-leave' }, () => {
        removeGuest();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [streamId, isHost]);

  const acceptGuest = useCallback((userId: string) => {
    if (!channelRef.current) return;
    setState(prev => ({
      ...prev,
      isPending: true,
      pendingRequests: prev.pendingRequests.filter(r => r.userId !== userId),
    }));
    channelRef.current.send({
      type: 'broadcast',
      event: 'guest-accepted',
      payload: { userId },
    });
  }, []);

  const rejectGuest = useCallback((userId: string) => {
    if (!channelRef.current) return;
    setState(prev => ({
      ...prev,
      pendingRequests: prev.pendingRequests.filter(r => r.userId !== userId),
    }));
    channelRef.current.send({
      type: 'broadcast',
      event: 'guest-rejected',
      payload: { userId },
    });
  }, []);

  const removeGuest = useCallback(() => {
    if (guestPcRef.current) {
      guestPcRef.current.close();
      guestPcRef.current = null;
    }
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'guest-removed',
        payload: {},
      });
    }
    setState(prev => ({
      ...prev,
      guestId: null,
      guestName: null,
      guestStream: null,
      isConnected: false,
      isPending: false,
    }));
  }, []);

  // Guest side: request to join
  const requestToJoin = useCallback(async (userId: string, name: string, avatarUrl: string | null) => {
    if (!streamId) return;
    const channel = supabase.channel(`costream-${streamId}`, {
      config: { broadcast: { self: false } },
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        channel.send({
          type: 'broadcast',
          event: 'guest-request',
          payload: { userId, name, avatarUrl },
        });
      }
    });
  }, [streamId]);

  // Guest side: send offer after being accepted
  const sendGuestOffer = useCallback(async (userId: string, name: string, localStream: MediaStream) => {
    if (!streamId) return;
    const channel = supabase.channel(`costream-${streamId}`, {
      config: { broadcast: { self: false } },
    });

    const pc = new RTCPeerConnection(ICE_SERVERS);
    guestPcRef.current = pc;

    localStream.getTracks().forEach(track => {
      pc.addTrack(track, localStream);
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        channel.send({
          type: 'broadcast',
          event: 'guest-ice',
          payload: { candidate: event.candidate.toJSON() },
        });
      }
    };

    channel
      .on('broadcast', { event: 'host-answer' }, async (payload: any) => {
        if (payload.payload.targetUserId !== userId) return;
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(payload.payload.answer));
          setState(prev => ({ ...prev, isConnected: true }));
        } catch {}
      })
      .on('broadcast', { event: 'host-ice' }, async (payload: any) => {
        if (payload.payload.targetUserId !== userId) return;
        try {
          await pc.addIceCandidate(new RTCIceCandidate(payload.payload.candidate));
        } catch {}
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          channel.send({
            type: 'broadcast',
            event: 'guest-offer',
            payload: { userId, name, offer: pc.localDescription?.toJSON() },
          });
        }
      });
  }, [streamId]);

  return {
    ...state,
    acceptGuest,
    rejectGuest,
    removeGuest,
    requestToJoin,
    sendGuestOffer,
  };
}
