import { useEffect, useRef, useCallback, useState } from 'react';
import { Sentry } from "@/lib/sentry";

/**
 * Auto Picture-in-Picture hook.
 * Enters PiP when the video scrolls out of view or the page becomes hidden.
 * Exits PiP when the video scrolls back into view.
 */
export function useAutoPip(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  isPlaying: boolean
) {
  const [isPip, setIsPip] = useState(false);
  const autoPipTriggeredRef = useRef(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const enterPip = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !document.pictureInPictureEnabled) return;
    if (document.pictureInPictureElement) return; // already in PiP
    try {
      await video.requestPictureInPicture();
      autoPipTriggeredRef.current = true;
    } catch {
      // User gesture required or not supported
    }
  }, [videoRef]);

  const exitPip = useCallback(async () => {
    if (!document.pictureInPictureElement) return;
    // Only exit if we auto-triggered it
    if (!autoPipTriggeredRef.current) return;
    try {
      await document.exitPictureInPicture();
      autoPipTriggeredRef.current = false;
    } catch {
      // ignore
    }
  }, []);

  const togglePip = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        autoPipTriggeredRef.current = false;
      } else {
        await video.requestPictureInPicture();
        autoPipTriggeredRef.current = false; // manual toggle, don't auto-exit
      }
    } catch (err) {
      Sentry.captureException(err, { tags: { context: "auto_pip" } });
    }
  }, [videoRef]);

  // Track PiP state
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onEnter = () => setIsPip(true);
    const onLeave = () => {
      setIsPip(false);
      autoPipTriggeredRef.current = false;
    };
    video.addEventListener('enterpictureinpicture', onEnter);
    video.addEventListener('leavepictureinpicture', onLeave);
    return () => {
      video.removeEventListener('enterpictureinpicture', onEnter);
      video.removeEventListener('leavepictureinpicture', onLeave);
    };
  }, [videoRef]);

  // Auto-PiP on scroll (IntersectionObserver)
  useEffect(() => {
    if (!isPlaying || !document.pictureInPictureEnabled) return;
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting && isPlaying && !document.pictureInPictureElement) {
          enterPip();
        } else if (entry.isIntersecting && autoPipTriggeredRef.current) {
          exitPip();
        }
      },
      { threshold: 0.25 } // trigger when less than 25% visible
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, [isPlaying, enterPip, exitPip]);

  // Auto-PiP on page visibility change (tab switch / navigate away)
  useEffect(() => {
    if (!isPlaying || !document.pictureInPictureEnabled) return;

    const handleVisibility = () => {
      if (document.hidden && isPlaying && !document.pictureInPictureElement) {
        enterPip();
      }
      // Don't auto-exit on visibility return — user may want to keep PiP
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isPlaying, enterPip]);

  return { isPip, togglePip, containerRef };
}
