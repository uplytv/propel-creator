import { X, Zap, ZapOff, Settings } from "lucide-react";

interface Props {
  flash: "off" | "on" | "auto";
  resolution: "1080p" | "4K";
  onClose: () => void;
  onToggleFlash: () => void;
  onToggleResolution: () => void;
  onOpenSettings: () => void;
}

export default function CameraTopBar({
  flash,
  resolution,
  onClose,
  onToggleFlash,
  onToggleResolution,
  onOpenSettings,
}: Props) {
  return (
    <div
      className="absolute left-0 right-0 top-0 z-30 flex items-center justify-between px-4"
      style={{
        paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)",
        paddingBottom: 12,
      }}
    >
      <button
        aria-label="Close camera"
        onClick={onClose}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="flex items-center gap-2">
        <button
          aria-label="Toggle flash"
          onClick={onToggleFlash}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md"
        >
          {flash === "off" ? <ZapOff className="h-5 w-5" /> : <Zap className="h-5 w-5" style={{ color: "#3D7CFF" }} />}
        </button>
        <button
          aria-label="Toggle resolution"
          onClick={onToggleResolution}
          className="rounded-full bg-black/40 px-3 py-2 text-xs font-bold text-white backdrop-blur-md"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          {resolution === "4K" ? "4K" : "HD"}
        </button>
        <button
          aria-label="Camera settings"
          onClick={onOpenSettings}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md"
        >
          <Settings className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
