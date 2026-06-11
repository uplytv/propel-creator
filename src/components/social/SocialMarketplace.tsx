import { useState } from "react";
import { useSocialPosts } from "@/hooks/useSocialPosts";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { X, Plus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

const CATEGORIES = [
  { label: "Ticket", emoji: "🎟️", value: "ticket" },
  { label: "Stay", emoji: "🏠", value: "stay" },
  { label: "Rideshare", emoji: "🚗", value: "rideshare" },
  { label: "Other", emoji: "🛍️", value: "other" },
];

export default function SocialMarketplace() {
  const { user } = useAuth();
  const { posts, isLoading, createPost } = useSocialPosts();
  const [showCreate, setShowCreate] = useState(false);
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("ticket");
  const [price, setPrice] = useState("");
  const [posting, setPosting] = useState(false);

  const marketplacePosts = posts.filter((p: any) => p.post_type === "marketplace");

  const handlePost = async () => {
    if (!content.trim()) return;
    setPosting(true);
    try {
      await createPost({
        content: content.trim(),
        postType: "marketplace",
      });
      toast.success("Listed! 🏪");
      setShowCreate(false);
      setContent("");
      setPrice("");
    } catch (err: any) {
      toast.error(err.message || "Failed");
    } finally {
      setPosting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3 px-4 py-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="relative pb-20">
      {marketplacePosts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
          <span className="text-5xl mb-4">🏪</span>
          <p className="text-white font-bold text-lg mb-2">No listings yet</p>
          <p className="text-white/50 text-sm mb-6">Buy, sell, and trade tickets, stays, and rideshares</p>
          {user && (
            <button
              onClick={() => setShowCreate(true)}
              className="px-6 py-3 rounded-xl font-bold text-sm"
              style={{ backgroundColor: "#3D7CFF", color: "#0A0A0A" }}
            >
              Post a Listing
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2 px-4 py-3">
          {marketplacePosts.map((post: any) => {
            const profile = post.profiles;
            const catEmoji = CATEGORIES.find((c) => c.value === post.marketplace_category)?.emoji || "🛍️";
            return (
              <div
                key={post.id}
                className="rounded-xl p-3"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <div className="flex items-start gap-2.5">
                  <Avatar className="w-9 h-9 flex-shrink-0">
                    <AvatarImage src={profile?.avatar_url} />
                    <AvatarFallback className="bg-white/10 text-white text-xs">
                      {(profile?.display_name || "U").slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-white">{profile?.display_name}</span>
                      <span className="text-lg">{catEmoji}</span>
                    </div>
                    <p className="text-sm text-white/80 line-clamp-3">{post.content}</p>
                    {post.price && (
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-md text-xs font-bold" style={{ background: "rgba(61, 124, 255,0.1)", color: "#3D7CFF" }}>
                        ${post.price}
                      </span>
                    )}
                    <p className="text-[10px] text-white/30 mt-1">
                      {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* FAB */}
      {user && (
        <button
          onClick={() => setShowCreate(true)}
          className="fixed bottom-24 right-4 w-14 h-14 rounded-full flex items-center justify-center shadow-lg z-30 transition-transform active:scale-90"
          style={{ backgroundColor: "#3D7CFF" }}
        >
          <Plus className="w-6 h-6" style={{ color: "#0A0A0A" }} />
        </button>
      )}

      {/* Create sheet */}
      {showCreate && (
        <>
          <div className="fixed inset-0 z-[99]" style={{ background: "rgba(0,0,0,0.7)" }} onClick={() => setShowCreate(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-[100]" style={{ background: "#141414", borderRadius: "20px 20px 0 0", padding: "16px 20px 40px", animation: "slideUp 0.3s ease-out" }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.2)", margin: "0 auto 16px" }} />
            <button onClick={() => setShowCreate(false)} className="absolute top-4 right-4" style={{ color: "rgba(255,255,255,0.5)" }}>
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-white mb-4">New Listing</h3>
            <div className="flex gap-2 mb-4">
              {CATEGORIES.map((c) => (
                <button key={c.value} onClick={() => setCategory(c.value)} className="flex-1 py-2 rounded-xl text-xs font-semibold text-center" style={{ background: category === c.value ? "rgba(61, 124, 255,0.1)" : "rgba(255,255,255,0.04)", border: `1px solid ${category === c.value ? "rgba(61, 124, 255,0.3)" : "rgba(255,255,255,0.1)"}`, color: category === c.value ? "#3D7CFF" : "rgba(255,255,255,0.5)" }}>
                  {c.emoji}<br />{c.label}
                </button>
              ))}
            </div>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="What are you offering or looking for?" className="w-full p-3 rounded-xl text-sm text-white placeholder:text-white/30 resize-none mb-3" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", minHeight: 80 }} />
            <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="$ Price (optional)" type="number" className="w-full p-3 rounded-xl text-sm text-white placeholder:text-white/30 mb-4" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }} />
            <button onClick={handlePost} disabled={posting || !content.trim()} className="w-full py-3 rounded-xl font-bold text-sm" style={{ backgroundColor: "#3D7CFF", color: "#0A0A0A", opacity: posting || !content.trim() ? 0.5 : 1 }}>
              {posting ? "Posting..." : "Post Listing"}
            </button>
          </div>
          <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
        </>
      )}
    </div>
  );
}
