import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// --- Mocks ---------------------------------------------------------------
//
// Sonner mock captures action options so we can simulate the user clicking
// each toast's action button at scale.
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
  // Exact match: toast text is `${prefix}: ${title}`.
  const expected = `${prefix}: ${title}`;
  return toastFn.mock.calls.filter((c) => c[0] === expected).length;
}

function totalCountForPrefix(prefix: string) {
  return toastFn.mock.calls.filter(
    (c) => typeof c[0] === "string" && (c[0] as string).startsWith(prefix),
  ).length;
}

/** Simulate clicking the action button on every toast that exactly matches. */
function clickAllActionsForExact(prefix: string, title: string) {
  const expected = `${prefix}: ${title}`;
  toastFn.mock.calls.forEach((call, i) => {
    if (call[0] !== expected) return;
    const opts = call[1] as
      | { action?: { onClick?: (e?: unknown) => void } }
      | undefined;
    opts?.action?.onClick?.();
    const id = toastFn.mock.results[i]?.value as number | undefined;
    toastFn.dismiss(id);
  });
}

// --- Tests ---------------------------------------------------------------

describe("DiscoveryFeedCard — high-volume action click dedupe across many distinct boost keys", () => {
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

  it("50 distinct boost keys × 2 cards: clicking the ENDING action on every key produces no duplicate ending or ended toasts", () => {
    const NUM_KEYS = 50;
    const DUPLICATES_PER_KEY = 2;

    // Tight expiry window so every key transitions active -> ending -> ended
    // through the same simulated time advance.
    const uniqueItems: DiscoveryItem[] = Array.from({ length: NUM_KEYS }, (_, i) => {
      const contentType = CONTENT_TYPES[i % CONTENT_TYPES.length];
      const expMs = Date.now() + 5 * 60_000 + 30_000 + i * 50;
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

    // No toasts on initial mount.
    expect(totalCountForPrefix("Boost ending soon")).toBe(0);
    expect(totalCountForPrefix("Boost ended")).toBe(0);

    // First minute tick → all keys cross into "ending" window.
    act(() => {
      vi.advanceTimersByTime(61_000);
    });

    // Exactly one ending toast per key.
    for (const item of uniqueItems) {
      expect(countForTitle("Boost ending soon", titleForItem(item))).toBe(1);
    }
    expect(totalCountForPrefix("Boost ending soon")).toBe(NUM_KEYS);

    // User clicks the action on every single ending toast.
    act(() => {
      for (const item of uniqueItems) {
        clickAllActionsForExact("Boost ending soon", titleForItem(item));
      }
    });

    // Advance past every expiry — precise ENDED setTimeouts fire and the
    // next minute ticks observe "ended" across all duplicate cards.
    act(() => {
      vi.advanceTimersByTime(6 * 60_000);
    });
    // Plenty more time — straggling re-renders / minute ticks must not re-toast.
    act(() => {
      vi.advanceTimersByTime(15 * 60_000);
    });

    // Each key still has exactly one ending toast and exactly one ended toast.
    for (const item of uniqueItems) {
      const title = titleForItem(item);
      const ending = countForTitle("Boost ending soon", title);
      const ended = countForTitle("Boost ended", title);
      if (ending !== 1 || ended !== 1) {
        // eslint-disable-next-line no-console
        console.log("MISMATCH:", title, { ending, ended });
      }
      expect(ending).toBe(1);
      expect(ended).toBe(1);
    }

    expect(totalCountForPrefix("Boost ending soon")).toBe(NUM_KEYS);
    expect(totalCountForPrefix("Boost ended")).toBe(NUM_KEYS);
  });

  it("60 distinct boost keys × 2 cards: clicking ENDING action on every key followed by clicking every ENDED action produces no duplicates", () => {
    const NUM_KEYS = 60;
    const DUPLICATES_PER_KEY = 2;

    const uniqueItems: DiscoveryItem[] = Array.from({ length: NUM_KEYS }, (_, i) => {
      const contentType = CONTENT_TYPES[i % CONTENT_TYPES.length];
      const expMs = Date.now() + 5 * 60_000 + 30_000 + i * 40;
      return makeBoostedItem({
        contentType,
        contentId: `b-${i}`,
        expiresAt: new Date(expMs).toISOString(),
      });
    });

    const allCards = uniqueItems.flatMap((item) =>
      Array.from({ length: DUPLICATES_PER_KEY }, () => item),
    );
    renderCards(allCards);

    // Cross into ending window.
    act(() => {
      vi.advanceTimersByTime(61_000);
    });
    expect(totalCountForPrefix("Boost ending soon")).toBe(NUM_KEYS);

    // Click every ENDING action.
    act(() => {
      for (const item of uniqueItems) {
        clickAllActionsForExact("Boost ending soon", titleForItem(item));
      }
    });

    // Cross past every expiry → ENDED fires.
    act(() => {
      vi.advanceTimersByTime(6 * 60_000);
    });
    expect(totalCountForPrefix("Boost ended")).toBe(NUM_KEYS);

    // Click every ENDED action too.
    act(() => {
      for (const item of uniqueItems) {
        clickAllActionsForExact("Boost ended", titleForItem(item));
      }
    });

    // Lots more time — neither ending nor ended must reappear for any key.
    act(() => {
      vi.advanceTimersByTime(20 * 60_000);
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
