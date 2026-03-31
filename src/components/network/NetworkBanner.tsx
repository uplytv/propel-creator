import { useNetwork } from "@/context/NetworkContext";

export default function NetworkBanner() {
  const { liveCount } = useNetwork();

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-border" style={{ background: "hsl(var(--card))" }}>
      <span className="text-[13px] font-bold text-foreground font-heading whitespace-nowrap">📺 UPLY Network</span>
      {liveCount > 0 && (
        <span className="flex items-center gap-1.5 whitespace-nowrap">
          <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
          <span className="text-[12px] font-semibold text-destructive">{liveCount} live now</span>
        </span>
      )}
    </div>
  );
}
