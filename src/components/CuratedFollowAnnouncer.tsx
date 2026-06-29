import { useEffect, useState } from "react";

/**
 * Singleton polite aria-live region that announces follow/unfollow state
 * changes from any CuratedFollowButton on the page. Mounted once at the
 * app root so screen reader users hear a single, consistent confirmation
 * regardless of which results view (Search page vs global engine results)
 * triggered the change.
 */
export default function CuratedFollowAnnouncer() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent).detail as
        | { key: string; value: boolean; displayName?: string }
        | undefined;
      if (!detail) return;
      const name = detail.displayName || detail.key;
      // Clear first so identical consecutive messages still re-announce.
      setMessage("");
      // Tiny delay so the live region observes the change as a new mutation.
      window.setTimeout(() => {
        setMessage(detail.value ? `Now following ${name}` : `Unfollowed ${name}`);
      }, 30);
    };
    window.addEventListener("curated-follow-change", onChange);
    return () => window.removeEventListener("curated-follow-change", onChange);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      data-testid="curated-follow-announcer"
      className="sr-only"
    >
      {message}
    </div>
  );
}
