import { useEffect, useRef, useState } from "react";

export interface TabItem {
  id: string;
  label: string;
  count?: number | null;
}

interface Props {
  tabs: TabItem[];
  active: string;
  onChange: (id: string) => void;
}

/**
 * Sticky horizontally-scrollable tab bar. Sits below the bio block, becomes
 * sticky as the user scrolls past it. 44px hit targets.
 */
export default function StickyTabs({ tabs, active, onChange }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const sentinel = document.createElement("div");
    sentinel.style.height = "1px";
    el.parentNode?.insertBefore(sentinel, el);
    const obs = new IntersectionObserver(
      ([entry]) => setStuck(!entry.isIntersecting),
      { rootMargin: "0px 0px 0px 0px", threshold: [1] },
    );
    obs.observe(sentinel);
    return () => {
      obs.disconnect();
      sentinel.remove();
    };
  }, []);

  return (
    <div
      ref={ref}
      className={
        "sticky top-0 z-30 bg-background/85 backdrop-blur " +
        (stuck ? "border-b border-border/60" : "border-b border-transparent")
      }
    >
      <div className="max-w-[1100px] mx-auto px-2 sm:px-4">
        <div role="tablist" aria-label="Profile sections" className="flex gap-1 overflow-x-auto">
          {tabs.map((t) => {
            const isActive = active === t.id;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => onChange(t.id)}
                className={
                  "relative whitespace-nowrap px-3 py-3 min-h-[44px] text-sm font-medium transition " +
                  (isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground")
                }
              >
                {t.label}
                {typeof t.count === "number" && (
                  <span className="ml-1.5 text-[11px] text-muted-foreground">{t.count}</span>
                )}
                {isActive && (
                  <span className="absolute left-2 right-2 -bottom-px h-[2px] rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
