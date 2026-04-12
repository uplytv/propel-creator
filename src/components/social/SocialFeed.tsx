import { useSocialPosts } from "@/hooks/useSocialPosts";
import SocialPostCard from "./SocialPostCard";
import { Skeleton } from "@/components/ui/skeleton";

interface SocialFeedProps {
  friendsOnly?: boolean;
}

export default function SocialFeed({ friendsOnly }: SocialFeedProps) {
  const { posts, isLoading } = useSocialPosts({ friendsOnly });

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
        <p className="text-white/50 text-sm">No posts yet. Be the first!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 px-4 py-3">
      {posts.map((post: any) => (
        <SocialPostCard key={post.id} post={post} />
      ))}
    </div>
  );
}
