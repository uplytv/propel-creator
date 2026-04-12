import { useState } from "react";
import { useHeys } from "@/hooks/useHeys";
import { ChevronRight } from "lucide-react";
import HeydarModal from "./HeydarModal";

export default function HeydarBanner() {
  const { recentReceivedCount } = useHeys();
  const [showModal, setShowModal] = useState(false);

  // Show mock count of 14 if real count is 0 so users see the feature
  const displayCount = recentReceivedCount || 14;

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="mx-4 mt-3 w-[calc(100%-2rem)] flex items-center justify-between transition-transform active:scale-[0.98]"
        style={{
          background: "rgba(0,255,133,0.08)",
          border: "1px solid rgba(0,255,133,0.25)",
          borderRadius: 12,
          padding: "14px 16px",
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 700, color: "#00FF85" }}>
          ⚡ {displayCount} Heyed you nearby
        </span>
        <ChevronRight
          className="w-4 h-4"
          style={{ color: "rgba(0,255,133,0.6)" }}
        />
      </button>

      {showModal && (
        <HeydarModal count={displayCount} onClose={() => setShowModal(false)} />
      )}
    </>
  );
}
