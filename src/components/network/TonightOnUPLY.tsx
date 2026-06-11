import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useNetwork } from "@/context/NetworkContext";
import { useAuth } from "@/context/AuthContext";
import { TonightSkeleton } from "./NetworkSkeleton";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function TonightOnUPLY() {
  const { liveStreams, scheduledStreams, tuneInCreators, isLoading } = useNetwork();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());
  const [debouncing, setDebouncing] = useState<Set<string>>(new Set());

  const handleFollow = async (creatorId: string) => {
    if (!user) { navigate("/auth"); return; }
    if (debouncing.has(creatorId)) return;
    setDebouncing(prev => new Set(prev).add(creatorId));
    
    const { error } = await supabase.from("follows").insert({ follower_id: user.id, following_id: creatorId } as any);
    if (!error || (error as any)?.code === "23505") {
      setFollowedIds(prev => new Set(prev).add(creatorId));
      toast.success("Following!");
    }
    setTimeout(() => setDebouncing(prev => { const n = new Set(prev); n.delete(creatorId); return n; }), 500);
  };

  if (isLoading) return (
    <div className="rounded-xl p-4 space-y-3" style={{ background: "hsl(var(--primary)/0.02)", border: "1px solid hsl(var(--primary)/0.12)" }}>
      <p className="text-sm font-bold text-foreground font-heading">📡 Tonight on UPLY</p>
      <TonightSkeleton />
    </div>
  );

  const hasStreams = liveStreams.length > 0 || scheduledStreams.length > 0;

  if (hasStreams) {
    return (
      <div className="rounded-xl p-4 space-y-3" style={{ background: "hsl(var(--primary)/0.02)", border: "1px solid hsl(var(--primary)/0.12)" }}>
        <p className="text-sm font-bold text-foreground font-heading">📡 Tonight on UPLY</p>
        <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
          {[...liveStreams, ...scheduledStreams].slice(0, 6).map((stream: any) => (
            <div
              key={stream.id}
              className="flex-shrink-0 w-[200px] rounded-lg border border-border overflow-hidden cursor-pointer hover:border-primary/30 transition-colors"
              style={{ background: "hsl(var(--card))" }}
              onClick={() => navigate(`/stream/${stream.id}`)}
            >
              <div className="relative" style={{ aspectRatio: "16/9" }}>
                <img
                  src={stream.playback_id ? `https://image.mux.com/${stream.playback_id}/thumbnail.jpg?width=400` : "/placeholder.svg"}
                  alt={stream.title || "Stream"}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
                {liveStreams.some((l: any) => l.id === stream.id) && (
                  <span className="absolute top-2 left-2 bg-destructive text-destructive-foreground text-[9px] font-bold px-1.5 py-0.5 rounded animate-pulse">LIVE</span>
                )}
              </div>
              <div className="p-2">
                <p className="text-xs font-semibold text-foreground truncate">{stream.title || "Untitled"}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Fallback: Tune In creators
  if (tuneInCreators.length > 0) {
    return (
      <div className="rounded-xl p-4 space-y-3" style={{ background: "hsl(var(--primary)/0.02)", border: "1px solid hsl(var(--primary)/0.12)" }}>
        <p className="text-sm font-bold text-foreground font-heading">📡 Tune In — Follow your favorites</p>
        <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
          {tuneInCreators.map((creator: any) => (
            <div
              key={creator.user_id}
              className="flex-shrink-0 w-[160px] rounded-lg border border-border p-3 text-center space-y-2"
              style={{ background: "hsl(var(--card))" }}
            >
              <div className="mx-auto w-10 h-10 rounded-full overflow-hidden" style={{ border: "2px solid hsl(var(--primary))" }}>
                {creator.avatar_url ? (
                  <img src={creator.avatar_url} alt={`${creator.display_name || "Creator"} avatar`} loading="lazy" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                    {(creator.display_name || "?")[0]}
                  </div>
                )}
              </div>
              <p className="text-[13px] font-semibold text-foreground truncate">{creator.display_name || "Creator"}</p>
              <p className="text-[11px] text-muted-foreground truncate">{creator.channel_category || "Creator"}</p>
              <Button
                size="sm"
                variant={followedIds.has(creator.user_id) ? "secondary" : "outline"}
                className={`w-full text-xs h-7 ${!followedIds.has(creator.user_id) ? "border-primary text-primary hover:bg-primary hover:text-primary-foreground" : ""}`}
                onClick={() => handleFollow(creator.user_id)}
                disabled={debouncing.has(creator.user_id) || followedIds.has(creator.user_id)}
              >
                {followedIds.has(creator.user_id) ? "✓ Following" : "Follow"}
              </Button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Final fallback: schedule prompt (only for creators)
  if (user) {
    return (
      <div className="rounded-xl p-4 space-y-2" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--primary)/0.3)" }}>
        <p className="text-sm font-bold text-foreground font-heading">📺 Schedule your first show</p>
        <p className="text-[13px] text-muted-foreground">Creators who publish a schedule get 3x more viewers.</p>
        <Button
          size="sm"
          variant="outline"
          className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
          onClick={() => navigate("/go-live?tab=schedule")}
        >
          Schedule a Stream →
        </Button>
      </div>
    );
  }

  return null;
}
