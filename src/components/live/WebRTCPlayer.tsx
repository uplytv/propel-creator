import { useRef, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, WifiOff, RefreshCw, PictureInPicture2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAutoPip } from '@/hooks/useAutoPip';

interface WebRTCPlayerProps {
  streamId: string;
  title?: string;
  className?: string;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    // TURN servers for cross-network NAT traversal
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
};

export default function WebRTCPlayer({ streamId, title, className }: WebRTCPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<any>(null);
  const viewerIdRef = useRef(crypto.randomUUID());
  const [status, setStatus] = useState<'connecting' | 'playing' | 'failed'>('connecting');
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 8;
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const offerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const connectedRef = useRef(false);

  const cleanup = useCallback(() => {
    connectedRef.current = false;
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    if (offerIntervalRef.current) {
      clearInterval(offerIntervalRef.current);
      offerIntervalRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    cleanup();
    setStatus('connecting');
    connectedRef.current = false;

    const viewerId = viewerIdRef.current;
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    pc.addTransceiver('video', { direction: 'recvonly' });
    pc.addTransceiver('audio', { direction: 'recvonly' });

    pc.ontrack = (event) => {
      if (videoRef.current && event.streams[0]) {
        videoRef.current.srcObject = event.streams[0];
        connectedRef.current = true;
        setStatus('playing');
        // Stop resending offers once connected
        if (offerIntervalRef.current) {
          clearInterval(offerIntervalRef.current);
          offerIntervalRef.current = null;
        }
      }
    };

    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      if (state === 'connected' || state === 'completed') {
        connectedRef.current = true;
        setStatus('playing');
        if (offerIntervalRef.current) {
          clearInterval(offerIntervalRef.current);
          offerIntervalRef.current = null;
        }
      } else if (state === 'failed' || state === 'disconnected') {
        if (connectedRef.current) {
          // Was connected, lost connection — retry
          connectedRef.current = false;
          setRetryCount(prev => {
            const next = prev + 1;
            if (next <= maxRetries) {
              setStatus('connecting');
              retryTimerRef.current = setTimeout(connect, 2000);
            } else {
              setStatus('failed');
            }
            return next;
          });
        }
      }
    };

    const channel = supabase.channel(`webrtc-${streamId}`, {
      config: { broadcast: { self: false } },
    });

    channelRef.current = channel;

    let localOffer: RTCSessionDescriptionInit | null = null;

    channel
      .on('broadcast', { event: 'host-answer' }, async (payload: any) => {
        const msg = payload.payload;
        if (msg.viewerId !== viewerId) return;

        try {
          if (pc.signalingState === 'have-local-offer') {
            await pc.setRemoteDescription(new RTCSessionDescription(msg.answer));
            // Stop resending offers — host responded
            if (offerIntervalRef.current) {
              clearInterval(offerIntervalRef.current);
              offerIntervalRef.current = null;
            }
          }
        } catch (err) {
          console.error('Failed to set remote description:', err);
        }
      })
      .on('broadcast', { event: 'ice-candidate' }, async (payload: any) => {
        const msg = payload.payload;
        if (msg.viewerId !== viewerId || msg.from !== 'host') return;

        try {
          if (pc.remoteDescription && pc.signalingState !== 'closed') {
            await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
          }
        } catch (err) {
          console.error('Failed to add ICE candidate:', err);
        }
      })
      .subscribe(async (subStatus) => {
        if (subStatus === 'SUBSCRIBED') {
          pc.onicecandidate = (event) => {
            if (event.candidate) {
              channel.send({
                type: 'broadcast',
                event: 'ice-candidate',
                payload: {
                  viewerId,
                  from: 'viewer',
                  candidate: event.candidate.toJSON(),
                },
              });
            }
          };

          // Create offer once
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            localOffer = pc.localDescription?.toJSON() || null;

            // Send offer immediately
            const sendOffer = () => {
              if (connectedRef.current || !localOffer) return;
              channel.send({
                type: 'broadcast',
                event: 'viewer-join',
                payload: { viewerId, offer: localOffer },
              });
            };

            sendOffer();

            // Re-send offer every 3s until host responds (fixes race condition)
            offerIntervalRef.current = setInterval(sendOffer, 3000);

            // Full timeout: if not connected within 30s, do a full retry
            retryTimerRef.current = setTimeout(() => {
              if (!connectedRef.current) {
                setRetryCount(prev => {
                  const next = prev + 1;
                  if (next <= maxRetries) {
                    connect();
                  } else {
                    setStatus('failed');
                  }
                  return next;
                });
              }
            }, 30000);
          } catch (err) {
            console.error('Failed to create offer:', err);
            setStatus('failed');
          }
        }
      });
  }, [streamId, cleanup]);

  useEffect(() => {
    connect();
    return cleanup;
  }, [connect, cleanup]);

  const [isPip, setIsPip] = useState(false);

  const togglePip = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await video.requestPictureInPicture();
      }
    } catch (err) {
      console.error('PiP error:', err);
    }
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onEnter = () => setIsPip(true);
    const onLeave = () => setIsPip(false);
    video.addEventListener('enterpictureinpicture', onEnter);
    video.addEventListener('leavepictureinpicture', onLeave);
    return () => {
      video.removeEventListener('enterpictureinpicture', onEnter);
      video.removeEventListener('leavepictureinpicture', onLeave);
    };
  }, []);

  const handleRetry = () => {
    setRetryCount(0);
    connect();
  };

  return (
    <div className={`relative w-full aspect-video bg-black ${className || ''}`}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={false}
        controls={status === 'playing'}
        className="w-full h-full object-contain"
        style={{ display: status === 'playing' ? 'block' : 'none' }}
      />

      {status === 'connecting' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-sm text-white font-medium">
            {retryCount > 0 ? 'Establishing connection... hang tight.' : 'Connecting to live stream...'}
          </p>
          {retryCount > 0 && (
            <p className="text-xs text-white/60">Attempt {retryCount + 1} of {maxRetries + 1}</p>
          )}
        </div>
      )}

      {status === 'failed' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
          <WifiOff className="w-10 h-10 text-muted-foreground" />
          <p className="text-sm text-white font-medium text-center px-6">
            Could not connect to the stream. The creator may have ended it or there's a network issue.
          </p>
          <Button variant="outline" size="sm" onClick={handleRetry} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Retry Connection
          </Button>
        </div>
      )}

      {status === 'playing' && document.pictureInPictureEnabled && (
        <button
          onClick={togglePip}
          className="absolute top-3 right-3 z-10 p-2 rounded-lg bg-background/60 backdrop-blur-sm text-foreground hover:bg-background/80 transition-colors"
          title={isPip ? 'Exit Picture-in-Picture' : 'Picture-in-Picture'}
        >
          <PictureInPicture2 className={`w-4 h-4 ${isPip ? 'text-primary' : ''}`} />
        </button>
      )}
    </div>
  );
}