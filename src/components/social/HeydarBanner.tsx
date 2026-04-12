import { useHeys } from "@/hooks/useHeys";

export default function HeydarBanner() {
  const { recentReceivedCount } = useHeys();

  if (recentReceivedCount === 0) return null;

  return (
    <button
      className="mx-4 mt-3 w-[calc(100%-2rem)] rounded-xl px-5 py-3.5 text-center transition-transform active:scale-[0.98]"
      style={{
        background: "linear-gradient(135deg, rgba(0,255,133,0.12) 0%, rgba(0,229,255,0.08) 100%)",
        border: "1px solid rgba(0,255,133,0.25)",
      }}
    >
      <p className="text-[15px] font-bold" style={{ color: "#00FF85" }}>
        {recentReceivedCount} Heyed you nearby
      </p>
    </button>
  );
}
