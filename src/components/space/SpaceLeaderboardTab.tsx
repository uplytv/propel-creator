import { useState } from "react";
import { Crown } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useMemberPoints } from "@/hooks/useCommunityMembers";
import MemberXPBadge from "@/components/space/MemberXPBadge";

interface Props {
  creatorId: string;
}

export default function SpaceLeaderboardTab({ creatorId }: Props) {
  const { user } = useAuth();
  const [period, setPeriod] = useState<"weekly" | "all">("weekly");
  const { data: leaderboard = [], isLoading } = useMemberPoints(creatorId, period);

  const topEntries = leaderboard.slice(0, 10);
  const currentUserEntry = user ? leaderboard.find((e: any) => e.user_id === user.id) : null;
  const currentUserInTop = topEntries.some((e: any) => e.user_id === user?.id);

  const crownColors: Record<number, string> = { 1: "hsl(var(--warning))", 2: "#C0C0C0", 3: "#CD7F32" };

  return (
    <div className="px-4 pt-4">
      {/* Period Toggle */}
      <div className="flex gap-2 mb-4">
        {(["weekly", "all"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className="px-4 py-1.5 rounded-full text-xs font-semibold capitalize"
            style={{
              background: period === p ? "hsl(var(--primary))" : "transparent",
              color: period === p ? "hsl(var(--background))" : "hsl(var(--muted-foreground))",
              border: period === p ? "none" : "1px solid #1e1e1e",
            }}
          >
            {p === "weekly" ? "Weekly" : "All Time"}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-3 rounded-lg animate-pulse" style={{ background: "hsl(var(--background))" }}>
              <div className="h-6 w-full rounded" style={{ background: "hsl(var(--card))" }} />
            </div>
          ))}
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="p-12 text-center rounded-lg" style={{ background: "hsl(var(--background))" }}>
          <Crown className="w-8 h-8 mx-auto mb-2" style={{ color: "hsl(var(--muted-foreground))" }} />
          <p className="font-semibold text-white mb-1">No rankings yet</p>
          <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>Earn points by posting, commenting, and completing lessons!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {topEntries.map((entry: any) => {
            const isCurrentUser = entry.user_id === user?.id;
            return (
              <div
                key={entry.user_id}
                className="flex items-center gap-3 p-3 rounded-lg"
                style={{
                  background: isCurrentUser ? "rgba(61, 124, 255,0.1)" : "hsl(var(--background))",
                  border: `1px solid ${isCurrentUser ? "hsl(var(--primary))" : "hsl(var(--card))"}`,
                }}
              >
                <div className="w-8 text-center">
                  {crownColors[entry.rank] ? (
                    <Crown className="w-5 h-5 mx-auto" style={{ color: crownColors[entry.rank] }} />
                  ) : (
                    <span className="text-sm font-bold" style={{ color: "hsl(var(--muted-foreground))" }}>#{entry.rank}</span>
                  )}
                </div>
                {entry.avatar_url ? (
                  <img src={entry.avatar_url} alt="" loading="lazy" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "hsl(var(--card))", color: "hsl(var(--foreground))" }}>
                    {(entry.display_name || "M").charAt(0)}
                  </div>
                )}
                <span className="flex-1 text-sm font-semibold text-white truncate flex items-center gap-1.5">
                  {entry.display_name}
                  <MemberXPBadge xp={entry.total_points} showLabel />
                  {isCurrentUser && <span className="text-xs" style={{ color: "hsl(var(--primary))" }}>(you)</span>}
                </span>
                <span className="text-sm font-bold" style={{ color: "hsl(var(--primary))" }}>{entry.total_points} pts</span>
              </div>
            );
          })}

          {/* Current user pinned at bottom if not in top 10 */}
          {currentUserEntry && !currentUserInTop && (
            <>
              <div className="text-center py-1">
                <span className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>···</span>
              </div>
              <div
                className="flex items-center gap-3 p-3 rounded-lg"
                style={{ background: "rgba(61, 124, 255,0.1)", border: "1px solid #3D7CFF" }}
              >
                <div className="w-8 text-center">
                  <span className="text-sm font-bold" style={{ color: "hsl(var(--muted-foreground))" }}>#{currentUserEntry.rank}</span>
                </div>
                {currentUserEntry.avatar_url ? (
                  <img src={currentUserEntry.avatar_url} alt="" loading="lazy" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "hsl(var(--card))", color: "hsl(var(--foreground))" }}>
                    {(currentUserEntry.display_name || "M").charAt(0)}
                  </div>
                )}
                <span className="flex-1 text-sm font-semibold text-white truncate flex items-center gap-1.5">
                  {currentUserEntry.display_name}
                  <MemberXPBadge xp={currentUserEntry.total_points} showLabel />
                  <span className="text-xs" style={{ color: "hsl(var(--primary))" }}>(you)</span>
                </span>
                <span className="text-sm font-bold" style={{ color: "hsl(var(--primary))" }}>{currentUserEntry.total_points} pts</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Points Guide */}
      <div className="mt-6 p-3 rounded-lg" style={{ background: "hsl(var(--background))", border: "1px solid #1e1e1e" }}>
        <p className="text-xs font-semibold text-white mb-2">How to earn points</p>
        <div className="space-y-1">
          {[
            { action: "Post in community", pts: 5 },
            { action: "Comment on a post", pts: 2 },
            { action: "Complete a lesson", pts: 10 },
            { action: "Attend an event", pts: 15 },
            { action: "Receive a like", pts: 1 },
          ].map((item) => (
            <div key={item.action} className="flex justify-between text-xs">
              <span style={{ color: "hsl(var(--border))" }}>{item.action}</span>
              <span style={{ color: "hsl(var(--primary))" }}>+{item.pts}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
