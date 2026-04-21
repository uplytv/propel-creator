import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// --- Mocks ---------------------------------------------------------------

vi.mock("sonner", () => {
  const fn = vi.fn((..._args: unknown[]) => Math.floor(Math.random() * 1_000_000));
  (fn as unknown as { dismiss: (id?: number) => void }).dismiss = vi.fn();
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

const toastFn = toast as unknown as ReturnType<typeof vi.fn>;

// --- Helpers -------------------------------------------------------------

const CONTENT_TYPES: DiscoveryContentType[] = [
  "video",
  "clip",
  "stream",
  "post",
  "recording",
];

function makeBoostedItem(args: {
  contentType: DiscoveryContentType;
  contentId: string;
  expiresAt: string;
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
    title: `Promoted ${args.contentType} ${args.contentId}`,
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

function titleForItem(item: DiscoveryItem) {
  return `Promoted ${item.content_type} ${item.content_id}`;
}

function countForTitle(prefix: string, title: string) {
  // Exact suffix match: toast text is `${prefix}: ${title}`.
  const expected = `${prefix}: ${title}`;
  return toastFn.mock.calls.filter((c) => c[0] === expected).length;
}

function totalCountForPrefix(prefix: string) {
  return toastFn.mock.calls.filter(
    (c) => typeof c[0] === "string" && (c[0] as string).startsWith(prefix),
  ).length;
}

// --- Tests ---------------------------------------------------------------

describe("DiscoveryFeedCard — high-volume dedupe across many distinct boost keys", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));
    __resetBoostToastDedupeForTests();
    __resetInvalidatedBoostExpiriesForTests();
    toastFn.mockClear();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("25 distinct boost keys × 4 duplicate cards = 100 cards: each key produces exactly one ENDING and one ENDED toast", () => {
    const NUM_KEYS = 25;
    const DUPLICATES_PER_KEY = 4;

    // Build 25 unique keys with staggered expiries so they all transition
    // through ending -> ended within our simulated time window.
    const uniqueItems: DiscoveryItem[] = Array.from({ length: NUM_KEYS }, (_, i) => {
      const contentType = CONTENT_TYPES[i % CONTENT_TYPES.length];
      // Start each boost in the ACTIVE state (> 5 min out) and stagger expiries
      // between ~6 and ~7.25 minutes so they all transition active -> ending -> ended.
      const expMs = Date.now() + 6 * 60_000 + i * 3_000;
      return makeBoostedItem({
        contentType,
        contentId: `key-${i}`,
        expiresAt: new Date(expMs).toISOString(),
      });
    });

    // 25 × 4 = 100 card instances.
    const allCards = uniqueItems.flatMap((item) =>
      Array.from({ length: DUPLICATES_PER_KEY }, () => item),
    );
    expect(allCards).toHaveLength(NUM_KEYS * DUPLICATES_PER_KEY);

    renderCards(allCards);

    // No toasts on initial mount.
    expect(totalCountForPrefix("Boost ending soon")).toBe(0);
    expect(totalCountForPrefix("Boost ended")).toBe(0);

    // Cross every key into the ending window.
    act(() => {
      vi.advanceTimersByTime(2 * 60_000 + 1000);
    });
    // Then cross every key past expiry.
    act(() => {
      vi.advanceTimersByTime(6 * 60_000);
    });

    // Debug: log first few calls.
    // eslint-disable-next-line no-console
    console.log("SAMPLE CALLS:", toastFn.mock.calls.slice(0, 3).map((c) => c[0]));
    for (const item of uniqueItems) {
      const title = titleForItem(item);
      expect(countForTitle("Boost ending soon", title)).toBe(1);
      expect(countForTitle("Boost ended", title)).toBe(1);
    }

    // Verify global totals.
    expect(totalCountForPrefix("Boost ending soon")).toBe(NUM_KEYS);
    expect(totalCountForPrefix("Boost ended")).toBe(NUM_KEYS);
  });

  it("50 distinct boost keys × 2 duplicate cards = 100 cards: each key still gets exactly one of each toast", () => {
    const NUM_KEYS = 50;
    const DUPLICATES_PER_KEY = 2;

    const uniqueItems: DiscoveryItem[] = Array.from({ length: NUM_KEYS }, (_, i) => {
      const contentType = CONTENT_TYPES[i % CONTENT_TYPES.length];
      // All start ACTIVE (> 5 min out), staggered.
      const expMs = Date.now() + 6 * 60_000 + i * 1_500;
      return makeBoostedItem({
        contentType,
        contentId: `k-${i}`,
        expiresAt: new Date(expMs).toISOString(),
      });
    });

    const allCards = uniqueItems.flatMap((item) =>
      Array.from({ length: DUPLICATES_PER_KEY }, () => item),
    );
    expect(allCards).toHaveLength(NUM_KEYS * DUPLICATES_PER_KEY);

    renderCards(allCards);

    // Cross into ending window, then past expiry.
    act(() => {
      vi.advanceTimersByTime(2 * 60_000 + 1000);
    });
    act(() => {
      vi.advanceTimersByTime(6 * 60_000);
    });

    for (const item of uniqueItems) {
      const title = titleForItem(item);
      expect(countForTitle("Boost ending soon", title)).toBe(1);
      expect(countForTitle("Boost ended", title)).toBe(1);
    }

    expect(totalCountForPrefix("Boost ending soon")).toBe(NUM_KEYS);
    expect(totalCountForPrefix("Boost ended")).toBe(NUM_KEYS);
  });
});
