import { useFollows } from "@/hooks/useFollows";
import { useAuth } from "@/context/AuthContext";
import { UserPlus, UserCheck } from "lucide-react";
import { motion } from "framer-motion";

interface FollowButtonProps {
  targetUserId: string;
  size?: "sm" | "md";
  className?: string;
}

export default function FollowButton({ targetUserId, size = "sm", className = "" }: FollowButtonProps) {
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
      whileTap={{ scale: 0.95 }}
      onClick={handleClick}
      className={`inline-flex items-center font-semibold rounded-lg transition-all duration-200 ${sizeClasses} ${
        following
          ? "bg-white/10 text-white hover:bg-red-500/20 hover:text-red-400 border border-white/10"
          : "bg-[#00FF85] text-[#0A0A0A] hover:brightness-110"
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
