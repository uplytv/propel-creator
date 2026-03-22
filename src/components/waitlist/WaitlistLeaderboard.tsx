import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Crown } from "lucide-react";

interface LeaderboardEntry {
  id: string;
  full_name: string;
  referral_count: number;
  avatar_url?: string | null;
}

export default function WaitlistLeaderboard({ currentEmail }: { currentEmail: string }) {
  const [top, setTop] = useState<LeaderboardEntry[]>([]);
  const [currentUser, setCurrentUser] = useState<LeaderboardEntry & { rank: number } | null>(null);

  const fetchLeaderboard = async () => {
    const { data } = await supabase
      .from("waitlist" as any)
      .select("id, full_name, referral_count")
      .order("referral_count", { ascending: false })
      .limit(10) as any;
    if (data) setTop(data);

    // Fetch current user
    const { data: me } = await supabase
      .from("waitlist" as any)
      .select("id, full_name, referral_count")
      .eq("email", currentEmail)
      .maybeSingle() as any;
    if (me) {
      const { count } = await supabase
        .from("waitlist" as any)
        .select("*", { count: "exact", head: true })
        .gt("referral_count", me.referral_count) as any;
      setCurrentUser({ ...me, rank: (count || 0) + 1 });
    }
  };

  useEffect(() => {
    fetchLeaderboard();
    const channel = supabase
      .channel("waitlist-leaderboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "waitlist" }, () => fetchLeaderboard())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentEmail]);

  const formatName = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[parts.length - 1][0]}.`;
  };

  const isCurrentInTop = currentUser && top.some((t) => t.id === currentUser.id);

  return (
    <div className="rounded-2xl p-6 md:p-8 bg-card border border-border">
      <h3 className="font-bold text-lg text-center mb-1 text-foreground">Top Inviters 🏆</h3>
      <p className="text-center text-xs mb-6 text-muted-foreground">
        These are the people bringing the most creators to UPLY
      </p>
      <div className="space-y-3">
        {top.length === 0 ? (
          <p className="text-sm text-center text-muted-foreground">No referrals yet — be the first!</p>
        ) : (
          top.map((entry, i) => (
            <div
              key={entry.id}
              className="flex items-center gap-3 py-2.5 border-b last:border-0 border-border"
              style={{
                borderLeftWidth: currentUser?.id === entry.id ? 3 : 0,
                borderLeftColor: "hsl(var(--primary))",
                paddingLeft: currentUser?.id === entry.id ? 12 : 0,
              }}
            >
              <span className="font-bold text-sm w-8 text-primary">#{i + 1}</span>
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0 overflow-hidden">
                {entry.avatar_url ? (
                  <img src={entry.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  formatName(entry.full_name)[0]?.toUpperCase()
                )}
              </div>
              <span className="text-sm text-foreground flex-1 font-semibold">{formatName(entry.full_name)}</span>
              {entry.referral_count >= 25 && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: "hsl(45, 93%, 47%, 0.15)", color: "hsl(45, 93%, 47%)" }}>
                  👑 Founding Creator
                </span>
              )}
              {entry.referral_count >= 3 && entry.referral_count < 25 && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  🚀 Early Access
                </span>
              )}
              <span className="text-xs text-primary font-semibold">{entry.referral_count} referrals</span>
            </div>
          ))
        )}
      </div>

      {/* Pinned current user if not in top 10 */}
      {currentUser && !isCurrentInTop && (
        <>
          <div className="my-3 border-t border-border">
            <p className="text-center text-xs py-1 text-muted-foreground">•••</p>
          </div>
          <div
            className="flex items-center gap-3 py-2.5"
            style={{ borderLeftWidth: 3, borderLeftColor: "hsl(var(--primary))", paddingLeft: 12 }}
          >
            <span className="font-bold text-sm w-8 text-primary">#{currentUser.rank}</span>
            <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
              {formatName(currentUser.full_name)[0]?.toUpperCase()}
            </div>
            <span className="text-sm text-foreground flex-1 font-semibold">{formatName(currentUser.full_name)} (You)</span>
            <span className="text-xs text-primary font-semibold">{currentUser.referral_count} referrals</span>
          </div>
        </>
      )}
    </div>
  );
}
