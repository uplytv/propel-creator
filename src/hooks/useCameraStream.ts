import { useCallback, useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";

export interface UseCameraStreamOptions {
  facing: "front" | "back";
  resolution: "1080p" | "4K";
  enabled: boolean;
}

/**
 * Manages a single live MediaStream for the in-app camera.
 * - Web: navigator.mediaDevices.getUserMedia
 * - Native (Capacitor): same API (Capacitor exposes the WebView's mediaDevices)
 */
export function useCameraStream({ facing, resolution, enabled }: UseCameraStreamOptions) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stop = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsReady(false);
  }, []);

  const start = useCallback(async () => {
    setError(null);
    try {
      const targetWidth = resolution === "4K" ? 3840 : 1920;
      const targetHeight = resolution === "4K" ? 2160 : 1080;
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facing === "front" ? "user" : { ideal: "environment" },
          width: { ideal: targetWidth },
          height: { ideal: targetHeight },
        },
        audio: true,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      // Stop any prior stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setIsReady(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Camera access denied";
      setError(msg);
      setIsReady(false);
    }
  }, [facing, resolution]);

  useEffect(() => {
    if (!enabled) {
      stop();
      return;
    }
    start();
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, facing, resolution]);

  return { videoRef, streamRef, isReady, error, restart: start, stop, isNative: Capacitor.isNativePlatform() };
}
