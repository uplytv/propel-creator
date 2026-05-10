import { memo } from "react";
import { useTopFans, useMyFanRank } from "../hooks/useTopFans";
import { Crown, Heart, Headphones, Coins } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const MEDAL = ["text-amber-400", "text-slate-300", "text-amber-700"];

function shortId(id: string) {
  return id.slice(0, 4) + "…" + id.slice(-4);
}

function TopFansLeaderboard({ artistId, limit = 10 }: { artistId: string; limit?: number }) {
  const { user } = useAuth();
  const { data: fans, isLoading } = useTopFans(artistId, limit);
  const { data: me } = useMyFanRank(artistId);

  if (isLoading) {
    return <div className="text-sm text-muted-foreground p-4">Loading top fans…</div>;
  }
  if (!fans?.length) {
    return (
      <div className="rounded-xl border border-border/50 p-6 text-center">
        <Crown className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No top fans yet. Be the first!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Crown className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Top fans</h3>
      </div>
      <ul className="space-y-2">
        {fans.map((row, idx) => {
          const isMe = user?.id === row.fan_id;
          return (
            <li
              key={row.id}
              className={`flex items-center gap-3 rounded-xl border p-3 ${
                isMe ? "border-primary/60 bg-primary/5" : "border-border/50 bg-card/40"
              }`}
            >
              <span
                className={`w-7 text-center text-sm font-bold tabular-nums ${
                  MEDAL[idx] ?? "text-muted-foreground"
                }`}
              >
                {idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground line-clamp-1">
                  {isMe ? "You" : `Fan ${shortId(row.fan_id)}`}
                </p>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Headphones className="h-3 w-3" />
                    {row.listens}
                  </span>
                  <span className="flex items-center gap-1">
                    <Coins className="h-3 w-3" />${(row.tips_cents / 100).toFixed(0)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Heart className="h-3 w-3" />
                    {row.dedications_count}
                  </span>
                </div>
              </div>
              <span className="text-sm font-bold text-primary tabular-nums">{row.points}</span>
            </li>
          );
        })}
      </ul>
      {me && !fans.some((f) => f.fan_id === me.fan_id) && (
        <div className="rounded-xl border border-primary/60 bg-primary/5 p-3 flex items-center justify-between">
          <span className="text-sm text-foreground">Your score</span>
          <span className="text-sm font-bold text-primary tabular-nums">{me.points}</span>
        </div>
      )}
    </div>
  );
}

export default memo(TopFansLeaderboard);
