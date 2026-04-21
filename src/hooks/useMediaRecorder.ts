import { useCallback, useEffect, useRef, useState } from "react";

interface Options {
  streamRef: React.MutableRefObject<MediaStream | null>;
  maxSeconds?: number;
  onAutoStop?: () => void;
}

/**
 * Records the current MediaStream to an in-memory Blob via MediaRecorder.
 * Auto-stops at maxSeconds and exposes elapsed seconds for the progress ring.
 */
export function useMediaRecorder({ streamRef, maxSeconds = 60, onAutoStop }: Options) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number | null>(null);
  const tickRef = useRef<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const stop = useCallback(
    () =>
      new Promise<{ blob: Blob; seconds: number } | null>((resolve) => {
        const rec = recorderRef.current;
        if (!rec || rec.state === "inactive") {
          setIsRecording(false);
          if (tickRef.current) cancelAnimationFrame(tickRef.current);
          resolve(null);
          return;
        }
        rec.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: rec.mimeType || "video/webm" });
          const seconds = startedAtRef.current
            ? Math.round((Date.now() - startedAtRef.current) / 1000)
            : 0;
          chunksRef.current = [];
          startedAtRef.current = null;
          setIsRecording(false);
          if (tickRef.current) cancelAnimationFrame(tickRef.current);
          resolve({ blob, seconds });
        };
        rec.stop();
      }),
    []
  );

  const start = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;
    let mimeType = "video/webm;codecs=vp9,opus";
    if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = "video/webm;codecs=vp8,opus";
    if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = "video/mp4";
    const rec = new MediaRecorder(stream, { mimeType });
    chunksRef.current = [];
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorderRef.current = rec;
    startedAtRef.current = Date.now();
    rec.start(1000);
    setIsRecording(true);
    setElapsed(0);

    const tick = () => {
      if (!startedAtRef.current) return;
      const sec = (Date.now() - startedAtRef.current) / 1000;
      setElapsed(sec);
      if (sec >= maxSeconds) {
        stop().then(() => onAutoStop?.());
        return;
      }
      tickRef.current = requestAnimationFrame(tick);
    };
    tickRef.current = requestAnimationFrame(tick);
  }, [streamRef, maxSeconds, stop, onAutoStop]);

  useEffect(() => {
    return () => {
      if (tickRef.current) cancelAnimationFrame(tickRef.current);
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        try {
          recorderRef.current.stop();
        } catch {
          /* noop */
        }
      }
    };
  }, []);

  return { start, stop, isRecording, elapsed };
}
