import { useEffect, useRef } from "react";
import { useSocialPosts } from "@/hooks/useSocialPosts";
import SocialPostCard from "./SocialPostCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";

interface SocialFeedProps {
  friendsOnly?: boolean;
}

export default function SocialFeed({ friendsOnly }: SocialFeedProps) {
  const { posts, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useSocialPosts({ friendsOnly });
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasNextPage) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: "600px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) {
    return (
      <div className="space-y-4 px-4 py-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-48 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <p className="text-muted-foreground text-sm">No posts yet. Be the first!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 px-4 py-3">
      {posts.map((post: any) => (
        <SocialPostCard key={post.id} post={post} />
      ))}

      <div ref={sentinelRef} className="h-1" />

      {isFetchingNextPage && (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {!hasNextPage && posts.length > 10 && (
        <p className="text-center text-xs text-muted-foreground py-6">
          You're all caught up ✨
        </p>
      )}
    </div>
  );
}
