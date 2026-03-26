import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Star, Send, MessageSquareQuote } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";

interface Review {
  id: string;
  creator_id: string;
  reviewer_id: string;
  rating: number;
  body: string;
  created_at: string;
  reviewer?: { display_name: string; avatar_url: string | null };
}

function StarRating({ rating, onChange, interactive = false }: { rating: number; onChange?: (r: number) => void; interactive?: boolean }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          disabled={!interactive}
          onClick={() => onChange?.(i)}
          className={interactive ? "cursor-pointer hover:scale-110 transition-transform" : "cursor-default"}
        >
          <Star
            className="w-4 h-4"
            fill={i <= rating ? "#FFD700" : "transparent"}
            stroke={i <= rating ? "#FFD700" : "#444"}
          />
        </button>
      ))}
    </div>
  );
}

export default function CreatorTestimonials({ creatorId, isOwner }: { creatorId: string; isOwner: boolean }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [showForm, setShowForm] = useState(false);

  const { data: reviews = [] } = useQuery({
    queryKey: ["creator-reviews", creatorId],
    queryFn: async () => {
      const { data } = await supabase
        .from("creator_reviews")
        .select("*")
        .eq("creator_id", creatorId)
        .order("created_at", { ascending: false })
        .limit(10) as any;

      if (!data?.length) return [];

      // Fetch reviewer profiles
      const reviewerIds = data.map((r: any) => r.reviewer_id);
      const { data: profiles } = await (supabase as any)
        .from("profiles_public")
        .select("user_id, display_name, avatar_url")
        .in("user_id", reviewerIds);

      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      return data.map((r: any) => ({
        ...r,
        reviewer: profileMap.get(r.reviewer_id) || { display_name: "Member", avatar_url: null },
      }));
    },
    enabled: !!creatorId,
  });

  const hasReviewed = reviews.some((r: Review) => r.reviewer_id === user?.id);
  const avgRating = reviews.length > 0 ? reviews.reduce((sum: number, r: Review) => sum + r.rating, 0) / reviews.length : 0;

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Login required");
      const { error } = await supabase.from("creator_reviews").insert({
        creator_id: creatorId,
        reviewer_id: user.id,
        rating,
        body: body.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Review submitted!", description: "Thanks for your feedback." });
      setBody("");
      setShowForm(false);
      qc.invalidateQueries({ queryKey: ["creator-reviews", creatorId] });
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  if (reviews.length === 0 && (isOwner || !user || hasReviewed)) return null;

  return (
    <section className="max-w-[720px] mx-auto px-4 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white text-xl font-bold flex items-center gap-2">
          <MessageSquareQuote className="w-5 h-5" style={{ color: "#00FF85" }} />
          Reviews
          {reviews.length > 0 && (
            <span className="text-sm font-normal text-[#888] ml-1">
              ({avgRating.toFixed(1)} · {reviews.length})
            </span>
          )}
        </h2>
        {user && !isOwner && !hasReviewed && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg"
            style={{ background: "#1a1a1a", color: "#00FF85", border: "1px solid #1E1E1E" }}
          >
            Write a Review
          </button>
        )}
      </div>

      {/* Submit form */}
      {showForm && (
        <div className="rounded-xl p-4 mb-4" style={{ background: "#111", border: "1px solid #1E1E1E" }}>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-white text-sm font-medium">Your rating:</span>
            <StarRating rating={rating} onChange={setRating} interactive />
          </div>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Share your experience..."
            className="w-full rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#555] resize-none focus:outline-none focus:ring-1 focus:ring-[#00FF85]/40"
            style={{ background: "#0A0A0A", border: "1px solid #1E1E1E" }}
          />
          <div className="flex justify-between items-center mt-2">
            <span className="text-[#555] text-xs">{body.length}/500</span>
            <button
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending || !body.trim()}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold disabled:opacity-40"
              style={{ background: "#00FF85", color: "#0A0A0A" }}
            >
              <Send className="w-3.5 h-3.5" /> Submit
            </button>
          </div>
        </div>
      )}

      {/* Review list */}
      <div className="space-y-3">
        {reviews.map((review: Review) => (
          <div
            key={review.id}
            className="rounded-xl p-4"
            style={{ background: "#111", border: "1px solid #1E1E1E" }}
          >
            <div className="flex items-center gap-3 mb-2">
              <Avatar className="w-8 h-8">
                <AvatarImage src={review.reviewer?.avatar_url || undefined} />
                <AvatarFallback className="text-xs" style={{ background: "#1a1a1a", color: "#00FF85" }}>
                  {review.reviewer?.display_name?.charAt(0) || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-semibold truncate">{review.reviewer?.display_name || "Member"}</p>
                <p className="text-[#555] text-[11px]">{formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}</p>
              </div>
              <StarRating rating={review.rating} />
            </div>
            {review.body && <p className="text-[#ccc] text-sm leading-relaxed">{review.body}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}
