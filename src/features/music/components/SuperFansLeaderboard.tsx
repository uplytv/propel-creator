import { Crown } from "lucide-react";
import { useSuperFans, TIER_COLORS, type SuperFanTier } from "../hooks/useSuperFans";

interface Props {
  artistId: string;
  limit?: number;
}

export default function SuperFansLeaderboard({ artistId, limit = 10 }: Props) {
  const { data: fans = [], isLoading } = useSuperFans(artistId, limit);

  if (isLoading) {
    return <div className="h-40 rounded-xl bg-white/5 animate-pulse" />;
  }
  if (!fans.length) {
    return (
      <div className="rounded-xl bg-white/5 p-6 text-center">
        <Crown className="w-8 h-8 text-white/30 mx-auto mb-2" />
        <p className="text-white/50 text-sm">No super fans yet — keep dropping music!</p>
      </div>
    );
  }

  return (
    <section className="rounded-xl bg-white/5 p-4 space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <Crown className="w-4 h-4 text-[#FFD700]" />
        <h3 className="text-white font-bold text-sm">Super Fans</h3>
      </div>
      {fans.map((f, i) => (
        <div key={f.user_id} className="flex items-center gap-3 bg-white/5 rounded-lg p-2.5">
          <span className="text-white/40 font-black text-sm w-5">{i + 1}</span>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-white/20 to-white/5 flex items-center justify-center">
            <span className="text-white text-xs font-bold">{f.user_id.slice(0, 2).toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{f.user_id.slice(0, 8)}…</p>
            <p className="text-white/40 text-[11px]">
              {f.plays} plays · {f.likes} likes · {f.purchases} buys
            </p>
          </div>
          <FanBadge tier={f.tier as SuperFanTier} score={f.score} />
        </div>
      ))}
    </section>
  );
}

function FanBadge({ tier, score }: { tier: SuperFanTier; score: number }) {
  return (
    <div className="text-right">
      <span
        className="inline-block rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider"
        style={{ background: `${TIER_COLORS[tier]}30`, color: TIER_COLORS[tier] }}
      >
        {tier}
      </span>
      <p className="text-white/40 text-[10px] mt-0.5">{score.toLocaleString()} pts</p>
    </div>
  );
}
