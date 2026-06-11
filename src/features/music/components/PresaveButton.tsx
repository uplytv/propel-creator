import { Bell, BellOff } from "lucide-react";
import { usePresave } from "../hooks/usePresave";

interface Props {
  trackId: string;
  className?: string;
}

export default function PresaveButton({ trackId, className = "" }: Props) {
  const { hasPresaved, count = 0, toggle, isLoading } = usePresave(trackId);

  return (
    <button
      onClick={toggle}
      disabled={isLoading}
      className={`min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-sm transition ${className}`}
      style={{
        background: hasPresaved ? "#3D7CFF" : "rgba(255,255,255,0.08)",
        color: hasPresaved ? "#000" : "#fff",
      }}
      aria-pressed={hasPresaved}
    >
      {hasPresaved ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
      {hasPresaved ? "Pre-saved" : "Pre-save"}
      {count > 0 && <span className="text-xs opacity-70">{count.toLocaleString()}</span>}
    </button>
  );
}
