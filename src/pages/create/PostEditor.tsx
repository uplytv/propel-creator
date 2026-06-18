import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ImagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import {
  useCommunityCategories,
  useCreateCommunityPost,
  useEnsureSpace,
} from "@/hooks/useCreatorSpace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

/**
 * Editor for POST mode — write a TEXT post to your community feed.
 * Video / short / story capture still flows through /camera; only the
 * text path lives here so "write a post" never forces the camera.
 */
export default function PostEditor() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // The creator writing to their own community is the logged-in user.
  const creatorId = user?.id;

  const ensureSpace = useEnsureSpace();
  const createPost = useCreateCommunityPost();
  const { data: categories = [] } = useCommunityCategories(creatorId);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("general");

  // Make sure the creator has a space before they post into it.
  useEffect(() => {
    if (user && !ensureSpace.isPending && !ensureSpace.isSuccess) {
      ensureSpace.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const isPublishing = createPost.isPending;

  const handlePost = async () => {
    if (!body.trim() || !creatorId) return;
    try {
      await createPost.mutateAsync({
        creator_id: creatorId,
        title: title.trim(),
        body: body.trim(),
        category,
      });
      toast.success("Post published!");
      navigate(`/space/${creatorId}/community`, { replace: true });
    } catch (err: any) {
      toast.error("Failed to post", {
        description: err instanceof Error ? err.message : "Try again",
      });
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-background text-foreground">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <button onClick={() => navigate(-1)} aria-label="Back" className="text-muted-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-sm font-semibold tracking-wide">New post</h1>
        <Button
          size="sm"
          onClick={handlePost}
          disabled={isPublishing || !body.trim()}
          className="rounded-full px-4 font-bold"
        >
          {isPublishing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Post"}
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        <p className="mb-3 text-xs font-medium text-muted-foreground">
          Post to your community
        </p>

        <div className="space-y-3">
          <Input
            placeholder="Title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="border-0 bg-muted"
          />
          <Textarea
            placeholder="What's on your mind?"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            autoFocus
            className="border-0 bg-muted"
          />

          <div className="flex flex-wrap gap-2">
            {["general", ...categories.map((c: any) => c.name)].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
                  category === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Secondary option: attach a photo/video via the camera flow. */}
          <button
            onClick={() => navigate("/camera?mode=POST")}
            className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ImagePlus className="h-4 w-4" />
            Add photo or video
          </button>
        </div>
      </div>
    </div>
  );
}
