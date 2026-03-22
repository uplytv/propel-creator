import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Crown } from "lucide-react";

interface LeaderboardEntry {
  id: string;
  full_name: string;
  referral_count: number;
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
    <div className="rounded-2xl p-6 md:p-8" style={{ background: "#111111" }}>
      <h3 className="font-bold text-lg text-center mb-2 text-white">Top Referrers 🏆</h3>
      <p className="text-center text-xs mb-6" style={{ color: "#FFD700" }}>
        #1 referrer wins <span className="font-bold">$1,000 cash</span> 💰
      </p>
      <div className="space-y-3">
        {top.length === 0 ? (
          <p className="text-sm text-center" style={{ color: "#888" }}>No referrals yet — be the first!</p>
        ) : (
          top.map((entry, i) => (
            <div
              key={entry.id}
              className="flex items-center gap-3 py-2.5 border-b last:border-0"
              style={{
                borderColor: "#1E1E1E",
                borderLeftWidth: currentUser?.id === entry.id ? 3 : 0,
                borderLeftColor: "#00FF85",
                paddingLeft: currentUser?.id === entry.id ? 12 : 0,
              }}
            >
              <span className="font-bold text-sm w-8" style={{ color: "#00FF85" }}>#{i + 1}</span>
              <span className="text-sm text-white flex-1">{formatName(entry.full_name)}</span>
              {entry.referral_count >= 3 && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: "#00FF8520", color: "#00FF85" }}>
                  🚀 Early Access
                </span>
              )}
              <span className="text-xs" style={{ color: "#888" }}>{entry.referral_count} referrals</span>
            </div>
          ))
        )}
      </div>

      {/* Pinned current user if not in top 10 */}
      {currentUser && !isCurrentInTop && (
        <>
          <div className="my-3 border-t" style={{ borderColor: "#1E1E1E" }}>
            <p className="text-center text-xs py-1" style={{ color: "#888" }}>•••</p>
          </div>
          <div
            className="flex items-center gap-3 py-2.5"
            style={{ borderLeftWidth: 3, borderLeftColor: "#00FF85", paddingLeft: 12 }}
          >
            <span className="font-bold text-sm w-8" style={{ color: "#00FF85" }}>#{currentUser.rank}</span>
            <span className="text-sm text-white flex-1">{formatName(currentUser.full_name)} (You)</span>
            <span className="text-xs" style={{ color: "#888" }}>{currentUser.referral_count} referrals</span>
          </div>
        </>
      )}
    </div>
  );
}
