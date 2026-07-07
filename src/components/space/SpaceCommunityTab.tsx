import { useState, useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { ThumbsUp, MessageCircle, Pin, PinOff, MoreHorizontal, Send, ArrowLeft, SlidersHorizontal, Megaphone, Flag, Trash2, Ban, ImagePlus, BarChart3, X, Search, Loader2, Heart, CornerDownRight, Check, Lock } from "lucide-react";
import ContentGate from "@/components/ContentGate";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { fetchProfileMap } from "@/lib/supabaseTyped";
import {
  COMMUNITY_COMMENT_MAX,
  COMMUNITY_POST_BODY_MAX,
  COMMUNITY_POST_TITLE_MAX,
  useCommunityPosts,
  useToggleLike,
  useUserLikes,
  useCommunityComments,
  useCreateComment,
  useCommunityCategories,
  useTogglePin,
  useCreatorSpace,
} from "@/hooks/useCreatorSpace";
import {
  useCreatePostWithExtras,
  usePostPolls,
  useVotePoll,
  useCreateReply,
  useCommentLikes,
  useToggleCommentLike,
  useSearchCommunityPosts,
  POLL_MIN_OPTIONS,
  POLL_MAX_OPTIONS,
  POLL_OPTION_MAX,
  type PostPoll,
} from "@/hooks/useCommunityDepth";
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
import MemberXPBadge, { getLevel } from "@/components/space/MemberXPBadge";
import { useMemberPointTotals } from "@/hooks/useMemberLevels";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";

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
  const [postImageUrl, setPostImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [pollEnabled, setPollEnabled] = useState(false);
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);

  // Search state (client-side filter instantly; server ilike once debounced)
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);
  const searchActive = debouncedSearch.trim().length >= 2;

  // Lightbox for post images
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const { data: posts = [], isLoading } = useCommunityPosts(creatorId, categoryFilter);
  const { data: searchResults, isLoading: searchLoading } = useSearchCommunityPosts(
    creatorId,
    searchActive ? debouncedSearch : ""
  );

  // While the server ilike query is in flight, filter loaded posts locally.
  const clientFiltered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return posts;
    return posts.filter(
      (p: any) =>
        (p.title || "").toLowerCase().includes(q) || (p.body || "").toLowerCase().includes(q)
    );
  }, [posts, debouncedSearch]);
  const displayPosts = searchActive ? (searchResults ?? clientFiltered) : posts;

  const { data: categories = [] } = useCommunityCategories(creatorId);

  // Level badges: ONE member_points query per feed page for all visible authors.
  const feedAuthorIds = useMemo(
    () => [...new Set(displayPosts.map((p: any) => p.author_id as string))],
    [displayPosts]
  );
  const { data: authorTotals } = useMemberPointTotals(creatorId, feedAuthorIds);

  // "Who can post" gate — client mirror of the community_posts INSERT policy
  // (public.meets_min_post_level, 20260707040000_levels_digest.sql).
  const minPostLevel = Math.min(5, Math.max(1, Number((space as any)?.min_post_level ?? 1)));
  const { data: myTotals } = useMemberPointTotals(creatorId, user ? [user.id] : []);
  const myLevel = getLevel(myTotals?.get(user?.id ?? "") ?? 0).levelNum;
  const canPost = isOwner || minPostLevel <= 1 || myLevel >= minPostLevel;

  const { data: likedSet = new Set<string>() } = useUserLikes(displayPosts.map((p: any) => p.id));
  const { data: pollMap = {} } = usePostPolls(displayPosts.map((p: any) => p.id));
  const createPost = useCreatePostWithExtras();
  const toggleLike = useToggleLike();
  const togglePin = useTogglePin();
  const reportContent = useReportContent();
  const banMember = useBanCommunityMember();
  const deletePost = useDeleteCommunityPost();

  // Attach an image to the composer — same covers-bucket upload pattern as
  // the space media gallery (SpaceAboutTab).
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Images only", { description: "Please choose an image file." });
      return;
    }
    setUploadingImage(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      let activeSession = sessionData.session;
      if (!activeSession) {
        const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) throw refreshError;
        activeSession = refreshed.session;
      }
      if (!activeSession?.user?.id) throw new Error("Please sign in to upload.");

      const uid = activeSession.user.id;
      const rawExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const ext = rawExt.replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `${uid}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("covers")
        .upload(path, file, { upsert: true, contentType: file.type || undefined });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("covers").getPublicUrl(path);
      setPostImageUrl(urlData.publicUrl);
    } catch (err: any) {
      toast.error("Upload failed", { description: err.message });
    } finally {
      setUploadingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  const handlePost = async () => {
    if (!postBody.trim()) return;
    const cleanedPollOptions = pollEnabled
      ? pollOptions.map((o) => o.trim()).filter(Boolean)
      : [];
    if (pollEnabled && cleanedPollOptions.length < POLL_MIN_OPTIONS) {
      toast.error("Polls need at least 2 options");
      return;
    }
    try {
      await createPost.mutateAsync({
        creator_id: creatorId,
        title: postTitle,
        body: postBody,
        category: postCategory,
        image_url: postImageUrl,
        poll_options: cleanedPollOptions,
      });
      setPostTitle(""); setPostBody(""); setPostCategory("general");
      setPostImageUrl(null); setPollEnabled(false); setPollOptions(["", ""]);
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
            <MinPostLevelSelect creatorId={creatorId} value={minPostLevel} />
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
      {/* Post search — filters loaded posts instantly, then swaps in a
          server-side ilike search (title/body, scoped to this creator) */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg mb-3 bg-card border border-border">
        <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search posts..."
          className="flex-1 min-w-0 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
        />
        {searchActive && searchLoading && (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground flex-shrink-0" />
        )}
        {searchInput && (
          <button onClick={() => setSearchInput("")} aria-label="Clear search" className="flex-shrink-0">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>

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

      {/* Post Composer Trigger — disabled with a level hint when the member
          is under the space's min_post_level (server-enforced by RLS) */}
      {user && (canPost ? (
        <div
          className="flex items-center gap-3 p-3 rounded-lg mb-4 cursor-pointer bg-card border border-border"
          onClick={() => setShowComposer(true)}
        >
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 bg-muted text-foreground">
            {user.email?.charAt(0).toUpperCase() || "U"}
          </div>
          <span className="text-sm text-muted-foreground">Write something...</span>
        </div>
      ) : (
        <div
          aria-disabled="true"
          className="flex items-center gap-3 p-3 rounded-lg mb-4 bg-card border border-border opacity-70 cursor-not-allowed"
        >
          <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 bg-muted text-muted-foreground">
            <Lock className="w-4 h-4" />
          </div>
          <span className="text-sm text-muted-foreground">
            Reach Level {minPostLevel} to post — you're Level {myLevel}. Earn points by commenting, completing lessons, and attending events.
          </span>
        </div>
      ))}

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
              maxLength={COMMUNITY_POST_TITLE_MAX}
              onChange={(e) => setPostTitle(e.target.value)}
              className="border-0 bg-muted"
            />
            <Textarea
              placeholder="What's on your mind?"
              value={postBody}
              maxLength={COMMUNITY_POST_BODY_MAX}
              onChange={(e) => setPostBody(e.target.value)}
              rows={4}
              className="border-0 bg-muted"
            />

            {/* Attached image preview */}
            {postImageUrl && (
              <div className="relative">
                <img src={postImageUrl} alt="" className="w-full max-h-56 object-cover rounded-lg border border-border" />
                <button
                  onClick={() => setPostImageUrl(null)}
                  aria-label="Remove image"
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center"
                >
                  <X className="w-3.5 h-3.5 text-foreground" />
                </button>
              </div>
            )}

            {/* Poll builder (2–6 options) */}
            {pollEnabled && (
              <div className="space-y-2 p-3 rounded-lg border border-border">
                <p className="text-xs font-semibold text-foreground">Poll options</p>
                {pollOptions.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={opt}
                      maxLength={POLL_OPTION_MAX}
                      placeholder={`Option ${i + 1}`}
                      onChange={(e) =>
                        setPollOptions(pollOptions.map((o, j) => (j === i ? e.target.value : o)))
                      }
                      className="border-0 bg-muted h-8 text-sm"
                    />
                    {pollOptions.length > POLL_MIN_OPTIONS && (
                      <button
                        onClick={() => setPollOptions(pollOptions.filter((_, j) => j !== i))}
                        aria-label={`Remove option ${i + 1}`}
                      >
                        <X className="w-4 h-4 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                ))}
                {pollOptions.length < POLL_MAX_OPTIONS && (
                  <button
                    onClick={() => setPollOptions([...pollOptions, ""])}
                    className="text-xs text-primary font-medium"
                  >
                    + Add option
                  </button>
                )}
              </div>
            )}

            {/* Attachment toggles */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => imageInputRef.current?.click()}
                disabled={uploadingImage}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                {uploadingImage ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ImagePlus className="w-3.5 h-3.5" />
                )}
                Photo
              </button>
              <button
                onClick={() => setPollEnabled(!pollEnabled)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  pollEnabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                Poll
              </button>
            </div>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageSelect}
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
              disabled={createPost.isPending || !postBody.trim() || uploadingImage}
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
      ) : displayPosts.length === 0 ? (
        <div className="p-12 text-center rounded-lg bg-card">
          <span className="text-4xl block mb-3">💬</span>
          <p className="font-semibold text-foreground mb-1">
            {searchActive ? "No posts match your search" : "No posts yet"}
          </p>
          <p className="text-sm text-muted-foreground">
            {searchActive ? "Try a different keyword." : "Be the first to share something!"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayPosts.map((post: any, i: number) => (
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
                        <MemberXPBadge xp={authorTotals?.get(post.author_id) ?? 0} />
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

                {/* Image attachment */}
                {post.image_url && (
                  <img
                    src={post.image_url}
                    alt=""
                    loading="lazy"
                    onClick={(e) => { e.stopPropagation(); setLightboxUrl(post.image_url); }}
                    className="mt-3 w-full max-h-80 object-cover rounded-lg border border-border cursor-zoom-in"
                  />
                )}

                {/* Poll (live results after voting) */}
                {(pollMap as Record<string, PostPoll>)[post.id] && (
                  <div onClick={(e) => e.stopPropagation()}>
                    <PollBlock poll={(pollMap as Record<string, PostPoll>)[post.id]} />
                  </div>
                )}

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
          onImageClick={(url) => setLightboxUrl(url)}
        />
      )}

      {/* Image lightbox (feed + detail view) */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <img src={lightboxUrl} alt="" className="max-w-full max-h-full object-contain" />
          <button className="absolute top-4 right-4 p-2" aria-label="Close image">
            <X className="w-6 h-6 text-white" />
          </button>
        </div>
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

/** Owner-only "Who can post" control — writes creator_spaces.min_post_level
 *  (enforced server-side by the community_posts INSERT policy). */
function MinPostLevelSelect({ creatorId, value }: { creatorId: string; value: number }) {
  const queryClient = useQueryClient();
  const updateMinLevel = useMutation({
    mutationFn: async (level: number) => {
      const { error } = await (supabase as any)
        .from("creator_spaces")
        .update({ min_post_level: level })
        .eq("creator_id", creatorId);
      if (error) throw error;
    },
    onSuccess: (_data, level) => {
      queryClient.invalidateQueries({ queryKey: ["creator-space", creatorId] });
      toast.success(level <= 1 ? "Everyone can post" : `Members need Level ${level}+ to post`);
    },
    onError: (err: any) => toast.error("Couldn't update", { description: err.message }),
  });

  return (
    <Select
      value={String(value)}
      onValueChange={(v) => updateMinLevel.mutate(Number(v))}
      disabled={updateMinLevel.isPending}
    >
      <SelectTrigger className="h-8 w-auto gap-1.5 text-xs" aria-label="Who can post">
        <SelectValue placeholder="Who can post" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="1">Everyone can post</SelectItem>
        <SelectItem value="2">Level 2+ can post</SelectItem>
        <SelectItem value="3">Level 3+ can post</SelectItem>
        <SelectItem value="4">Level 4+ can post</SelectItem>
        <SelectItem value="5">Level 5+ can post</SelectItem>
      </SelectContent>
    </Select>
  );
}

/** Poll with live result bars — options before voting, results after. */
function PollBlock({ poll }: { poll: PostPoll }) {
  const { user } = useAuth();
  const votePoll = useVotePoll();
  const voted = poll.myVote !== null;

  const handleVote = (i: number) => {
    if (!user) {
      toast.error("Sign in to vote");
      return;
    }
    if (poll.myVote === i) return;
    votePoll.mutate(
      { pollId: poll.id, postId: poll.post_id, optionIndex: i },
      {
        onError: (err: any) =>
          toast.error("Couldn't vote", {
            description: String(err?.message || "").toLowerCase().includes("row-level security")
              ? "Join this community to vote in polls."
              : err.message,
          }),
      }
    );
  };

  return (
    <div className="mt-3 space-y-1.5">
      {poll.options.map((opt, i) => {
        const count = poll.counts[i] || 0;
        const pct = poll.total > 0 ? Math.round((count / poll.total) * 100) : 0;
        const isMine = poll.myVote === i;
        return voted ? (
          <button
            key={i}
            onClick={() => handleVote(i)}
            className={`relative w-full text-left px-3 py-2 rounded-lg border overflow-hidden text-xs font-medium ${
              isMine ? "border-primary" : "border-border"
            }`}
          >
            <div
              className={`absolute inset-y-0 left-0 transition-all ${isMine ? "bg-primary/20" : "bg-muted"}`}
              style={{ width: `${pct}%` }}
            />
            <div className="relative flex items-center justify-between gap-2">
              <span className="text-foreground flex items-center gap-1.5">
                {isMine && <Check className="w-3 h-3 text-primary" />}
                {opt}
              </span>
              <span className="text-muted-foreground">{pct}%</span>
            </div>
          </button>
        ) : (
          <button
            key={i}
            onClick={() => handleVote(i)}
            className="w-full text-left px-3 py-2 rounded-lg border border-border text-xs font-medium text-foreground hover:border-primary/50 hover:bg-muted/50 transition-colors"
          >
            {opt}
          </button>
        );
      })}
      <p className="text-[10px] text-muted-foreground">
        {poll.total} {poll.total === 1 ? "vote" : "votes"}
        {voted ? " · tap another option to change your vote" : ""}
      </p>
    </div>
  );
}

function PostDetailView({ post, creatorId, isOwner, onClose, onReportComment, onImageClick }: { post: any; creatorId: string; isOwner: boolean; onClose: () => void; onReportComment: (commentId: string) => void; onImageClick?: (url: string) => void }) {
  const { user } = useAuth();
  const { data: comments = [], isLoading } = useCommunityComments(post.id);
  const createComment = useCreateComment();
  const createReply = useCreateReply();
  const deleteComment = useDeleteCommunityComment();
  const [commentText, setCommentText] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);

  // Poll on this post (detail view)
  const { data: detailPollMap = {} } = usePostPolls([post.id]);
  const detailPoll = (detailPollMap as Record<string, PostPoll>)[post.id];

  // Comment likes
  const commentIds = comments.map((c: any) => c.id);
  const { data: commentLikes = { counts: {}, mine: new Set<string>() } } = useCommentLikes(post.id, commentIds);
  const toggleCommentLike = useToggleCommentLike();

  // Level badges: ONE member_points query for the post author + all comment authors.
  const detailAuthorIds = useMemo(
    () => [...new Set([post.author_id, ...comments.map((c: any) => c.author_id as string)])],
    [post.author_id, comments]
  );
  const { data: detailTotals } = useMemberPointTotals(creatorId, detailAuthorIds);

  // One-level threading (Skool-style): top-level comments + their replies
  const topLevelComments = comments.filter((c: any) => !c.parent_id);
  const repliesFor = (id: string) => comments.filter((c: any) => c.parent_id === id);

  const handleComment = async () => {
    if (!commentText.trim()) return;
    try {
      if (replyTo) {
        await createReply.mutateAsync({ postId: post.id, parentId: replyTo.id, body: commentText, creatorId });
      } else {
        await createComment.mutateAsync({ postId: post.id, body: commentText, creatorId });
      }
      setCommentText("");
      setReplyTo(null);
    } catch (err: any) {
      toast.error("Error", { description: err.message });
    }
  };

  const handleToggleCommentLike = (commentId: string) => {
    if (!user) {
      toast.error("Sign in to like comments");
      return;
    }
    toggleCommentLike.mutate(
      { commentId, postId: post.id, liked: commentLikes.mine.has(commentId) },
      {
        onError: (err: any) =>
          toast.error("Couldn't like comment", {
            description: String(err?.message || "").toLowerCase().includes("row-level security")
              ? "Join this community to like comments."
              : err.message,
          }),
      }
    );
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
              <MemberXPBadge xp={detailTotals?.get(post.author_id) ?? 0} />
              {post.author_id === creatorId && <span>⭐</span>}
            </div>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            </span>
          </div>
        </div>
        {post.title && <h2 className="text-lg font-bold text-foreground mb-2">{post.title}</h2>}
        <p className="text-sm leading-relaxed mb-4 text-muted-foreground">{post.body}</p>

        {/* Image attachment */}
        {post.image_url && (
          <img
            src={post.image_url}
            alt=""
            loading="lazy"
            onClick={() => onImageClick?.(post.image_url)}
            className="w-full max-h-[420px] object-contain bg-muted rounded-lg mb-4 cursor-zoom-in"
          />
        )}

        {/* Poll */}
        {detailPoll && (
          <div className="mb-6">
            <PollBlock poll={detailPoll} />
          </div>
        )}

        {/* Comments — one-level threading, likes, moderation preserved */}
        <div className="border-t border-border pt-4">
          <p className="text-xs font-semibold mb-3 text-muted-foreground">
            {comments.length} {comments.length === 1 ? "comment" : "comments"}
          </p>
          {topLevelComments.map((c: any) => {
            const renderComment = (comment: any) => (
              <div className="flex gap-2 group">
                {comment.author_avatar ? (
                  <img src={comment.author_avatar} alt="" loading="lazy" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 bg-muted text-foreground">
                    {(comment.author_name || "M").charAt(0)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-foreground">{comment.author_name}</span>
                    <MemberXPBadge xp={detailTotals?.get(comment.author_id) ?? 0} />
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{comment.body}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <button
                      onClick={() => handleToggleCommentLike(comment.id)}
                      aria-label="Like comment"
                      className={`flex items-center gap-1 text-[11px] transition-colors ${
                        commentLikes.mine.has(comment.id)
                          ? "text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Heart className={`w-3 h-3 ${commentLikes.mine.has(comment.id) ? "fill-current" : ""}`} />
                      {(commentLikes.counts[comment.id] || 0) > 0 && commentLikes.counts[comment.id]}
                    </button>
                    {user && (
                      <button
                        onClick={() => setReplyTo({ id: comment.parent_id ?? comment.id, name: comment.author_name || "Member" })}
                        className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Reply
                      </button>
                    )}
                  </div>
                </div>
                {user && (
                  <div className="flex items-start gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    {(isOwner || comment.author_id === user.id) && (
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        aria-label="Delete comment"
                        className="p-1 rounded text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {!isOwner && comment.author_id !== user.id && (
                      <button
                        onClick={() => onReportComment(comment.id)}
                        aria-label="Report comment"
                        className="p-1 rounded text-muted-foreground hover:text-foreground"
                      >
                        <Flag className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
            return (
              <div key={c.id} className="mb-4">
                {renderComment(c)}
                {repliesFor(c.id).map((r: any) => (
                  <div key={r.id} className="mt-3 ml-9 pl-3 border-l-2 border-border">
                    {renderComment(r)}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Comment Input */}
      {user && (
        <div className="safe-area-bottom border-t border-border bg-background">
          {replyTo && (
            <div className="px-3 pt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <CornerDownRight className="w-3 h-3" /> Replying to {replyTo.name}
              </span>
              <button onClick={() => setReplyTo(null)} aria-label="Cancel reply">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <div className="p-3 flex items-center gap-2">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 bg-muted text-foreground">
              {user.email?.charAt(0).toUpperCase() || "U"}
            </div>
            <input
              value={commentText}
              maxLength={COMMUNITY_COMMENT_MAX}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={replyTo ? `Reply to ${replyTo.name}...` : "Add a comment..."}
              className="flex-1 text-sm bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
              onKeyDown={(e) => e.key === "Enter" && handleComment()}
            />
            <button onClick={handleComment} disabled={!commentText.trim()} aria-label="Send comment">
              <Send className={`w-4 h-4 ${commentText.trim() ? "text-primary" : "text-muted-foreground"}`} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
