import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// --- Mocks ---------------------------------------------------------------

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

function callsForTitle(prefix: string, titleFragment: string) {
  return callsStartingWith(prefix).filter((c) =>
    (c[0] as string).includes(titleFragment),
  );
}

function dismissFirstMatching(prefix: string, titleFragment: string) {
  const idx = toastFn.mock.calls.findIndex(
    (c) =>
      typeof c[0] === "string" &&
      (c[0] as string).startsWith(prefix) &&
      (c[0] as string).includes(titleFragment),
  );
  if (idx === -1) return false;
  const id = toastFn.mock.results[idx]?.value as number | undefined;
  toastFn.dismiss(id);
  return true;
}

// --- Tests ---------------------------------------------------------------

describe("DiscoveryFeedCard — dismissal dedupe across DISTINCT boost keys", () => {
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

  it("ENDING: each distinct boost key produces exactly one ending toast even after dismissing some, with many duplicate cards per key", () => {
    // Three distinct keys differing by content_id, content_type, and expiry —
    // all currently in "active" but expiring within 6 minutes.
    const expA = new Date(Date.now() + 6 * 60_000).toISOString();
    const expB = new Date(Date.now() + 6 * 60_000 + 1000).toISOString(); // different expiry
    const expC = new Date(Date.now() + 6 * 60_000 + 2000).toISOString();

    const itemA = makeBoostedItem({ contentType: "video", contentId: "A", expiresAt: expA });
    const itemB = makeBoostedItem({ contentType: "clip", contentId: "B", expiresAt: expB });
    const itemC = makeBoostedItem({ contentType: "stream", contentId: "C", expiresAt: expC });

    // 5 duplicate cards per item.
    const items = [
      ...Array(5).fill(itemA),
      ...Array(5).fill(itemB),
      ...Array(5).fill(itemC),
    ];
    renderCards(items);

    // Cross all three into ending window.
    act(() => {
      vi.advanceTimersByTime(2 * 60_000 + 1000);
    });

    expect(callsForTitle("Boost ending soon", "video A")).toHaveLength(1);
    expect(callsForTitle("Boost ending soon", "clip B")).toHaveLength(1);
    expect(callsForTitle("Boost ending soon", "stream C")).toHaveLength(1);

    // User dismisses two of the three ending toasts.
    act(() => {
      dismissFirstMatching("Boost ending soon", "video A");
      dismissFirstMatching("Boost ending soon", "stream C");
    });

    // More minute ticks pass — every duplicate card's effect re-runs.
    act(() => {
      vi.advanceTimersByTime(3 * 60_000);
    });

    // Still exactly one toast per distinct key.
    expect(callsForTitle("Boost ending soon", "video A")).toHaveLength(1);
    expect(callsForTitle("Boost ending soon", "clip B")).toHaveLength(1);
    expect(callsForTitle("Boost ending soon", "stream C")).toHaveLength(1);
    expect(callsStartingWith("Boost ending soon")).toHaveLength(3);
  });

  it("ENDED: each distinct boost key produces exactly one ended toast even after dismissing some, with many duplicate cards per key", () => {
    // Three distinct keys, all currently in ending window, expiring at staggered times.
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

    // Cross past all three expiries.
    act(() => {
      vi.advanceTimersByTime(3 * 60_000);
    });

    expect(callsForTitle("Boost ended", "video A")).toHaveLength(1);
    expect(callsForTitle("Boost ended", "clip B")).toHaveLength(1);
    expect(callsForTitle("Boost ended", "post C")).toHaveLength(1);

    // Dismiss two of the three ended toasts.
    act(() => {
      dismissFirstMatching("Boost ended", "video A");
      dismissFirstMatching("Boost ended", "clip B");
    });

    // Let more time pass — straggling card timers must not re-toast for any key.
    act(() => {
      vi.advanceTimersByTime(10 * 60_000);
    });

    expect(callsForTitle("Boost ended", "video A")).toHaveLength(1);
    expect(callsForTitle("Boost ended", "clip B")).toHaveLength(1);
    expect(callsForTitle("Boost ended", "post C")).toHaveLength(1);
    expect(callsStartingWith("Boost ended")).toHaveLength(3);
  });

  it("Same content_id but DIFFERENT expiry timestamps are treated as distinct keys (each gets its own one-time toast)", () => {
    // Two cards that share content_type+content_id but have different expiry times
    // (e.g. boost was extended). Each unique key should toast exactly once.
    const exp1 = new Date(Date.now() + 6 * 60_000).toISOString();
    const exp2 = new Date(Date.now() + 6 * 60_000 + 30_000).toISOString();

    const variant1 = makeBoostedItem({
      contentType: "video",
      contentId: "shared",
      expiresAt: exp1,
      title: "Promoted video shared (v1)",
    });
    const variant2 = makeBoostedItem({
      contentType: "video",
      contentId: "shared",
      expiresAt: exp2,
      title: "Promoted video shared (v2)",
    });

    renderCards([
      ...Array(4).fill(variant1),
      ...Array(4).fill(variant2),
    ]);

    // Cross both into ending window.
    act(() => {
      vi.advanceTimersByTime(2 * 60_000 + 1000);
    });

    expect(callsForTitle("Boost ending soon", "(v1)")).toHaveLength(1);
    expect(callsForTitle("Boost ending soon", "(v2)")).toHaveLength(1);

    // Dismiss the v1 toast; v2 must be untouched and v1 must not re-fire.
    act(() => {
      dismissFirstMatching("Boost ending soon", "(v1)");
    });
    act(() => {
      vi.advanceTimersByTime(3 * 60_000);
    });

    expect(callsForTitle("Boost ending soon", "(v1)")).toHaveLength(1);
    expect(callsForTitle("Boost ending soon", "(v2)")).toHaveLength(1);
    expect(callsStartingWith("Boost ending soon")).toHaveLength(2);
  });
});
