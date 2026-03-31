import { useNetwork } from "@/context/NetworkContext";
import { ChannelRowSkeleton } from "./NetworkSkeleton";

interface Props {
  onChannelSelect?: (category: string) => void;
}

export default function UPLYChannels({ onChannelSelect }: Props) {
  const { activeChannels, inactiveChannelCount, isLoading } = useNetwork();

  if (isLoading) return <ChannelRowSkeleton />;
  if (activeChannels.length === 0) return null;

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
      {activeChannels.map((ch: any) => (
        <button
          key={ch.id}
          onClick={() => onChannelSelect?.(ch.category)}
          className="flex-shrink-0 w-[140px] rounded-lg border border-border p-3.5 text-center space-y-1.5 hover:border-primary/30 transition-colors"
          style={{ background: "hsl(var(--card))", borderBottom: `3px solid ${ch.color || "hsl(var(--primary))"}` }}
        >
          <span className="text-2xl block">{ch.icon || "📺"}</span>
          <p className="text-[13px] font-bold text-foreground font-heading truncate">{ch.display_name || ch.category}</p>
          <p className="text-[11px] text-muted-foreground">{ch.creator_count || 0} creators</p>
        </button>
      ))}
      {inactiveChannelCount > 0 && (
        <div className="flex-shrink-0 flex items-center px-3 py-2 rounded-full border border-border" style={{ background: "hsl(var(--card))" }}>
          <span className="text-[11px] text-muted-foreground whitespace-nowrap">+{inactiveChannelCount} more launching soon</span>
        </div>
      )}
    </div>
  );
}
