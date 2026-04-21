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

function countForExact(prefix: string, title: string) {
  const expected = `${prefix}: ${title}`;
  return toastFn.mock.calls.filter((c) => c[0] === expected).length;
}

function totalCountForPrefix(prefix: string) {
  return toastFn.mock.calls.filter(
    (c) => typeof c[0] === "string" && (c[0] as string).startsWith(prefix),
  ).length;
}

/** Rapid-fire click the action button N times for every toast matching the title. */
function rapidClickAction(prefix: string, title: string, times: number) {
  const expected = `${prefix}: ${title}`;
  toastFn.mock.calls.forEach((call, i) => {
    if (call[0] !== expected) return;
    const opts = call[1] as
      | { action?: { onClick?: (e?: unknown) => void } }
      | undefined;
    const id = toastFn.mock.results[i]?.value as number | undefined;
    for (let n = 0; n < times; n++) {
      // Each click invokes the handler (if any) and dismisses the toast.
      opts?.action?.onClick?.();
      toastFn.dismiss(id);
    }
  });
}

// --- Tests ---------------------------------------------------------------

describe("DiscoveryFeedCard — rapid action click dedupe", () => {
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

  it("Single key × many cards: rapidly clicking the ENDING action 20× still produces exactly one ENDED toast", () => {
    const item = makeBoostedItem({
      contentType: "video",
      contentId: "rapid-1",
      // 5min 30s out → minute tick lands in "ending", later tick crosses into "ended".
      expiresAt: new Date(Date.now() + 5 * 60_000 + 30_000).toISOString(),
    });

    // 6 duplicate cards for the same boost key.
    renderCards(Array(6).fill(item));

    // Cross into ENDING.
    act(() => {
      vi.advanceTimersByTime(61_000);
    });
    expect(countForExact("Boost ending soon", titleForItem(item))).toBe(1);

    // Rapid-fire click the ending action 20 times.
    act(() => {
      rapidClickAction("Boost ending soon", titleForItem(item), 20);
    });

    // Cross past expiry → ENDED transition fires across all 6 cards.
    act(() => {
      vi.advanceTimersByTime(6 * 60_000);
    });
    // Plenty more time for stragglers.
    act(() => {
      vi.advanceTimersByTime(15 * 60_000);
    });

    // Still exactly one of each, despite 20 rapid clicks across 6 card instances.
    expect(countForExact("Boost ending soon", titleForItem(item))).toBe(1);
    expect(countForExact("Boost ended", titleForItem(item))).toBe(1);
    expect(totalCountForPrefix("Boost ending soon")).toBe(1);
    expect(totalCountForPrefix("Boost ended")).toBe(1);
  });

  it("50 distinct keys × 2 cards: rapidly clicking each ENDING action 10× still produces exactly one ENDED toast per key", () => {
    const NUM_KEYS = 50;
    const DUPLICATES_PER_KEY = 2;
    const RAPID_CLICKS = 10;

    const CONTENT_TYPES: DiscoveryContentType[] = [
      "video",
      "clip",
      "stream",
      "post",
      "recording",
    ];

    const uniqueItems: DiscoveryItem[] = Array.from({ length: NUM_KEYS }, (_, i) => {
      const contentType = CONTENT_TYPES[i % CONTENT_TYPES.length];
      const expMs = Date.now() + 5 * 60_000 + 30_000 + i * 50;
      return makeBoostedItem({
        contentType,
        contentId: `r-${i}`,
        expiresAt: new Date(expMs).toISOString(),
      });
    });

    const allCards = uniqueItems.flatMap((item) =>
      Array.from({ length: DUPLICATES_PER_KEY }, () => item),
    );
    renderCards(allCards);

    // Cross into ENDING for every key.
    act(() => {
      vi.advanceTimersByTime(61_000);
    });
    expect(totalCountForPrefix("Boost ending soon")).toBe(NUM_KEYS);

    // For every key: rapidly click its ENDING action many times in a row.
    act(() => {
      for (const item of uniqueItems) {
        rapidClickAction("Boost ending soon", titleForItem(item), RAPID_CLICKS);
      }
    });

    // Cross past every expiry → all ENDED transitions fire.
    act(() => {
      vi.advanceTimersByTime(6 * 60_000);
    });
    // More time for any straggling minute ticks / setTimeouts.
    act(() => {
      vi.advanceTimersByTime(15 * 60_000);
    });

    for (const item of uniqueItems) {
      const title = titleForItem(item);
      const ending = countForExact("Boost ending soon", title);
      const ended = countForExact("Boost ended", title);
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
});
