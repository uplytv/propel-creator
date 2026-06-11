import { useState } from "react";
import { Type, Infinity as InfinityIcon, LayoutGrid, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import type { CameraMode } from "@/lib/cameraModes";

interface Props {
  mode: CameraMode;
  filterIndex?: number;
  onCycleFilter?: () => void;
  onText?: () => void;
  onLoop?: () => void;
  onLayout?: () => void;
}

/**
 * Vertical icon rail on the left edge of the viewfinder. Items are mode-aware:
 *   - Aa text: all
 *   - ∞ loop/boomerang: SHORT + STORY only
 *   - ▢ layout: STORY + POST only
 *   - filters: all
 */
export default function LeftToolRail({ mode, filterIndex = 0, onCycleFilter, onText, onLoop, onLayout }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  const showLoop = mode === "SHORT" || mode === "STORY";
  const showLayout = mode === "STORY" || mode === "POST";

  return (
    <div
      className="absolute left-2 top-1/2 z-30 -translate-y-1/2"
      style={{ pointerEvents: "auto" }}
    >
      <div className="flex flex-col items-center gap-3 rounded-full bg-black/35 px-2 py-3 backdrop-blur-md">
        {!collapsed && (
          <>
            <RailButton ariaLabel="Add text" onClick={onText}>
              <Type className="h-5 w-5 text-white" />
            </RailButton>
            {showLoop && (
              <RailButton ariaLabel="Loop / boomerang" onClick={onLoop}>
                <InfinityIcon className="h-5 w-5 text-white" />
              </RailButton>
            )}
            {showLayout && (
              <RailButton ariaLabel="Layout" onClick={onLayout}>
                <LayoutGrid className="h-5 w-5 text-white" />
              </RailButton>
            )}
            <RailButton ariaLabel="Filters" onClick={onCycleFilter}>
              <Sparkles className="h-5 w-5" style={{ color: filterIndex > 0 ? "#3D7CFF" : "#fff" }} />
            </RailButton>
          </>
        )}
        <RailButton
          ariaLabel={collapsed ? "Expand tools" : "Collapse tools"}
          onClick={() => setCollapsed((v) => !v)}
        >
          {collapsed ? (
            <ChevronUp className="h-5 w-5 text-white/70" />
          ) : (
            <ChevronDown className="h-5 w-5 text-white/70" />
          )}
        </RailButton>
      </div>
    </div>
  );
}

function RailButton({
  children,
  ariaLabel,
  onClick,
}: {
  children: React.ReactNode;
  ariaLabel: string;
  onClick?: () => void;
}) {
  return (
    <button
      aria-label={ariaLabel}
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-full transition-transform active:scale-90"
    >
      {children}
    </button>
  );
}
