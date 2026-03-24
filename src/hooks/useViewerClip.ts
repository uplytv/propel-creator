import { useState, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface ViewerClipState {
  isClipping: boolean;
  clipUrl: string | null;
  clipBlob: Blob | null;
}

/**
 * Lets viewers clip the last N seconds of a live stream.
 * Maintains a rolling buffer of video chunks from the MediaSource.
 */
export function useViewerClip(videoRef: React.RefObject<HTMLVideoElement | null>, bufferSeconds: number = 30) {
  const { toast } = useToast();
  const [state, setState] = useState<ViewerClipState>({
    isClipping: false,
    clipUrl: null,
    clipBlob: null,
  });
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<{ blob: Blob; timestamp: number }[]>([]);
  const isRecordingRef = useRef(false);

  // Start continuous background recording of the video element
  const startBuffering = useCallback(() => {
    const video = videoRef.current;
    if (!video || isRecordingRef.current) return;

    try {
      // Capture from the video element
      const stream = (video as any).captureStream?.() || (video as any).mozCaptureStream?.();
      if (!stream) {
        console.warn('captureStream not supported');
        return;
      }

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
        ? 'video/webm;codecs=vp8,opus'
        : 'video/webm';

      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 2_000_000,
      });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          const now = Date.now();
          chunksRef.current.push({ blob: e.data, timestamp: now });
          
          // Prune old chunks beyond buffer window
          const cutoff = now - bufferSeconds * 1000;
          chunksRef.current = chunksRef.current.filter(c => c.timestamp >= cutoff);
        }
      };

      // Record in 2-second slices
      recorder.start(2000);
      recorderRef.current = recorder;
      isRecordingRef.current = true;
    } catch (err) {
      console.error('Failed to start clip buffer:', err);
    }
  }, [videoRef, bufferSeconds]);

  const stopBuffering = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
    recorderRef.current = null;
    isRecordingRef.current = false;
    chunksRef.current = [];
  }, []);

  // Clip the last N seconds
  const createClip = useCallback(async (lastSeconds: number = 30) => {
    setState(prev => ({ ...prev, isClipping: true }));

    const cutoff = Date.now() - lastSeconds * 1000;
    const relevantChunks = chunksRef.current
      .filter(c => c.timestamp >= cutoff)
      .map(c => c.blob);

    if (relevantChunks.length === 0) {
      toast({
        title: 'No footage to clip',
        description: 'Wait a few seconds and try again.',
        variant: 'destructive',
      });
      setState(prev => ({ ...prev, isClipping: false }));
      return null;
    }

    const blob = new Blob(relevantChunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);

    setState({
      isClipping: false,
      clipUrl: url,
      clipBlob: blob,
    });

    toast({
      title: '🎬 Clip created!',
      description: `${lastSeconds}s clip ready to share.`,
    });

    return { blob, url };
  }, [toast]);

  const clearClip = useCallback(() => {
    if (state.clipUrl) URL.revokeObjectURL(state.clipUrl);
    setState({ isClipping: false, clipUrl: null, clipBlob: null });
  }, [state.clipUrl]);

  // Share the clip via Web Share API or download
  const shareClip = useCallback(async () => {
    if (!state.clipBlob) return;

    const file = new File([state.clipBlob], 'clip.webm', { type: 'video/webm' });

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          title: 'Stream Clip',
          files: [file],
        });
      } catch {
        // User cancelled
      }
    } else {
      // Fallback: download
      const a = document.createElement('a');
      a.href = state.clipUrl || '';
      a.download = 'clip.webm';
      a.click();
    }
  }, [state.clipBlob, state.clipUrl]);

  return {
    ...state,
    startBuffering,
    stopBuffering,
    createClip,
    clearClip,
    shareClip,
    isBuffering: isRecordingRef.current,
  };
}
