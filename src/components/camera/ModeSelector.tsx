import { useEffect, useRef } from "react";
import type { CameraMode } from "@/lib/cameraModes";
import { CAMERA_MODES } from "@/lib/cameraModes";

interface Props {
  active: CameraMode;
  onChange: (mode: CameraMode) => void;
}

/**
 * Instagram-style horizontal mode selector.
 * Snap-to-center, hide scrollbar, active label is electric green.
 */
export default function ModeSelector({ active, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Center the active label whenever it changes
  useEffect(() => {
    const container = containerRef.current;
    const item = itemRefs.current[active];
    if (!container || !item) return;
    const cWidth = container.clientWidth;
    const target = item.offsetLeft - cWidth / 2 + item.clientWidth / 2;
    container.scrollTo({ left: target, behavior: "smooth" });
  }, [active]);

  return (
    <div
      ref={containerRef}
      className="w-full overflow-x-auto scrollbar-hide"
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      <div
        className="flex items-center justify-start gap-7 px-[50%] py-2 select-none"
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        {CAMERA_MODES.map((mode) => {
          const isActive = mode === active;
          return (
            <button
              key={mode}
              ref={(el) => (itemRefs.current[mode] = el)}
              onClick={() => onChange(mode)}
              className="shrink-0 transition-all duration-200"
              style={{
                color: isActive ? "#3D7CFF" : "rgba(255,255,255,0.6)",
                fontWeight: isActive ? 700 : 500,
                fontSize: isActive ? 16 : 14,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                transform: isActive ? "scale(1.05)" : "scale(1)",
              }}
            >
              {mode}
            </button>
          );
        })}
      </div>
    </div>
  );
}
