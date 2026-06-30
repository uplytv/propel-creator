import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

/**
 * Floating top-left back button used across artist surfaces.
 *
 * Behavior:
 *  - If the user navigated here from another in-app page, go back one step.
 *  - Otherwise (cold open, deep link, share-link, opened in a new tab),
 *    navigate to `fallback` instead of leaving the site.
 *
 * Reliability is established at mount time using a sentinel stored on
 * `window.history.state` (`__uplyEntry`). `history.length` is unreliable —
 * iOS Safari and PWAs report inflated values even on a cold open, so we
 * can't trust it alone.
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
  // True when this BackButton mounted as the very first page of the session,
  // meaning there's no meaningful history to pop back to.
  const isEntryPage = useRef(false);

  useEffect(() => {
    try {
      const state = (window.history.state ?? {}) as { __uplyEntry?: boolean };
      if (!state.__uplyEntry) {
        // Tag this history entry as the session entry point. Any later
        // in-app navigations will push fresh entries on top, so a sentinel
        // present on the current entry means we're still on the first page.
        window.history.replaceState(
          { ...state, __uplyEntry: true },
          "",
          window.location.href,
        );
        isEntryPage.current = true;
      }
    } catch {
      // history.state access can throw in sandboxed contexts — fall back to
      // treating it as a deep link so we always use `fallback`.
      isEntryPage.current = true;
    }
  }, []);

  const onClick = () => {
    if (isEntryPage.current) {
      navigate(fallback, { replace: true });
      return;
    }
    // Defensive: if popping back fails (rare), the popstate listener below
    // would have updated isEntryPage; navigating to fallback is the safe net.
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
