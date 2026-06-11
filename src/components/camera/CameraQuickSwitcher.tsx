import { Camera as CameraIcon, Sparkles, Smartphone, Film, Radio } from "lucide-react";
import { CAMERA_MODES, type CameraMode } from "@/lib/cameraModes";
import { hapticTick } from "@/lib/cameraHaptics";

interface Props {
  active: CameraMode;
  onChange: (mode: CameraMode) => void;
  disabled?: boolean;
}

const ICONS: Record<CameraMode, React.ComponentType<{ className?: string }>> = {
  POST: CameraIcon,
  STORY: Sparkles,
  SHORT: Smartphone,
  VIDEO: Film,
  LIVE: Radio,
};

/**
 * Compact 5-mode pill row that lives directly under the camera top bar.
 * Tap any pill to instantly switch capture mode without scrolling.
 */
export default function CameraQuickSwitcher({ active, onChange, disabled }: Props) {
  return (
    <div
      className="absolute left-0 right-0 z-30 flex justify-center px-3"
      style={{ top: "calc(env(safe-area-inset-top, 0px) + 64px)" }}
    >
      <div
        role="tablist"
        aria-label="Capture mode"
        className="flex items-center gap-1 rounded-full bg-black/55 p-1 backdrop-blur-md border border-white/10"
      >
        {CAMERA_MODES.map((mode) => {
          const Icon = ICONS[mode];
          const isActive = mode === active;
          const isLive = mode === "LIVE";
          return (
            <button
              key={mode}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={`Switch to ${mode} mode`}
              disabled={disabled}
              onClick={() => {
                if (mode === active) return;
                hapticTick();
                onChange(mode);
              }}
              className="flex h-9 items-center gap-1.5 rounded-full px-3 text-[11px] font-bold uppercase tracking-wider transition-all disabled:opacity-50"
              style={{
                background: isActive
                  ? isLive
                    ? "#FF3B30"
                    : "#3D7CFF"
                  : "transparent",
                color: isActive ? "#0A0A0A" : "rgba(255,255,255,0.85)",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                minWidth: 44,
                justifyContent: "center",
              }}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{mode}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
