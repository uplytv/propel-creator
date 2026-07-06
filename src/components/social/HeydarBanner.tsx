import { useState } from "react";
import { useHeys } from "@/hooks/useHeys";
import { ChevronRight } from "lucide-react";
import HeydarModal from "./HeydarModal";

export default function HeydarBanner() {
  const { recentReceivedCount } = useHeys();
  const [showModal, setShowModal] = useState(false);

  const displayCount = recentReceivedCount;

  if (displayCount === 0) {
    return (
      <button
        onClick={() => setShowModal(true)}
        className="mx-4 mt-3 w-[calc(100%-2rem)] flex items-center justify-between transition-transform active:scale-[0.98]"
        style={{
          background: "hsl(var(--card))",
          border: "1px solid hsl(var(--border))",
          borderRadius: 12,
          padding: "14px 16px",
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 600, color: "hsl(var(--muted-foreground))" }}>
          👋 Be the first to Hey someone nearby
        </span>
        <ChevronRight className="w-4 h-4" style={{ color: "hsl(var(--muted-foreground) / 0.7)" }} />
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="mx-4 mt-3 w-[calc(100%-2rem)] flex items-center justify-between transition-transform active:scale-[0.98]"
        style={{
          background: "rgba(61, 124, 255,0.08)",
          border: "1px solid rgba(61, 124, 255,0.25)",
          borderRadius: 12,
          padding: "14px 16px",
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 700, color: "#3D7CFF" }}>
          ⚡ {displayCount} Heyed you nearby
        </span>
        <ChevronRight
          className="w-4 h-4"
          style={{ color: "rgba(61, 124, 255,0.6)" }}
        />
      </button>

      {showModal && (
        <HeydarModal count={displayCount} onClose={() => setShowModal(false)} />
      )}
    </>
  );
}
