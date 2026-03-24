import { useRef, useCallback, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface AutoRecoveryState {
  isRecovering: boolean;
  recoveryCount: number;
  lastRecoveryAt: number | null;
}

/**
 * Monitors MediaStream tracks and automatically restarts them if they end unexpectedly.
 * Handles: camera disconnection, Bluetooth headset drops, network blips.
 */
export function useStreamAutoRecovery(
  streamRef: React.MutableRefObject<MediaStream | null>,
  videoRef: React.RefObject<HTMLVideoElement | null>,
  onTrackRestored?: () => void
) {
  const { toast } = useToast();
  const [state, setState] = useState<AutoRecoveryState>({
    isRecovering: false,
    recoveryCount: 0,
    lastRecoveryAt: null,
  });
  const isRecoveringRef = useRef(false);
  const listenersRef = useRef<Map<string, () => void>>(new Map());

  const recoverTrack = useCallback(async (kind: 'video' | 'audio', facingMode?: string) => {
    if (isRecoveringRef.current) return;
    isRecoveringRef.current = true;
    setState(s => ({ ...s, isRecovering: true }));

    toast({
      title: kind === 'video' ? '📹 Camera reconnecting...' : '🎤 Mic reconnecting...',
      description: 'Hang tight, recovering your stream.',
    });

    const maxAttempts = 3;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const constraints: MediaStreamConstraints = kind === 'video'
          ? { video: { facingMode: facingMode || 'user', width: { ideal: 1280 }, height: { ideal: 720 } } }
          : { audio: { echoCancellation: true, noiseSuppression: true } };

        const newStream = await navigator.mediaDevices.getUserMedia(constraints);
        const newTrack = newStream.getTracks()[0];

        if (streamRef.current) {
          // Remove dead tracks of the same kind
          streamRef.current.getTracks()
            .filter(t => t.kind === kind)
            .forEach(t => {
              streamRef.current!.removeTrack(t);
              t.stop();
            });
          
          // Add the new track
          streamRef.current.addTrack(newTrack);

          // Re-attach to video element
          if (videoRef.current) {
            videoRef.current.srcObject = streamRef.current;
          }

          // Set up ended listener on new track
          attachTrackListener(newTrack, kind, facingMode);
        }

        setState(s => ({
          isRecovering: false,
          recoveryCount: s.recoveryCount + 1,
          lastRecoveryAt: Date.now(),
        }));
        isRecoveringRef.current = false;

        toast({
          title: kind === 'video' ? '📹 Camera restored!' : '🎤 Mic restored!',
          description: 'Your stream is back to normal.',
        });

        onTrackRestored?.();
        return;
      } catch {
        // Wait before retrying
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      }
    }

    // All attempts failed
    setState(s => ({ ...s, isRecovering: false }));
    isRecoveringRef.current = false;
    toast({
      title: `${kind === 'video' ? 'Camera' : 'Mic'} recovery failed`,
      description: 'Please check your device and try again.',
      variant: 'destructive',
    });
  }, [streamRef, videoRef, toast, onTrackRestored]);

  const attachTrackListener = useCallback((track: MediaStreamTrack, kind: 'video' | 'audio', facingMode?: string) => {
    const handler = () => {
      // Only recover if track ended unexpectedly (not from user stopping)
      if (streamRef.current) {
        recoverTrack(kind, facingMode);
      }
    };
    track.addEventListener('ended', handler);
    listenersRef.current.set(track.id, handler);
  }, [recoverTrack, streamRef]);

  const startMonitoring = useCallback((facingMode?: string) => {
    if (!streamRef.current) return;
    
    streamRef.current.getTracks().forEach(track => {
      attachTrackListener(track, track.kind as 'video' | 'audio', facingMode);
    });
  }, [streamRef, attachTrackListener]);

  const stopMonitoring = useCallback(() => {
    listenersRef.current.clear();
  }, []);

  return {
    ...state,
    startMonitoring,
    stopMonitoring,
    recoverTrack,
  };
}
