import { useState } from "react";
import { Crown } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useMemberPoints } from "@/hooks/useCommunityMembers";
import MemberXPBadge from "@/components/space/MemberXPBadge";
import QueryErrorState from "@/components/ui/QueryErrorState";
import { cn } from "@/lib/utils";

interface Props {
  creatorId: string;
}

const crownColors: Record<number, string> = { 1: "text-yellow-500", 2: "text-slate-400", 3: "text-amber-700" };

function Row({ entry, isCurrentUser }: { entry: any; isCurrentUser: boolean }) {
  const name = entry.display_name || "Member";
  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-md border transition-colors",
        isCurrentUser ? "bg-primary/5 border-primary" : "bg-card border-border",
      )}
    >
      <div className="w-8 text-center shrink-0">
        {crownColors[entry.rank] ? (
          <Crown className={cn("w-5 h-5 mx-auto", crownColors[entry.rank])} />
        ) : (
          <span className="text-sm font-bold text-muted-foreground tabular-nums">#{entry.rank}</span>
        )}
      </div>
      {entry.avatar_url ? (
        <img src={entry.avatar_url} alt="" loading="lazy" className="w-9 h-9 rounded-full object-cover shrink-0" />
      ) : (
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold bg-muted text-foreground shrink-0">
          {name.charAt(0).toUpperCase()}
        </div>
      )}
      <span className="flex-1 min-w-0 text-sm font-semibold text-foreground truncate flex items-center gap-1.5">
        <span className="truncate">{name}</span>
        <MemberXPBadge xp={entry.total_points} showLabel />
        {isCurrentUser && <span className="text-xs text-primary shrink-0">(you)</span>}
      </span>
      <span className="text-sm font-bold text-primary tabular-nums shrink-0">{Number(entry.total_points).toLocaleString()} pts</span>
    </div>
  );
}

export default function SpaceLeaderboardTab({ creatorId }: Props) {
  const { user } = useAuth();
  const [period, setPeriod] = useState<"weekly" | "all">("weekly");
  const { data: leaderboard = [], isLoading, isError, refetch } = useMemberPoints(creatorId, period);

  const topEntries = leaderboard.slice(0, 10);
  const currentUserEntry = user ? leaderboard.find((e: any) => e.user_id === user.id) : null;
  const currentUserInTop = topEntries.some((e: any) => e.user_id === user?.id);

  return (
    <div className="px-4 pt-4 max-w-2xl mx-auto pb-24">
      {/* Period — squared segmented control */}
      <div className="inline-flex items-center gap-0.5 rounded-md border border-border bg-card p-0.5 mb-4">
        {(["weekly", "all"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={cn(
              "px-3.5 py-1.5 text-xs font-semibold rounded-sm transition-colors",
              period === p ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {p === "weekly" ? "This week" : "All time"}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-[60px] rounded-md bg-muted/30 animate-pulse" />)}
        </div>
      ) : isError ? (
        <QueryErrorState message="We couldn't load the leaderboard right now. Check your connection and try again." onRetry={() => refetch()} />
      ) : leaderboard.length === 0 ? (
        <div className="p-12 text-center rounded-md border border-border bg-card">
          <Crown className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className="font-semibold text-foreground mb-1">No rankings yet</p>
          <p className="text-sm text-muted-foreground">Earn points by posting, commenting, and completing lessons.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {topEntries.map((entry: any) => (
            <Row key={entry.user_id} entry={entry} isCurrentUser={entry.user_id === user?.id} />
          ))}

          {currentUserEntry && !currentUserInTop && (
            <>
              <div className="text-center py-1 text-xs text-muted-foreground">···</div>
              <Row entry={currentUserEntry} isCurrentUser />
            </>
          )}
        </div>
      )}

      {/* How to earn points */}
      <div className="mt-6 p-4 rounded-md border border-border bg-card">
        <p className="text-xs font-semibold text-foreground mb-2.5">How to earn points</p>
        <div className="space-y-1.5">
          {[
            { action: "Post in community", pts: 5 },
            { action: "Comment on a post", pts: 2 },
            { action: "Complete a lesson", pts: 10 },
            { action: "Attend an event", pts: 15 },
            { action: "Receive a like", pts: 1 },
          ].map((item) => (
            <div key={item.action} className="flex justify-between text-xs">
              <span className="text-muted-foreground">{item.action}</span>
              <span className="text-primary font-semibold">+{item.pts}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
