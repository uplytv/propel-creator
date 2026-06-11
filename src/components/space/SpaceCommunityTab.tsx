import { useState } from "react";
import { motion } from "framer-motion";
import { ThumbsUp, MessageCircle, Pin, MoreHorizontal, Send, ArrowLeft, SlidersHorizontal, Megaphone } from "lucide-react";
import ContentGate from "@/components/ContentGate";
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
  useCreatorSpace,
} from "@/hooks/useCreatorSpace";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import BlastComposer from "@/components/blast/BlastComposer";

interface Props {
  creatorId: string;
  isOwner: boolean;
}

export default function SpaceCommunityTab({ creatorId, isOwner }: Props) {
  const { user } = useAuth();
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showComposer, setShowComposer] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [showBlastComposer, setShowBlastComposer] = useState(false);
  const { data: space } = useCreatorSpace(creatorId);

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
      toast.success("Post published!");
    } catch (err: any) {
      toast.error("Error", { description: err.message });
    }
  };

  const handleLike = async (postId: string) => {
    if (!user) return;
    await toggleLike.mutateAsync({ postId, creatorId });
  };

  return (
    <div className="px-4 pt-4">
      {/* Blast Button + Category Filters */}
      {isOwner && (
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-foreground">Community</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowBlastComposer(true)}
            className="gap-1.5 text-xs border-primary/40 text-primary hover:bg-primary/10"
          >
            <Megaphone className="w-3.5 h-3.5" />
            Blast
          </Button>
        </div>
      )}
      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-3">
        <button
          onClick={() => setCategoryFilter("all")}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
            categoryFilter === "all"
              ? "bg-primary text-primary-foreground"
              : "bg-transparent text-muted-foreground border border-border"
          }`}
        >
          All
        </button>
        {categories.map((cat: any) => (
          <button
            key={cat.id}
            onClick={() => setCategoryFilter(cat.name)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              categoryFilter === cat.name
                ? "bg-primary text-primary-foreground"
                : "bg-transparent text-muted-foreground border border-border"
            }`}
          >
            {cat.emoji} {cat.name}
          </button>
        ))}
        <button aria-label="Filter posts" className="px-2 py-1.5 rounded-full border border-border">
          <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>

      {/* Post Composer Trigger */}
      {user && (
        <div
          className="flex items-center gap-3 p-3 rounded-lg mb-4 cursor-pointer bg-card border border-border"
          onClick={() => setShowComposer(true)}
        >
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 bg-muted text-foreground">
            {user.email?.charAt(0).toUpperCase() || "U"}
          </div>
          <span className="text-sm text-muted-foreground">Write something...</span>
        </div>
      )}

      {/* Post Composer Modal */}
      <Dialog open={showComposer} onOpenChange={setShowComposer}>
        <DialogContent className="border-border bg-card text-foreground">
          <DialogHeader>
            <DialogTitle>Create Post</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Title (optional)"
              value={postTitle}
              onChange={(e) => setPostTitle(e.target.value)}
              className="border-0 bg-muted"
            />
            <Textarea
              placeholder="What's on your mind?"
              value={postBody}
              onChange={(e) => setPostBody(e.target.value)}
              rows={4}
              className="border-0 bg-muted"
            />
            <div className="flex gap-2 flex-wrap">
              {["general", ...categories.map((c: any) => c.name)].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setPostCategory(cat)}
                  className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
                    postCategory === cat
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <Button
              onClick={handlePost}
              disabled={createPost.isPending || !postBody.trim()}
              className="w-full font-semibold"
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
            <div key={i} className="p-4 rounded-lg animate-pulse bg-card">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 rounded bg-muted" />
                  <div className="h-3 w-full rounded bg-muted" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="p-12 text-center rounded-lg bg-card">
          <span className="text-4xl block mb-3">💬</span>
          <p className="font-semibold text-foreground mb-1">No posts yet</p>
          <p className="text-sm text-muted-foreground">Be the first to share something!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post: any, i: number) => (
            <ContentGate key={post.id} creatorId={creatorId} type="post" onJoinClick={() => {}}>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className={`p-4 rounded-lg cursor-pointer bg-card border border-border ${
                  post.is_pinned ? "border-l-[3px] border-l-primary" : ""
                }`}
                onClick={() => setSelectedPost(post)}
              >
                {/* Pin label */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {post.author_avatar ? (
                      <img src={post.author_avatar} alt="" loading="lazy" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold bg-muted text-foreground">
                        {(post.author_name || "M").charAt(0)}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-foreground">{post.author_name}</span>
                        {post.author_id === creatorId && <span>⭐</span>}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                        </span>
                        {post.category !== "general" && (
                          <span className="text-xs px-1.5 py-0.5 rounded-full bg-muted text-primary">
                            {post.category}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {post.is_pinned && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Pin className="w-3 h-3" /> Pinned
                      </div>
                    )}
                    {isOwner && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePin.mutate({ postId: post.id, isPinned: post.is_pinned });
                        }}
                        aria-label="Post options"
                        className="p-1 rounded"
                      >
                        <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Content */}
                {post.title && <p className="text-foreground font-semibold text-base mb-1">{post.title}</p>}
                <p className="text-sm line-clamp-2 text-muted-foreground">{post.body}</p>

                {/* Actions */}
                <div className="flex items-center gap-4 mt-3">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleLike(post.id); }}
                    className={`flex items-center gap-1 text-xs transition-colors ${
                      (likedSet as Set<string>).has(post.id) ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    <ThumbsUp className="w-3.5 h-3.5" /> {post.like_count}
                  </button>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MessageCircle className="w-3.5 h-3.5" /> {post.comment_count}
                  </span>
                </div>
              </motion.div>
            </ContentGate>
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

      {/* Blast Composer */}
      {isOwner && space && (
        <BlastComposer
          open={showBlastComposer}
          onClose={() => setShowBlastComposer(false)}
          creatorId={creatorId}
          spaceId={space.id}
          lastBlastSentAt={space.last_blast_sent_at}
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
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <button onClick={onClose} aria-label="Back"><ArrowLeft className="w-5 h-5 text-foreground" /></button>
        <span className="text-sm font-semibold text-foreground">Post</span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex items-center gap-2 mb-3">
          {post.author_avatar ? (
            <img src={post.author_avatar} alt="" loading="lazy" className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold bg-muted text-foreground">
              {(post.author_name || "M").charAt(0)}
            </div>
          )}
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-foreground">{post.author_name}</span>
              {post.author_id === creatorId && <span>⭐</span>}
            </div>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            </span>
          </div>
        </div>
        {post.title && <h2 className="text-lg font-bold text-foreground mb-2">{post.title}</h2>}
        <p className="text-sm leading-relaxed mb-6 text-muted-foreground">{post.body}</p>

        {/* Comments */}
        <div className="border-t border-border pt-4">
          <p className="text-xs font-semibold mb-3 text-muted-foreground">
            {comments.length} {comments.length === 1 ? "comment" : "comments"}
          </p>
          {comments.map((c: any) => (
            <div key={c.id} className="flex gap-2 mb-4">
              {c.author_avatar ? (
                <img src={c.author_avatar} alt="" loading="lazy" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 bg-muted text-foreground">
                  {(c.author_name || "M").charAt(0)}
                </div>
              )}
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-foreground">{c.author_name}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{c.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Comment Input */}
      {user && (
        <div className="p-3 flex items-center gap-2 safe-area-bottom border-t border-border bg-background">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 bg-muted text-foreground">
            {user.email?.charAt(0).toUpperCase() || "U"}
          </div>
          <input
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Add a comment..."
            className="flex-1 text-sm bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
            onKeyDown={(e) => e.key === "Enter" && handleComment()}
          />
          <button onClick={handleComment} disabled={!commentText.trim()} aria-label="Send comment">
            <Send className={`w-4 h-4 ${commentText.trim() ? "text-primary" : "text-muted-foreground"}`} />
          </button>
        </div>
      )}
    </div>
  );
}
