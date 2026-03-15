import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Radio, Users, BookOpen, Briefcase, Star, Eye, Crown } from "lucide-react";
import FollowButton from "@/components/FollowButton";
import { type FeedItem } from "@/hooks/useDiscoveryFeed";

const typeConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  livestream: { label: "LIVE", icon: Radio, color: "bg-destructive text-destructive-foreground" },
  community: { label: "COMMUNITY", icon: Users, color: "bg-primary text-primary-foreground" },
  course: { label: "COURSE", icon: BookOpen, color: "bg-accent-green text-[#0A0A0A]" },
  service: { label: "Service", icon: Briefcase, color: "bg-secondary text-secondary-foreground" },
  creator: { label: "CREATOR", icon: Star, color: "bg-primary/80 text-primary-foreground" },
};

export default function FeedCard({ item, index }: { item: FeedItem; index: number }) {
  const navigate = useNavigate();
  const config = typeConfig[item.type] || typeConfig.creator;
  const TypeIcon = config.icon;

  const getDestination = () => {
    switch (item.type) {
      case "livestream":
        return item.playbackId ? `/stream/${item.id}` : `/creator/${encodeURIComponent(item.creatorName)}`;
      case "course":
        return `/community/${item.creatorId}/classroom`;
      case "community":
        return `/community/${item.creatorId}/community`;
      case "creator":
        return `/creator/${encodeURIComponent(item.creatorName)}`;
      default:
        return `/creator/${encodeURIComponent(item.creatorName)}`;
    }
  };

  const handleClick = () => navigate(getDestination());

  const handleJoin = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(getDestination());
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.35 }}
      onClick={handleClick}
      className="group relative rounded-2xl border border-border bg-card overflow-hidden cursor-pointer hover:border-primary/30 transition-all duration-300 hover:shadow-[var(--card-shadow-hover)]"
    >
      {/* Image / Preview Area */}
      <div className="relative aspect-[16/10] bg-secondary overflow-hidden">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.title}
            width={400}
            height={250}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/10">
            <TypeIcon className="w-10 h-10 text-primary/40" />
          </div>
        )}

        {/* Type badge */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${config.color}`}>
            {item.isLive && (
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            )}
            <TypeIcon className="w-3 h-3" />
            {config.label}
          </span>
        </div>

        {/* Viewer count for live */}
        {item.isLive && item.viewerCount > 0 && (
          <div className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-background/80 backdrop-blur-sm text-[10px] font-semibold text-foreground">
            <Eye className="w-3 h-3" />
            {item.viewerCount.toLocaleString()}
          </div>
        )}

        {/* Price tag */}
        {item.price > 0 && (
          <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md bg-background/90 backdrop-blur-sm text-xs font-bold text-foreground">
            ${item.price}
          </div>
        )}
        {item.price === 0 && item.type !== "creator" && item.type !== "livestream" && (
          <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md bg-primary/90 text-primary-foreground text-[10px] font-bold">
            FREE
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-card/90 to-transparent" />
      </div>

      {/* Content */}
      <div className="p-3 space-y-2">
        <div className="flex items-start gap-2.5">
          {/* Creator avatar */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/creator/${encodeURIComponent(item.creatorName)}`);
            }}
            className="shrink-0"
          >
            {item.creatorAvatar ? (
              <img
                src={item.creatorAvatar}
                alt={item.creatorName}
                width={36}
                height={36}
                className="w-9 h-9 rounded-full object-cover ring-2 ring-border group-hover:ring-primary/30 transition-all"
                loading="lazy"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary ring-2 ring-border">
                {item.creatorName.charAt(0)}
              </div>
            )}
          </button>

          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold leading-tight line-clamp-2 text-foreground">
              {item.title}
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
              {item.creatorName}
              {item.creatorType && (
                <>
                  <span className="text-border">·</span>
                  <span className="text-primary/70">{item.creatorType}</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Course-specific stats */}
        {item.type === "course" && (
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-0.5">
              <BookOpen className="w-3 h-3" />
              {item.memberCount} enrolled
            </span>
          </div>
        )}

        {/* Community-specific stats */}
        {item.type === "community" && item.memberCount > 0 && (
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-0.5">
              <Users className="w-3 h-3" />
              {item.memberCount.toLocaleString()} members
            </span>
          </div>
        )}

        {item.description && item.type !== "livestream" && item.type !== "course" && item.type !== "community" && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {item.description}
          </p>
        )}

        {/* Stats row */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            {item.type === "creator" && (
              <span className="flex items-center gap-0.5">
                <Crown className="w-3 h-3 text-primary" />
                Creator
              </span>
            )}
            {item.type === "creator" && item.memberCount > 0 && (
              <span className="flex items-center gap-0.5">
                <Users className="w-3 h-3" />
                {item.memberCount.toLocaleString()}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            <FollowButton targetUserId={item.creatorId} size="sm" />
            <button
              onClick={handleJoin}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:brightness-110 transition-all"
            >
              {item.type === "livestream" ? "Watch" :
               item.type === "creator" ? "View" :
               item.type === "course" ? "Enroll" : "Join"}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
