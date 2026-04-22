import { useCallback, useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";

export interface UseCameraStreamOptions {
  facing: "front" | "back";
  resolution: "1080p" | "4K";
  enabled: boolean;
}

export type CameraErrorKind = "permission" | "not_found" | "in_use" | "unsupported" | "unknown";

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
  const [errorKind, setErrorKind] = useState<CameraErrorKind | null>(null);

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

  const attachStreamToVideo = useCallback(async () => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) return;
    if (video.srcObject !== stream) {
      video.srcObject = stream;
    }
    try {
      await video.play();
    } catch {
      /* autoplay may be blocked until user gesture; the muted attr should allow it */
    }
    setIsReady(true);
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setErrorKind(null);

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("Camera not supported in this browser");
      setErrorKind("unsupported");
      setIsReady(false);
      return;
    }

    try {
      const targetWidth = resolution === "4K" ? 3840 : 1920;
      const targetHeight = resolution === "4K" ? 2160 : 1080;

      // Stop any prior stream BEFORE requesting a new one (some devices error on parallel use)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facing === "front" ? "user" : { ideal: "environment" },
          width: { ideal: targetWidth },
          height: { ideal: targetHeight },
        },
        audio: true,
      };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (innerErr) {
        // Fallback: drop resolution constraints and audio (some mobile browsers fail on ideal sizes)
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing === "front" ? "user" : "environment" },
          audio: false,
        });
      }

      streamRef.current = stream;
      await attachStreamToVideo();
    } catch (e: unknown) {
      const err = e as { name?: string; message?: string };
      const name = err?.name || "";
      let kind: CameraErrorKind = "unknown";
      let msg = err?.message || "Camera access failed";
      if (name === "NotAllowedError" || name === "SecurityError") {
        kind = "permission";
        msg = "Camera access was blocked. Enable camera permissions in your settings.";
      } else if (name === "NotFoundError" || name === "OverconstrainedError") {
        kind = "not_found";
        msg = "No camera found on this device.";
      } else if (name === "NotReadableError" || name === "AbortError") {
        kind = "in_use";
        msg = "Camera is being used by another app. Close other apps and try again.";
      }
      setError(msg);
      setErrorKind(kind);
      setIsReady(false);
    }
  }, [facing, resolution, attachStreamToVideo]);

  // (Re)start camera when enabled / facing / resolution change
  useEffect(() => {
    if (!enabled) {
      stop();
      return;
    }
    start();
    return () => {
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, facing, resolution]);

  // If the <video> element mounts AFTER the stream is ready, attach it then.
  useEffect(() => {
    if (enabled && streamRef.current && videoRef.current && !isReady) {
      attachStreamToVideo();
    }
  });

  return {
    videoRef,
    streamRef,
    isReady,
    error,
    errorKind,
    restart: start,
    stop,
    isNative: Capacitor.isNativePlatform(),
  };
}
