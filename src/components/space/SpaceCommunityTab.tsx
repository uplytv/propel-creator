import { useState } from "react";
import { motion } from "framer-motion";
import { ThumbsUp, MessageCircle, Pin, PinOff, MoreHorizontal, Send, ArrowLeft, SlidersHorizontal, Megaphone, Flag, Trash2, Ban } from "lucide-react";
import ContentGate from "@/components/ContentGate";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { fetchProfileMap } from "@/lib/supabaseTyped";
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
import {
  useReportContent,
  useBanCommunityMember,
  useDeleteCommunityPost,
  useDeleteCommunityComment,
  type ReportContentType,
} from "@/hooks/useCommunityModeration";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import BlastComposer from "@/components/blast/BlastComposer";
import CommunityReportsSheet from "@/components/space/CommunityReportsSheet";

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
  const [showReports, setShowReports] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ type: ReportContentType; id: string } | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [banTarget, setBanTarget] = useState<{ userId: string; name: string } | null>(null);
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
  const reportContent = useReportContent();
  const banMember = useBanCommunityMember();
  const deletePost = useDeleteCommunityPost();

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

  const submitReport = async () => {
    if (!reportTarget) return;
    try {
      await reportContent.mutateAsync({
        creatorId,
        contentType: reportTarget.type,
        contentId: reportTarget.id,
        reason: reportReason,
      });
      toast.success("Report submitted", { description: "The community owner will review it." });
      setReportTarget(null);
      setReportReason("");
    } catch (err: any) {
      toast.error("Error", { description: err.message });
    }
  };

  const confirmBan = async () => {
    if (!banTarget) return;
    try {
      await banMember.mutateAsync({ targetUserId: banTarget.userId });
      toast.success(`${banTarget.name} has been banned from this community`);
    } catch (err: any) {
      toast.error("Error", { description: err.message });
    }
    setBanTarget(null);
  };

  const handleDeletePost = async (postId: string) => {
    try {
      await deletePost.mutateAsync(postId);
      toast.success("Post deleted");
    } catch (err: any) {
      toast.error("Error", { description: err.message });
    }
  };

  // Open a post from a report link (it may not be in the current page of posts)
  const handleJumpToPost = async (postId: string) => {
    const { data } = await supabase.from("community_posts").select("*").eq("id", postId).maybeSingle();
    if (!data) {
      toast.error("Content unavailable", { description: "This post may have been deleted." });
      return;
    }
    const profileMap = await fetchProfileMap([data.author_id]);
    setSelectedPost({
      ...data,
      author_name: profileMap.get(data.author_id)?.display_name || "Member",
      author_avatar: profileMap.get(data.author_id)?.avatar_url || null,
    });
  };

  return (
    <div className="px-4 pt-4">
      {/* Blast Button + Category Filters */}
      {isOwner && (
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-foreground">Community</span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowReports(true)}
              className="gap-1.5 text-xs"
            >
              <Flag className="w-3.5 h-3.5" />
              Reports
            </Button>
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
                    {user && (isOwner || post.author_id !== user.id) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            onClick={(e) => e.stopPropagation()}
                            aria-label="Post options"
                            className="p-1 rounded"
                          >
                            <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          {isOwner && (
                            <DropdownMenuItem
                              onClick={() => togglePin.mutate({ postId: post.id, isPinned: post.is_pinned })}
                            >
                              {post.is_pinned ? (
                                <><PinOff className="w-3.5 h-3.5 mr-2" /> Unpin post</>
                              ) : (
                                <><Pin className="w-3.5 h-3.5 mr-2" /> Pin post</>
                              )}
                            </DropdownMenuItem>
                          )}
                          {(isOwner || post.author_id === user.id) && (
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => handleDeletePost(post.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete post
                            </DropdownMenuItem>
                          )}
                          {isOwner && post.author_id !== creatorId && (
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() =>
                                setBanTarget({ userId: post.author_id, name: post.author_name || "This member" })
                              }
                            >
                              <Ban className="w-3.5 h-3.5 mr-2" /> Ban member
                            </DropdownMenuItem>
                          )}
                          {!isOwner && post.author_id !== user.id && (
                            <DropdownMenuItem
                              onClick={() => setReportTarget({ type: "post", id: post.id })}
                            >
                              <Flag className="w-3.5 h-3.5 mr-2" /> Report post
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
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
          onReportComment={(commentId) => setReportTarget({ type: "comment", id: commentId })}
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

      {/* Owner moderation queue */}
      {isOwner && (
        <CommunityReportsSheet
          open={showReports}
          onOpenChange={setShowReports}
          creatorId={creatorId}
          onJumpToPost={handleJumpToPost}
        />
      )}

      {/* Report dialog (posts + comments) */}
      <Dialog open={!!reportTarget} onOpenChange={(open) => { if (!open) { setReportTarget(null); setReportReason(""); } }}>
        <DialogContent className="border-border bg-card text-foreground max-w-sm">
          <DialogHeader>
            <DialogTitle>Report {reportTarget?.type === "comment" ? "comment" : "post"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              placeholder="What's wrong with this content? (optional)"
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              rows={3}
              className="border-0 bg-muted"
            />
            <Button
              onClick={submitReport}
              disabled={reportContent.isPending}
              className="w-full font-semibold"
            >
              Submit report
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Ban confirmation */}
      <AlertDialog open={!!banTarget} onOpenChange={(open) => { if (!open) setBanTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ban {banTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              They'll be removed from your community and won't be able to post, comment, or re-join.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBan}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Ban member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function PostDetailView({ post, creatorId, isOwner, onClose, onReportComment }: { post: any; creatorId: string; isOwner: boolean; onClose: () => void; onReportComment: (commentId: string) => void }) {
  const { user } = useAuth();
  const { data: comments = [], isLoading } = useCommunityComments(post.id);
  const createComment = useCreateComment();
  const deleteComment = useDeleteCommunityComment();
  const [commentText, setCommentText] = useState("");

  const handleComment = async () => {
    if (!commentText.trim()) return;
    await createComment.mutateAsync({ postId: post.id, body: commentText, creatorId });
    setCommentText("");
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteComment.mutateAsync({ commentId, postId: post.id });
      toast.success("Comment deleted");
    } catch (err: any) {
      toast.error("Error", { description: err.message });
    }
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
            <div key={c.id} className="flex gap-2 mb-4 group">
              {c.author_avatar ? (
                <img src={c.author_avatar} alt="" loading="lazy" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 bg-muted text-foreground">
                  {(c.author_name || "M").charAt(0)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-foreground">{c.author_name}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{c.body}</p>
              </div>
              {user && (
                <div className="flex items-start gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                  {(isOwner || c.author_id === user.id) && (
                    <button
                      onClick={() => handleDeleteComment(c.id)}
                      aria-label="Delete comment"
                      className="p-1 rounded text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {!isOwner && c.author_id !== user.id && (
                    <button
                      onClick={() => onReportComment(c.id)}
                      aria-label="Report comment"
                      className="p-1 rounded text-muted-foreground hover:text-foreground"
                    >
                      <Flag className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
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
