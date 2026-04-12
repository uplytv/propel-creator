import { useHeys } from "@/hooks/useHeys";

export default function HeydarBanner() {
  const { recentReceivedCount } = useHeys();

  if (recentReceivedCount === 0) return null;

  return (
    <div
      className="mx-4 mt-3 rounded-xl px-4 py-3 cursor-pointer"
      style={{
        backgroundColor: "rgba(0,255,133,0.08)",
        border: "1px solid rgba(0,255,133,0.2)",
      }}
    >
      <p className="text-sm font-semibold" style={{ color: "#00FF85" }}>
        {recentReceivedCount} Heyed you nearby
      </p>
      <p className="text-xs text-white/50 mt-0.5">Tap to see who's interested</p>
    </div>
  );
}
