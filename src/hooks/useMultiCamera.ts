import { useState, useCallback, useRef } from "react";
import { Sentry } from "@/lib/sentry";

export type CameraSource = "front" | "back" | "screen";

export function useMultiCamera(
  streamRef: React.MutableRefObject<MediaStream | null>,
  videoRef: React.RefObject<HTMLVideoElement>
) {
  const [activeSource, setActiveSource] = useState<CameraSource>("front");
  const [switching, setSwitching] = useState(false);
  const screenStreamRef = useRef<MediaStream | null>(null);

  const switchToCamera = useCallback(
    async (source: CameraSource) => {
      if (switching) return;
      setSwitching(true);

      try {
        if (source === "screen") {
          const screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: false,
          });
          screenStreamRef.current = screenStream;

          if (streamRef.current) {
            const videoTrack = screenStream.getVideoTracks()[0];
            const oldVideoTrack = streamRef.current.getVideoTracks()[0];
            if (oldVideoTrack) {
              streamRef.current.removeTrack(oldVideoTrack);
              oldVideoTrack.stop();
            }
            streamRef.current.addTrack(videoTrack);

            if (videoRef.current) {
              videoRef.current.srcObject = streamRef.current;
            }

            // When screen share ends, switch back to front
            videoTrack.onended = () => {
              switchToCamera("front");
            };
          }
        } else {
          // Stop screen share if active
          if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach((t) => t.stop());
            screenStreamRef.current = null;
          }

          const facingMode = source === "front" ? "user" : "environment";
          const newStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
          });

          if (streamRef.current) {
            const newVideoTrack = newStream.getVideoTracks()[0];
            const oldVideoTrack = streamRef.current.getVideoTracks()[0];
            if (oldVideoTrack) {
              streamRef.current.removeTrack(oldVideoTrack);
              oldVideoTrack.stop();
            }
            streamRef.current.addTrack(newVideoTrack);

            if (videoRef.current) {
              videoRef.current.srcObject = streamRef.current;
            }
          }
        }

        setActiveSource(source);
      } catch (err) {
        Sentry.captureException(err, { tags: { context: "multi_camera" } });
      } finally {
        setSwitching(false);
      }
    },
    [switching, streamRef, videoRef]
  );

  const cleanup = useCallback(() => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
  }, []);

  return {
    activeSource,
    switching,
    switchToCamera,
    cleanup,
  };
}
