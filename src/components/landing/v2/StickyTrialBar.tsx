import { useEffect, useState } from "react";

/** One primary action after the hero scrolls away. Mobile only. */
export default function StickyTrialBar({ onStart }: { onStart: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 480);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 py-3 md:hidden">
      <button
        type="button"
        onClick={onStart}
        className="btn-primary-glow h-12 w-full rounded-md text-sm font-bold"
      >
        Start your 14-day free trial
      </button>
    </div>
  );
}
