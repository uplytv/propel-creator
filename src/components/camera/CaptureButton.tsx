import { motion } from "framer-motion";
import type { CameraMode } from "@/lib/cameraModes";
import { MODE_MAX_SECONDS } from "@/lib/cameraModes";

interface Props {
  mode: CameraMode;
  isRecording: boolean;
  recordingSeconds: number;
  onTap: () => void;
  onLongPressStart: () => void;
  onLongPressEnd: () => void;
}

/**
 * 72px capture ring. Behavior is mode-aware:
 *   POST  → tap = photo, long-press = quick video (delegated to parent)
 *   STORY → tap = photo, hold = video (parent handles)
 *   SHORT → tap = toggle record / hold-to-record (parent handles)
 *   VIDEO → tap toggles record
 *   LIVE  → tap routes to /go-live (parent handles)
 */
export default function CaptureButton({
  mode,
  isRecording,
  recordingSeconds,
  onTap,
  onLongPressStart,
  onLongPressEnd,
}: Props) {
  const max = MODE_MAX_SECONDS[mode] || 60;
  const progress = max > 0 ? Math.min(1, recordingSeconds / max) : 0;
  const ringColor = mode === "LIVE" ? "#FF3B30" : "#3D7CFF";

  // SVG ring progress
  const size = 72;
  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <button
      aria-label={isRecording ? "Stop recording" : "Capture"}
      onClick={onTap}
      onPointerDown={onLongPressStart}
      onPointerUp={onLongPressEnd}
      onPointerCancel={onLongPressEnd}
      onPointerLeave={onLongPressEnd}
      className="relative flex items-center justify-center touch-none"
      style={{ width: size, height: size }}
    >
      {/* Outer white ring */}
      <div
        className="absolute inset-0 rounded-full border-[4px] border-white/95"
        style={{
          animation: mode === "LIVE" && !isRecording ? "pulse 2s infinite" : undefined,
        }}
      />

      {/* Progress ring (during recording) */}
      {isRecording && (
        <svg
          className="absolute inset-0 -rotate-90"
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={ringColor}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
            strokeLinecap="round"
          />
        </svg>
      )}

      {/* Inner fill */}
      <motion.div
        className="rounded-full"
        animate={{
          backgroundColor: isRecording ? ringColor : "rgba(255,255,255,0.95)",
          scale: isRecording ? 0.55 : 0.85,
          borderRadius: isRecording ? 8 : 999,
        }}
        transition={{ type: "spring", damping: 22, stiffness: 240 }}
        style={{ width: size, height: size }}
      />
    </button>
  );
}
