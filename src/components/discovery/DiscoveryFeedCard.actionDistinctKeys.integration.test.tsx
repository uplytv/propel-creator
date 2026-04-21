import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// --- Mocks ---------------------------------------------------------------
//
// Sonner mock captures messages + any `action` option, so we can simulate the
// user clicking a toast's action button.
vi.mock("sonner", () => {
  const dismissed = new Set<number>();
  const fn = vi.fn((..._args: unknown[]) => Math.floor(Math.random() * 1_000_000));
  (fn as unknown as { dismiss: (id?: number) => void }).dismiss = vi.fn(
    (id?: number) => {
      if (typeof id === "number") dismissed.add(id);
    },
  );
  (fn as unknown as { __dismissed: Set<number> }).__dismissed = dismissed;
  return { toast: fn };
});

vi.mock("./LiveBadge", () => ({ default: () => null }));
vi.mock("@/hooks/useLiveViewerCount", () => ({
  useLiveViewerCount: () => ({ count: 0 }),
}));

import { toast } from "sonner";
import DiscoveryFeedCard from "./DiscoveryFeedCard";
import { __resetBoostToastDedupeForTests } from "./boostToastDedupe";
import { __resetInvalidatedBoostExpiriesForTests } from "./boostInvalidation";
import type {
  DiscoveryItem,
  DiscoveryContentType,
} from "@/hooks/useDiscoveryAlgorithmFeed";

const toastFn = toast as unknown as ReturnType<typeof vi.fn> & {
  dismiss: ReturnType<typeof vi.fn>;
  __dismissed: Set<number>;
};

// --- Helpers -------------------------------------------------------------

function makeBoostedItem(args: {
  contentType: DiscoveryContentType;
  contentId: string;
  expiresAt: string;
  title?: string;
}): DiscoveryItem {
  return {
    content_id: args.contentId,
    content_type: args.contentType,
    creator_id: "creator-1",
    category: "general",
    score: 1,
    watch_time_avg_pct: 0,
    views: 0,
    likes: 0,
    is_new_creator_boosted: false,
    is_live: false,
    is_boosted: true,
    boost_tier: "standard",
    boost_expires_at: args.expiresAt,
    created_at: new Date().toISOString(),
    title: args.title ?? `Promoted ${args.contentType} ${args.contentId}`,
    thumbnail_url: null,
    slug: `promoted-${args.contentId}`,
  };
}

function renderCards(items: DiscoveryItem[]) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        {items.map((item, i) => (
          <DiscoveryFeedCard key={`${item.content_id}-${i}`} item={item} />
        ))}
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function callsStartingWith(prefix: string) {
  return toastFn.mock.calls.filter(
    (c) => typeof c[0] === "string" && (c[0] as string).startsWith(prefix),
  );
}
function callsForTitle(prefix: string, fragment: string) {
  return callsStartingWith(prefix).filter((c) =>
    (c[0] as string).includes(fragment),
  );
}

/** Simulate clicking the toast action button for the first matching toast. */
function clickToastAction(prefix: string, fragment: string) {
  const idx = toastFn.mock.calls.findIndex(
    (c) =>
      typeof c[0] === "string" &&
      (c[0] as string).startsWith(prefix) &&
      (c[0] as string).includes(fragment),
  );
  if (idx === -1) return false;
  const opts = toastFn.mock.calls[idx]?.[1] as
    | { action?: { onClick?: (e?: unknown) => void } }
    | undefined;
  opts?.action?.onClick?.();
  // Default sonner behavior: action click dismisses the toast.
  const id = toastFn.mock.results[idx]?.value as number | undefined;
  toastFn.dismiss(id);
  return true;
}

// --- Tests ---------------------------------------------------------------

describe("DiscoveryFeedCard — toast action click dedupe across DISTINCT boost keys", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));
    __resetBoostToastDedupeForTests();
    __resetInvalidatedBoostExpiriesForTests();
    toastFn.__dismissed.clear();
    toastFn.mockClear();
    toastFn.dismiss.mockClear();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("ENDING: clicking the action on one key's toast does not cause duplicates for it OR for other keys", () => {
    // Three distinct boost keys (different content_type AND content_id AND expiry).
    const expA = new Date(Date.now() + 6 * 60_000).toISOString();
    const expB = new Date(Date.now() + 6 * 60_000 + 1000).toISOString();
    const expC = new Date(Date.now() + 6 * 60_000 + 2000).toISOString();

    const itemA = makeBoostedItem({ contentType: "video", contentId: "A", expiresAt: expA });
    const itemB = makeBoostedItem({ contentType: "clip", contentId: "B", expiresAt: expB });
    const itemC = makeBoostedItem({ contentType: "stream", contentId: "C", expiresAt: expC });

    // 5 duplicate cards per key.
    renderCards([
      ...Array(5).fill(itemA),
      ...Array(5).fill(itemB),
      ...Array(5).fill(itemC),
    ]);

    // Cross all three into the ending window.
    act(() => {
      vi.advanceTimersByTime(2 * 60_000 + 1000);
    });
    expect(callsForTitle("Boost ending soon", "video A")).toHaveLength(1);
    expect(callsForTitle("Boost ending soon", "clip B")).toHaveLength(1);
    expect(callsForTitle("Boost ending soon", "stream C")).toHaveLength(1);

    // User clicks the action on two of the three ending toasts.
    act(() => {
      clickToastAction("Boost ending soon", "video A");
      clickToastAction("Boost ending soon", "stream C");
    });

    // Several minute ticks pass — every duplicate card's effect re-runs.
    act(() => {
      vi.advanceTimersByTime(3 * 60_000);
    });

    // Each unique key still has exactly one ending toast.
    expect(callsForTitle("Boost ending soon", "video A")).toHaveLength(1);
    expect(callsForTitle("Boost ending soon", "clip B")).toHaveLength(1);
    expect(callsForTitle("Boost ending soon", "stream C")).toHaveLength(1);
    expect(callsStartingWith("Boost ending soon")).toHaveLength(3);
  });

  it("ENDED: clicking the action on one key's toast does not cause duplicates for it OR for other keys", () => {
    const expA = new Date(Date.now() + 60_000).toISOString();
    const expB = new Date(Date.now() + 90_000).toISOString();
    const expC = new Date(Date.now() + 120_000).toISOString();

    const itemA = makeBoostedItem({ contentType: "video", contentId: "A", expiresAt: expA });
    const itemB = makeBoostedItem({ contentType: "clip", contentId: "B", expiresAt: expB });
    const itemC = makeBoostedItem({ contentType: "post", contentId: "C", expiresAt: expC });

    renderCards([
      ...Array(6).fill(itemA),
      ...Array(6).fill(itemB),
      ...Array(6).fill(itemC),
    ]);

    // Cross past every expiry.
    act(() => {
      vi.advanceTimersByTime(3 * 60_000);
    });
    expect(callsForTitle("Boost ended", "video A")).toHaveLength(1);
    expect(callsForTitle("Boost ended", "clip B")).toHaveLength(1);
    expect(callsForTitle("Boost ended", "post C")).toHaveLength(1);

    // Click the action on two of the three ended toasts.
    act(() => {
      clickToastAction("Boost ended", "video A");
      clickToastAction("Boost ended", "clip B");
    });

    // Lots more time passes — straggling timers must not re-toast for any key.
    act(() => {
      vi.advanceTimersByTime(15 * 60_000);
    });

    expect(callsForTitle("Boost ended", "video A")).toHaveLength(1);
    expect(callsForTitle("Boost ended", "clip B")).toHaveLength(1);
    expect(callsForTitle("Boost ended", "post C")).toHaveLength(1);
    expect(callsStartingWith("Boost ended")).toHaveLength(3);
  });

  it("Same content_id + DIFFERENT expiry: action click on one variant does not duplicate either variant's toasts", () => {
    // Two boosts that share content_type+content_id but have different expiries
    // (e.g. boost was extended) — these are distinct keys.
    const exp1 = new Date(Date.now() + 6 * 60_000).toISOString();
    const exp2 = new Date(Date.now() + 6 * 60_000 + 30_000).toISOString();

    const v1 = makeBoostedItem({
      contentType: "video",
      contentId: "shared",
      expiresAt: exp1,
      title: "Promoted video shared (v1)",
    });
    const v2 = makeBoostedItem({
      contentType: "video",
      contentId: "shared",
      expiresAt: exp2,
      title: "Promoted video shared (v2)",
    });

    renderCards([
      ...Array(4).fill(v1),
      ...Array(4).fill(v2),
    ]);

    // Cross both into ending window.
    act(() => {
      vi.advanceTimersByTime(2 * 60_000 + 1000);
    });
    expect(callsForTitle("Boost ending soon", "(v1)")).toHaveLength(1);
    expect(callsForTitle("Boost ending soon", "(v2)")).toHaveLength(1);

    // Click the action on the v1 ending toast only.
    act(() => {
      clickToastAction("Boost ending soon", "(v1)");
    });
    act(() => {
      vi.advanceTimersByTime(3 * 60_000);
    });
    expect(callsForTitle("Boost ending soon", "(v1)")).toHaveLength(1);
    expect(callsForTitle("Boost ending soon", "(v2)")).toHaveLength(1);

    // Cross past both expiries to trigger the ENDED transitions.
    act(() => {
      vi.advanceTimersByTime(5 * 60_000);
    });
    expect(callsForTitle("Boost ended", "(v1)")).toHaveLength(1);
    expect(callsForTitle("Boost ended", "(v2)")).toHaveLength(1);

    // Click the action on the v2 ended toast only.
    act(() => {
      clickToastAction("Boost ended", "(v2)");
    });
    act(() => {
      vi.advanceTimersByTime(10 * 60_000);
    });

    expect(callsForTitle("Boost ending soon", "(v1)")).toHaveLength(1);
    expect(callsForTitle("Boost ending soon", "(v2)")).toHaveLength(1);
    expect(callsForTitle("Boost ended", "(v1)")).toHaveLength(1);
    expect(callsForTitle("Boost ended", "(v2)")).toHaveLength(1);
  });
});
