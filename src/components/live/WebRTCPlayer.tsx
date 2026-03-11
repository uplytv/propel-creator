import { useRef, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, WifiOff, RefreshCw, PictureInPicture2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WebRTCPlayerProps {
  streamId: string;
  title?: string;
  className?: string;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export default function WebRTCPlayer({ streamId, title, className }: WebRTCPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<any>(null);
  const viewerIdRef = useRef(crypto.randomUUID());
  const [status, setStatus] = useState<'connecting' | 'playing' | 'failed'>('connecting');
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 5;
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cleanup = useCallback(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
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

    const viewerId = viewerIdRef.current;
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    // We only receive tracks
    pc.addTransceiver('video', { direction: 'recvonly' });
    pc.addTransceiver('audio', { direction: 'recvonly' });

    pc.ontrack = (event) => {
      if (videoRef.current && event.streams[0]) {
        videoRef.current.srcObject = event.streams[0];
        setStatus('playing');
      }
    };

    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      if (state === 'connected' || state === 'completed') {
        setStatus('playing');
      } else if (state === 'failed' || state === 'disconnected') {
        // Try to reconnect
        setRetryCount(prev => {
          const next = prev + 1;
          if (next <= maxRetries) {
            setStatus('connecting');
            retryTimerRef.current = setTimeout(connect, 3000);
          } else {
            setStatus('failed');
          }
          return next;
        });
      }
    };

    // Set up signaling channel
    const channel = supabase.channel(`webrtc-${streamId}`, {
      config: { broadcast: { self: false } },
    });

    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'host-answer' }, async (payload: any) => {
        const msg = payload.payload;
        if (msg.viewerId !== viewerId) return;

        try {
          if (pc.signalingState !== 'closed') {
            await pc.setRemoteDescription(new RTCSessionDescription(msg.answer));
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
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Send ICE candidates to host
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

          // Create and send offer
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            channel.send({
              type: 'broadcast',
              event: 'viewer-join',
              payload: {
                viewerId,
                offer: pc.localDescription?.toJSON(),
              },
            });
          } catch (err) {
            console.error('Failed to create offer:', err);
            setStatus('failed');
          }

          // Timeout: if not playing within 15s, retry
          retryTimerRef.current = setTimeout(() => {
            if (pcRef.current?.iceConnectionState !== 'connected' &&
                pcRef.current?.iceConnectionState !== 'completed') {
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
          }, 15000);
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
            {retryCount > 0 ? 'Stream is starting... hang tight.' : 'Connecting to stream...'}
          </p>
          {retryCount > 0 && (
            <p className="text-xs text-white/60">Attempt {retryCount} of {maxRetries}</p>
          )}
        </div>
      )}

      {status === 'failed' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
          <WifiOff className="w-10 h-10 text-muted-foreground" />
          <p className="text-sm text-white font-medium">
            This stream may have ended. Refresh to check.
          </p>
          <Button variant="outline" size="sm" onClick={handleRetry} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Retry
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
