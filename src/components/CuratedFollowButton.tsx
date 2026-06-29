import { useEffect, useState } from "react";
import { UserPlus, UserCheck } from "lucide-react";
import { toast } from "sonner";

interface Props {
  /** Stable key identifying the curated entity (e.g. "aryaxo") */
  followKey: string;
  displayName: string;
  size?: "sm" | "md";
  className?: string;
}

const STORAGE_PREFIX = "uply:curated-follow:";

function readState(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_PREFIX + key) === "1";
  } catch {
    return false;
  }
}

function writeState(key: string, val: boolean) {
  try {
    if (val) window.localStorage.setItem(STORAGE_PREFIX + key, "1");
    else window.localStorage.removeItem(STORAGE_PREFIX + key);
    // Notify other CuratedFollowButton instances in this tab
    window.dispatchEvent(
      new CustomEvent("curated-follow-change", { detail: { key, value: val } }),
    );
  } catch {
    /* ignore */
  }
}

export default function CuratedFollowButton({
  followKey,
  displayName,
  size = "sm",
  className = "",
}: Props) {
  const [following, setFollowing] = useState<boolean>(() => readState(followKey));

  useEffect(() => {
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent).detail as { key: string; value: boolean } | undefined;
      if (detail?.key === followKey) setFollowing(detail.value);
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_PREFIX + followKey) setFollowing(e.newValue === "1");
    };
    window.addEventListener("curated-follow-change", onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("curated-follow-change", onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, [followKey]);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = !following;
    setFollowing(next);
    writeState(followKey, next);
    toast.success(next ? `Following ${displayName}` : `Unfollowed ${displayName}`);
  };

  const sizeClasses =
    size === "md" ? "px-4 py-2 text-sm gap-1.5" : "px-3 py-1.5 text-xs gap-1";

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={following ? `Unfollow ${displayName}` : `Follow ${displayName}`}
      aria-pressed={following}
      className={`inline-flex items-center font-semibold rounded-lg transition-all duration-200 shrink-0 ${sizeClasses} ${
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
    </button>
  );
}
