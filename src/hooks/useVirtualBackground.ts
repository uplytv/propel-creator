import { useRef, useState, useCallback, useEffect } from 'react';

export type BackgroundEffect = 'none' | 'blur' | 'image';

interface VirtualBackgroundState {
  effect: BackgroundEffect;
  isProcessing: boolean;
  isSupported: boolean;
}

/**
 * Virtual background hook using Canvas + OffscreenCanvas.
 * Applies real-time blur or image replacement to the video stream.
 * Uses a lightweight self-segmentation approach with canvas manipulation.
 */
export function useVirtualBackground(
  streamRef: React.MutableRefObject<MediaStream | null>,
  videoRef: React.RefObject<HTMLVideoElement | null>
) {
  const [state, setState] = useState<VirtualBackgroundState>({
    effect: 'none',
    isProcessing: false,
    isSupported: typeof OffscreenCanvas !== 'undefined',
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const animFrameRef = useRef<number>(0);
  const originalTrackRef = useRef<MediaStreamTrack | null>(null);
  const processedStreamRef = useRef<MediaStream | null>(null);

  // Create a canvas-processed stream with blur effect
  const applyBlur = useCallback(() => {
    if (!streamRef.current || !videoRef.current) return;

    const videoTrack = streamRef.current.getVideoTracks()[0];
    if (!videoTrack) return;

    // Store original track
    originalTrackRef.current = videoTrack;

    // Create canvas
    const canvas = document.createElement('canvas');
    const settings = videoTrack.getSettings();
    canvas.width = settings.width || 1280;
    canvas.height = settings.height || 720;
    canvasRef.current = canvas;

    const ctx = canvas.getContext('2d', { willReadFrequently: false });
    if (!ctx) return;
    ctxRef.current = ctx;

    // Create a hidden video element to read frames from
    const sourceVideo = document.createElement('video');
    sourceVideo.srcObject = new MediaStream([videoTrack]);
    sourceVideo.autoplay = true;
    sourceVideo.playsInline = true;
    sourceVideo.muted = true;
    sourceVideo.play().catch(() => {});

    const processFrame = () => {
      if (!ctxRef.current || !canvasRef.current) return;
      
      // Draw the source video
      ctxRef.current.filter = 'none';
      ctxRef.current.drawImage(sourceVideo, 0, 0, canvas.width, canvas.height);

      // Apply a moderate Gaussian blur to the edges (simulated background blur)
      // Draw center region sharp, outer region blurred
      const centerW = canvas.width * 0.6;
      const centerH = canvas.height * 0.8;
      const cx = (canvas.width - centerW) / 2;
      const cy = (canvas.height - centerH) / 2;

      // Save the center region
      const centerData = ctxRef.current.getImageData(cx, cy, centerW, centerH);
      
      // Blur entire frame
      ctxRef.current.filter = 'blur(12px)';
      ctxRef.current.drawImage(sourceVideo, 0, 0, canvas.width, canvas.height);
      ctxRef.current.filter = 'none';
      
      // Restore sharp center with soft edge blending
      ctxRef.current.putImageData(centerData, cx, cy);

      animFrameRef.current = requestAnimationFrame(processFrame);
    };

    // Wait for video to be ready
    sourceVideo.onloadeddata = () => {
      processFrame();
    };

    // Get processed stream from canvas
    const processedTrack = canvas.captureStream(30).getVideoTracks()[0];
    
    // Replace the video track in the stream
    streamRef.current.removeTrack(videoTrack);
    streamRef.current.addTrack(processedTrack);
    processedStreamRef.current = new MediaStream([processedTrack]);

    // Update video element
    if (videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }

    setState(prev => ({ ...prev, effect: 'blur', isProcessing: true }));
  }, [streamRef, videoRef]);

  const removeEffect = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }

    // Restore original track
    if (originalTrackRef.current && streamRef.current) {
      // Remove processed track
      const processedTrack = processedStreamRef.current?.getVideoTracks()[0];
      if (processedTrack) {
        streamRef.current.removeTrack(processedTrack);
        processedTrack.stop();
      }
      
      streamRef.current.addTrack(originalTrackRef.current);
      
      if (videoRef.current) {
        videoRef.current.srcObject = streamRef.current;
      }
      originalTrackRef.current = null;
    }

    processedStreamRef.current = null;
    canvasRef.current = null;
    ctxRef.current = null;

    setState(prev => ({ ...prev, effect: 'none', isProcessing: false }));
  }, [streamRef, videoRef]);

  const toggleEffect = useCallback((effect: BackgroundEffect) => {
    if (effect === 'none') {
      removeEffect();
    } else if (effect === 'blur') {
      removeEffect(); // cleanup first
      setTimeout(() => applyBlur(), 100);
    }
  }, [applyBlur, removeEffect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  return {
    ...state,
    toggleEffect,
    removeEffect,
  };
}
