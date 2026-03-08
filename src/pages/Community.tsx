import { useState } from "react";
import { motion } from "framer-motion";
import { Heart, MessageCircle, Image, Send, Trophy, Users, TrendingUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import AppLayout from "@/components/layout/AppLayout";
import { usePosts, useCreatePost, useLikePost, useDeletePost } from "@/hooks/usePosts";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

const filters = ["All Posts", "Announcements", "Questions", "Wins"];

const categoryMap: Record<string, string> = {
  announcement: "📢 Announcement",
  question: "❓ Question",
  win: "🏆 Win",
  general: "",
};

export default function Community() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [filter, setFilter] = useState("All Posts");
  const [composeFocused, setComposeFocused] = useState(false);
  const [composeText, setComposeText] = useState("");
  const [composeCategory, setComposeCategory] = useState("general");

  const { data: posts = [], isLoading } = usePosts(filter);
  const createPost = useCreatePost();
  const likePost = useLikePost();
  const deletePost = useDeletePost();

  const handlePost = async () => {
    if (!composeText.trim()) return;
    try {
      await createPost.mutateAsync({ content: composeText, category: composeCategory });
      setComposeText("");
      setComposeCategory("general");
      setComposeFocused(false);
      toast({ title: "Post published!" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleLike = async (postId: string) => {
    try {
      await likePost.mutateAsync(postId);
    } catch {
      // silent
    }
  };

  const handleDelete = async (postId: string) => {
    try {
      await deletePost.mutateAsync(postId);
      toast({ title: "Post deleted" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main Feed */}
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold mb-6">Community</h1>

            {/* Compose */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4 mb-6">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {user?.email?.charAt(0).toUpperCase() || "U"}
                </div>
                <div className="flex-1">
                  <textarea
                    placeholder="Share something with your community…"
                    className="w-full bg-transparent text-sm resize-none outline-none placeholder:text-muted-foreground min-h-[40px]"
                    rows={composeFocused ? 3 : 1}
                    value={composeText}
                    onChange={(e) => setComposeText(e.target.value)}
                    onFocus={() => setComposeFocused(true)}
                  />
                  {composeFocused && (
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                      <div className="flex gap-1">
                        {["general", "announcement", "question", "win"].map((cat) => (
                          <button
                            key={cat}
                            onClick={() => setComposeCategory(cat)}
                            className={`text-xs px-2 py-1 rounded-md capitalize transition-colors ${composeCategory === cat ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                      <Button size="sm" onClick={handlePost} disabled={createPost.isPending || !composeText.trim()}>
                        <Send className="w-3.5 h-3.5 mr-1" /> Post
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Filters */}
            <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-none">
              {filters.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`text-sm px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${filter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
                >
                  {f === "Wins" && <span className="mr-1">🏆</span>}
                  {f}
                </button>
              ))}
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="glass-card p-5 animate-pulse">
                    <div className="flex gap-3">
                      <div className="w-10 h-10 rounded-full bg-secondary" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-32 bg-secondary rounded" />
                        <div className="h-3 w-full bg-secondary rounded" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : posts.length === 0 ? (
              <div className="glass-card p-12 text-center">
                <span className="text-5xl mb-4 block">💬</span>
                <h3 className="text-xl font-bold mb-2">Your community is waiting to meet you.</h3>
                <p className="text-muted-foreground mb-6">Post your first introduction and start building connections.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {posts.map((p: any, i: number) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className={`glass-card p-5 ${p.category === "win" ? "border-primary/20" : ""}`}
                  >
                    <div className="flex items-start gap-3">
                      {p.author_avatar ? (
                        <img src={p.author_avatar} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-sm font-bold flex-shrink-0">
                          {(p.author_name || "C").charAt(0)}
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm">{p.author_name}</span>
                          {categoryMap[p.category] && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">{categoryMap[p.category]}</span>
                          )}
                          <span className="text-xs text-muted-foreground ml-auto">
                            {formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm mt-2 leading-relaxed">{p.content}</p>
                        <div className="flex items-center gap-4 mt-3">
                          <button onClick={() => handleLike(p.id)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                            <Heart className="w-3.5 h-3.5" /> {p.like_count}
                          </button>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MessageCircle className="w-3.5 h-3.5" /> {p.comment_count}
                          </span>
                          {user?.id === p.user_id && (
                            <button onClick={() => handleDelete(p.id)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors ml-auto">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="hidden lg:block w-80 space-y-4">
            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Community Info</h3>
              <p className="text-sm text-muted-foreground">Share posts, ask questions, celebrate wins, and connect with fellow creators.</p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
