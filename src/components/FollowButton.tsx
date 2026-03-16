import { forwardRef } from "react";
import { useFollows } from "@/hooks/useFollows";
import { useAuth } from "@/context/AuthContext";
import { UserPlus, UserCheck } from "lucide-react";
import { motion } from "framer-motion";

interface FollowButtonProps {
  targetUserId: string;
  size?: "sm" | "md";
  className?: string;
}

const FollowButton = forwardRef<HTMLButtonElement, FollowButtonProps>(
  ({ targetUserId, size = "sm", className = "" }, ref) => {
    const { user } = useAuth();
    const { isFollowing, follow, unfollow } = useFollows();

    // Don't show if not logged in or viewing own profile
    if (!user || user.id === targetUserId) return null;

    const following = isFollowing(targetUserId);

    const handleClick = async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (following) {
        await unfollow(targetUserId);
      } else {
        await follow(targetUserId);
      }
    };

    const sizeClasses = size === "md"
      ? "px-4 py-2 text-sm gap-1.5"
      : "px-3 py-1.5 text-xs gap-1";

    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: 0.95 }}
        onClick={handleClick}
        aria-label={following ? `Unfollow` : `Follow`}
        aria-pressed={following}
        className={`inline-flex items-center font-semibold rounded-lg transition-all duration-200 ${sizeClasses} ${
          following
            ? "bg-secondary text-foreground hover:bg-destructive/20 hover:text-destructive border border-border"
            : "bg-accent-green text-background hover:brightness-110"
        } ${className}`}
      >
        {following ? (
          <>
            <UserCheck className={size === "md" ? "w-4 h-4" : "w-3.5 h-3.5"} />
            Following
          </>
        ) : (
          <>
            <UserPlus className={size === "md" ? "w-4 h-4" : "w-3.5 h-3.5"} />
            Follow
          </>
        )}
      </motion.button>
    );
  }
);

FollowButton.displayName = "FollowButton";

export default FollowButton;
