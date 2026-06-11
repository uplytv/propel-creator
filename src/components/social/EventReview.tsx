import { useState } from "react";
import { Star, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";

interface EventReviewProps {
  eventId: string;
}

export default function EventReview({ eventId }: EventReviewProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: reviews = [] } = useQuery({
    queryKey: ["event-reviews", eventId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("event_reviews")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (!data || data.length === 0) return [];
      const reviewerIds = data.map((r: any) => r.reviewer_id);
      const { data: profiles } = await (supabase as any)
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", reviewerIds);
      const pMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      return data.map((r: any) => ({ ...r, profile: pMap.get(r.reviewer_id) }));
    },
  });

  const myReview = reviews.find((r: any) => r.reviewer_id === user?.id);
  const avgRating = reviews.length > 0
    ? (reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  const handleSubmit = async () => {
    if (!user || rating === 0) return;
    setSubmitting(true);
    try {
      await (supabase as any).from("event_reviews").upsert(
        { event_id: eventId, reviewer_id: user.id, rating, body: body.trim() },
        { onConflict: "event_id,reviewer_id" }
      );
      toast.success("Review posted! ⭐");
      queryClient.invalidateQueries({ queryKey: ["event-reviews", eventId] });
      setBody("");
      setRating(0);
    } catch {
      toast.error("Failed to post review");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="px-4 py-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-bold text-base">Reviews</h3>
        {avgRating && (
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="text-white font-bold text-sm">{avgRating}</span>
            <span className="text-white/40 text-xs">({reviews.length})</span>
          </div>
        )}
      </div>

      {/* Write review */}
      {user && !myReview && (
        <div className="rounded-xl p-3 mb-4" style={{ background: "rgba(255,255,255,0.06)" }}>
          <div className="flex gap-1 mb-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <button key={s} onClick={() => setRating(s)}>
                <Star
                  className="w-6 h-6 transition-colors"
                  style={{
                    fill: s <= rating ? "#FFD700" : "transparent",
                    color: s <= rating ? "#FFD700" : "rgba(255,255,255,0.2)",
                  }}
                />
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="How was it?"
              className="flex-1 px-3 py-2 rounded-lg text-sm text-white placeholder:text-white/30"
              style={{ background: "rgba(255,255,255,0.06)", border: "none", fontSize: 16 }}
            />
            <button
              onClick={handleSubmit}
              disabled={rating === 0 || submitting}
              className="w-10 h-10 rounded-lg flex items-center justify-center transition-transform active:scale-90"
              style={{ background: rating > 0 ? "#3D7CFF" : "rgba(255,255,255,0.1)" }}
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#0A0A0A" }} />
              ) : (
                <Send className="w-4 h-4" style={{ color: rating > 0 ? "#0A0A0A" : "rgba(255,255,255,0.3)" }} />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Review list */}
      {reviews.length === 0 ? (
        <p className="text-white/30 text-sm text-center py-4">No reviews yet</p>
      ) : (
        <div className="space-y-3">
          {reviews.slice(0, 5).map((r: any) => (
            <div key={r.id} className="flex gap-3">
              <Avatar className="w-8 h-8 flex-shrink-0">
                <AvatarImage src={r.profile?.avatar_url} />
                <AvatarFallback className="bg-white/10 text-white text-[10px]">
                  {(r.profile?.display_name || "U").slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-white text-xs font-semibold">{r.profile?.display_name || "User"}</span>
                  <div className="flex">
                    {Array.from({ length: r.rating }).map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <span className="text-white/30 text-[10px]">
                    {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                  </span>
                </div>
                {r.body && <p className="text-white/70 text-xs">{r.body}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
