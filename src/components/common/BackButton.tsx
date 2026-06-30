import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const SESSION_FLAG = "uply:back-button:visited";

/**
 * Floating top-left back button used across artist surfaces.
 *
 * Behavior:
 *  - On cold open / deep link / new tab: clicking goes to `fallback`.
 *  - After any in-app navigation (the user has visited at least one page
 *    in this tab): clicking goes back one history entry.
 *
 * Detection: we set a sessionStorage flag the first time any BackButton
 * mounts in this tab. If the flag was already set when this instance
 * mounts, we know the user navigated here from another in-app page.
 * `history.length` is unreliable on iOS/PWAs, so we don't use it.
 *
 * Accessibility:
 *  - Real <button> with `aria-label` (icon-only on small screens).
 *  - Visible focus-visible ring (keyboard users see where they are).
 *  - 44×44 minimum tap target on every viewport.
 */
export default function BackButton({
  fallback = "/",
  label = "Back",
  className = "",
}: {
  fallback?: string;
  label?: string;
  className?: string;
}) {
  const navigate = useNavigate();
  // True when this BackButton mounted on the very first page of the session,
  // meaning there's no meaningful in-app history to pop back to.
  const isEntryPage = useRef(false);

  useEffect(() => {
    try {
      const seen = window.sessionStorage.getItem(SESSION_FLAG) === "1";
      if (!seen) {
        window.sessionStorage.setItem(SESSION_FLAG, "1");
        isEntryPage.current = true;
      }
    } catch {
      // sessionStorage can throw in sandboxed contexts — fall back to
      // treating it as a deep link so we always use `fallback`.
      isEntryPage.current = true;
    }
  }, []);

  const onClick = () => {
    if (isEntryPage.current) {
      navigate(fallback, { replace: true });
      return;
    }
    try {
      navigate(-1);
    } catch {
      navigate(fallback, { replace: true });
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={
        "fixed top-3 left-3 z-50 inline-flex items-center justify-center gap-1.5 " +
        "h-11 min-w-[44px] px-3 rounded-full " +
        "bg-black/60 backdrop-blur-md border border-white/15 text-white " +
        "text-[12px] font-semibold " +
        "hover:bg-black/80 active:bg-black/90 transition-colors " +
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-white " +
        "focus-visible:ring-offset-2 focus-visible:ring-offset-black " +
        className
      }
    >
      <ArrowLeft className="w-4 h-4" aria-hidden="true" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
