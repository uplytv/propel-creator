import { useState } from "react";
import { motion } from "framer-motion";
import { ThumbsUp, MessageCircle, Pin, MoreHorizontal, Send, ArrowLeft, SlidersHorizontal } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/context/AuthContext";
import {
  useCommunityPosts,
  useCreateCommunityPost,
  useToggleLike,
  useUserLikes,
  useCommunityComments,
  useCreateComment,
  useCommunityCategories,
  useTogglePin,
} from "@/hooks/useCreatorSpace";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface Props {
  creatorId: string;
  isOwner: boolean;
}

export default function SpaceCommunityTab({ creatorId, isOwner }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showComposer, setShowComposer] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);

  // Composer state
  const [postTitle, setPostTitle] = useState("");
  const [postBody, setPostBody] = useState("");
  const [postCategory, setPostCategory] = useState("general");

  const { data: posts = [], isLoading } = useCommunityPosts(creatorId, categoryFilter);
  const { data: categories = [] } = useCommunityCategories(creatorId);
  const { data: likedSet = new Set<string>() } = useUserLikes(posts.map((p: any) => p.id));
  const createPost = useCreateCommunityPost();
  const toggleLike = useToggleLike();
  const togglePin = useTogglePin();

  const handlePost = async () => {
    if (!postBody.trim()) return;
    try {
      await createPost.mutateAsync({ creator_id: creatorId, title: postTitle, body: postBody, category: postCategory });
      setPostTitle(""); setPostBody(""); setPostCategory("general");
      setShowComposer(false);
      toast({ title: "Post published!" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleLike = async (postId: string) => {
    if (!user) return;
    await toggleLike.mutateAsync({ postId, creatorId });
  };

  return (
    <div className="px-4 pt-4">
      {/* Category Filters */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-3">
        <button
          onClick={() => setCategoryFilter("all")}
          className="px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors"
          style={{
            background: categoryFilter === "all" ? "#00FF85" : "transparent",
            color: categoryFilter === "all" ? "#0A0A0A" : "#888",
            border: categoryFilter === "all" ? "none" : "1px solid #1e1e1e",
          }}
        >
          All
        </button>
        {categories.map((cat: any) => (
          <button
            key={cat.id}
            onClick={() => setCategoryFilter(cat.name)}
            className="px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors"
            style={{
              background: categoryFilter === cat.name ? "#00FF85" : "transparent",
              color: categoryFilter === cat.name ? "#0A0A0A" : "#888",
              border: categoryFilter === cat.name ? "none" : "1px solid #1e1e1e",
            }}
          >
            {cat.emoji} {cat.name}
          </button>
        ))}
        <button className="px-2 py-1.5 rounded-full" style={{ border: "1px solid #1e1e1e" }}>
          <SlidersHorizontal className="w-3.5 h-3.5" style={{ color: "#888" }} />
        </button>
      </div>

      {/* Post Composer Trigger */}
      {user && (
        <div
          className="flex items-center gap-3 p-3 rounded-lg mb-4 cursor-pointer"
          style={{ background: "#111111", border: "1px solid #1e1e1e" }}
          onClick={() => setShowComposer(true)}
        >
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: "#1e1e1e", color: "#fff" }}>
            {user.email?.charAt(0).toUpperCase() || "U"}
          </div>
          <span className="text-sm" style={{ color: "#888" }}>Write something...</span>
        </div>
      )}

      {/* Post Composer Modal */}
      <Dialog open={showComposer} onOpenChange={setShowComposer}>
        <DialogContent className="border-0" style={{ background: "#111111", color: "#fff" }}>
          <DialogHeader>
            <DialogTitle className="text-white">Create Post</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Title (optional)"
              value={postTitle}
              onChange={(e) => setPostTitle(e.target.value)}
              className="border-0 text-white placeholder:text-gray-500"
              style={{ background: "#1e1e1e" }}
            />
            <Textarea
              placeholder="What's on your mind?"
              value={postBody}
              onChange={(e) => setPostBody(e.target.value)}
              rows={4}
              className="border-0 text-white placeholder:text-gray-500"
              style={{ background: "#1e1e1e" }}
            />
            <div className="flex gap-2 flex-wrap">
              {["general", ...categories.map((c: any) => c.name)].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setPostCategory(cat)}
                  className="px-3 py-1 rounded-full text-xs font-medium capitalize"
                  style={{
                    background: postCategory === cat ? "#00FF85" : "#1e1e1e",
                    color: postCategory === cat ? "#0A0A0A" : "#888",
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
            <Button
              onClick={handlePost}
              disabled={createPost.isPending || !postBody.trim()}
              className="w-full font-semibold"
              style={{ background: "#00FF85", color: "#0A0A0A" }}
            >
              Post
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Posts */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 rounded-lg animate-pulse" style={{ background: "#111111" }}>
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full" style={{ background: "#1e1e1e" }} />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 rounded" style={{ background: "#1e1e1e" }} />
                  <div className="h-3 w-full rounded" style={{ background: "#1e1e1e" }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="p-12 text-center rounded-lg" style={{ background: "#111111" }}>
          <span className="text-4xl block mb-3">💬</span>
          <p className="font-semibold text-white mb-1">No posts yet</p>
          <p className="text-sm" style={{ color: "#888" }}>Be the first to share something!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post: any, i: number) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="p-4 rounded-lg cursor-pointer"
              style={{
                background: "#111111",
                border: "1px solid #1e1e1e",
                borderLeft: post.is_pinned ? "3px solid #00FF85" : "1px solid #1e1e1e",
              }}
              onClick={() => setSelectedPost(post)}
            >
              {/* Pin label */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {post.author_avatar ? (
                    <img src={post.author_avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "#1e1e1e", color: "#fff" }}>
                      {(post.author_name || "M").charAt(0)}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-white">{post.author_name}</span>
                      {post.author_id === creatorId && <span>⭐</span>}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs" style={{ color: "#888" }}>
                        {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                      </span>
                      {post.category !== "general" && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "#1e1e1e", color: "#00FF85" }}>
                          {post.category}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {post.is_pinned && (
                    <div className="flex items-center gap-1 text-xs" style={{ color: "#888" }}>
                      <Pin className="w-3 h-3" /> Pinned
                    </div>
                  )}
                  {isOwner && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePin.mutate({ postId: post.id, isPinned: post.is_pinned });
                      }}
                      className="p-1 rounded"
                    >
                      <MoreHorizontal className="w-4 h-4" style={{ color: "#888" }} />
                    </button>
                  )}
                </div>
              </div>

              {/* Content */}
              {post.title && <p className="text-white font-semibold text-base mb-1">{post.title}</p>}
              <p className="text-sm line-clamp-2" style={{ color: "#ccc" }}>{post.body}</p>

              {/* Actions */}
              <div className="flex items-center gap-4 mt-3">
                <button
                  onClick={(e) => { e.stopPropagation(); handleLike(post.id); }}
                  className="flex items-center gap-1 text-xs transition-colors"
                  style={{ color: (likedSet as Set<string>).has(post.id) ? "#00FF85" : "#888" }}
                >
                  <ThumbsUp className="w-3.5 h-3.5" /> {post.like_count}
                </button>
                <span className="flex items-center gap-1 text-xs" style={{ color: "#888" }}>
                  <MessageCircle className="w-3.5 h-3.5" /> {post.comment_count}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Full Post View */}
      {selectedPost && (
        <PostDetailView
          post={selectedPost}
          creatorId={creatorId}
          isOwner={isOwner}
          onClose={() => setSelectedPost(null)}
        />
      )}
    </div>
  );
}

function PostDetailView({ post, creatorId, isOwner, onClose }: { post: any; creatorId: string; isOwner: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const { data: comments = [], isLoading } = useCommunityComments(post.id);
  const createComment = useCreateComment();
  const [commentText, setCommentText] = useState("");

  const handleComment = async () => {
    if (!commentText.trim()) return;
    await createComment.mutateAsync({ postId: post.id, body: commentText, creatorId });
    setCommentText("");
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "#0A0A0A" }}>
      {/* Header */}
      <div className="flex items-center gap-3 p-4" style={{ borderBottom: "1px solid #1e1e1e" }}>
        <button onClick={onClose}><ArrowLeft className="w-5 h-5 text-white" /></button>
        <span className="text-sm font-semibold text-white">Post</span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex items-center gap-2 mb-3">
          {post.author_avatar ? (
            <img src={post.author_avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "#1e1e1e", color: "#fff" }}>
              {(post.author_name || "M").charAt(0)}
            </div>
          )}
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-white">{post.author_name}</span>
              {post.author_id === creatorId && <span>⭐</span>}
            </div>
            <span className="text-xs" style={{ color: "#888" }}>
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            </span>
          </div>
        </div>
        {post.title && <h2 className="text-lg font-bold text-white mb-2">{post.title}</h2>}
        <p className="text-sm leading-relaxed mb-6" style={{ color: "#ccc" }}>{post.body}</p>

        {/* Comments */}
        <div style={{ borderTop: "1px solid #1e1e1e" }} className="pt-4">
          <p className="text-xs font-semibold mb-3" style={{ color: "#888" }}>
            {comments.length} {comments.length === 1 ? "comment" : "comments"}
          </p>
          {comments.map((c: any) => (
            <div key={c.id} className="flex gap-2 mb-4">
              {c.author_avatar ? (
                <img src={c.author_avatar} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ background: "#1e1e1e", color: "#fff" }}>
                  {(c.author_name || "M").charAt(0)}
                </div>
              )}
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white">{c.author_name}</span>
                  <span className="text-[10px]" style={{ color: "#888" }}>
                    {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm" style={{ color: "#ccc" }}>{c.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Comment Input */}
      {user && (
        <div className="p-3 flex items-center gap-2 safe-area-bottom" style={{ borderTop: "1px solid #1e1e1e", background: "#0A0A0A" }}>
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ background: "#1e1e1e", color: "#fff" }}>
            {user.email?.charAt(0).toUpperCase() || "U"}
          </div>
          <input
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Add a comment..."
            className="flex-1 text-sm bg-transparent outline-none text-white placeholder:text-gray-500"
            onKeyDown={(e) => e.key === "Enter" && handleComment()}
          />
          <button onClick={handleComment} disabled={!commentText.trim()}>
            <Send className="w-4 h-4" style={{ color: commentText.trim() ? "#00FF85" : "#888" }} />
          </button>
        </div>
      )}
    </div>
  );
}
