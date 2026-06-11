import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  creatorUserId: string;
  creatorName: string;
  avatarUrl: string | null;
  isLive?: boolean;
}

/**
 * Mobile-first sticky bottom CTA shown to non-owners on the unified creator
 * profile. Drives "Join {Name}'s Community →" with a LIVE marker when the
 * creator is currently broadcasting.
 */
export default function StickyJoinCTA({ creatorUserId, creatorName, avatarUrl, isLive }: Props) {
  // Cheapest active tier for inline price label.
  const { data: tier } = useQuery({
    queryKey: ["creator-cheapest-tier-cta", creatorUserId],
    enabled: !!creatorUserId,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("subscription_tiers")
        .select("price_monthly")
        .eq("creator_id", creatorUserId)
        .eq("is_active", true)
        .order("price_monthly", { ascending: true })
        .limit(1)
        .maybeSingle();
      return data as { price_monthly?: number } | null;
    },
    staleTime: 60_000,
  });

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center gap-3 px-4 py-3"
      style={{
        background: "rgba(10,10,10,0.95)",
        borderTop: "1px solid #1E1E1E",
        backdropFilter: "blur(12px)",
        paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))",
      }}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={`${creatorName} avatar`}
          loading="lazy"
          className="w-9 h-9 rounded-full object-cover shrink-0"
          style={{ border: "2px solid #3D7CFF" }}
        />
      ) : (
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 bg-card text-primary"
          style={{ border: "2px solid #3D7CFF" }}
        >
          {creatorName.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-foreground text-sm font-semibold truncate">{creatorName}</p>
        {isLive ? (
          <span className="flex items-center gap-1 text-[10px] font-bold text-destructive">
            <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" /> LIVE NOW
          </span>
        ) : tier?.price_monthly ? (
          <span className="text-[11px] text-muted-foreground">
            From ${Number(tier.price_monthly).toFixed(0)}/month
          </span>
        ) : null}
      </div>
      <Link
        to={`/community/${creatorUserId}`}
        className="px-4 h-11 inline-flex items-center rounded-xl text-sm font-bold shrink-0 bg-primary text-primary-foreground hover:opacity-95 transition"
        style={{ boxShadow: "0 0 20px rgba(61, 124, 255,0.25)" }}
      >
        Join Community →
      </Link>
    </div>
  );
}
