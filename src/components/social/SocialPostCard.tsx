import { useSocialPosts } from "@/hooks/useSocialPosts";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";

const REACTIONS = [
  { key: "fire", emoji: "🔥" },
  { key: "heart", emoji: "❤️" },
  { key: "eyes", emoji: "👀" },
  { key: "clap", emoji: "🙌" },
];

interface SocialPostCardProps {
  post: any;
}

export default function SocialPostCard({ post }: SocialPostCardProps) {
  const { reactToPost } = useSocialPosts();
  const profile = post.profiles;
  const event = post.events;
  const counts = post.reaction_counts || {};

  return (
    <div className="rounded-xl p-3" style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <Avatar className="w-9 h-9">
          <AvatarImage src={profile?.avatar_url} />
          <AvatarFallback className="bg-white/10 text-white text-xs">
            {(profile?.display_name || "U").slice(0, 2)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-sm font-semibold text-white truncate">{profile?.display_name}</span>
            <span className="text-xs text-white/30">@{profile?.username}</span>
          </div>
          <span className="text-[10px] text-white/40">{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
        </div>
      </div>

      {/* Event tag */}
      {event && (
        <span className="inline-block text-xs px-2 py-0.5 rounded-md mb-2" style={{ backgroundColor: "rgba(0,255,133,0.1)", color: "#00FF85" }}>
          → {event.title}
        </span>
      )}

      {post.post_type === "fit" && (
        <span className="inline-block text-xs px-2 py-0.5 rounded-md mb-2 ml-1" style={{ backgroundColor: "rgba(255,255,255,0.08)", color: "white" }}>
          FIT 👗
        </span>
      )}

      {/* Content */}
      {post.content && <p className="text-sm text-white/90 mb-2">{post.content}</p>}

      {/* Media */}
      {post.media_urls?.length > 0 && (
        <img src={post.media_urls[0]} className="w-full rounded-lg mb-2 max-h-80 object-cover" alt={`Post by ${profile?.display_name || "user"}`} loading="lazy" />
      )}

      {/* Reactions */}
      <div className="flex items-center gap-2 pt-1">
        {REACTIONS.map((r) => (
          <button
            key={r.key}
            onClick={() => reactToPost({ postId: post.id, reaction: r.key })}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors hover:bg-white/5"
          >
            <span>{r.emoji}</span>
            {(counts[r.key] || 0) > 0 && <span className="text-white/50">{counts[r.key]}</span>}
          </button>
        ))}
        <span className="ml-auto text-xs text-white/30">{post.comment_count || 0} comments</span>
      </div>
    </div>
  );
}
