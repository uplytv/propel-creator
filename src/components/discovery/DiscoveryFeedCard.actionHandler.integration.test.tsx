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

function callsForExact(prefix: string, title: string) {
  const expected = `${prefix}: ${title}`;
  return toastFn.mock.calls
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => c[0] === expected);
}

/**
 * The toast action's onClick navigates via window.location.href. We track
 * those navigations by spying on the location.href setter.
 */
function installLocationSpy(): { hrefs: string[]; restore: () => void } {
  const original = Object.getOwnPropertyDescriptor(window, "location");
  const hrefs: string[] = [];
  let current = "http://localhost/";
  Object.defineProperty(window, "location", {
    configurable: true,
    value: {
      get href() {
        return current;
      },
      set href(v: string) {
        current = v;
        hrefs.push(v);
      },
    },
  });
  return {
    hrefs,
    restore: () => {
      if (original) Object.defineProperty(window, "location", original);
    },
  };
}

/** Click the action button on every toast that exactly matches title. */
function clickActionForExact(prefix: string, title: string) {
  for (const { c } of callsForExact(prefix, title)) {
    const opts = c[1] as { action?: { onClick?: () => void } } | undefined;
    opts?.action?.onClick?.();
  }
}

// --- Tests ---------------------------------------------------------------

describe("DiscoveryFeedCard — toast action triggers handler exactly once per unique boost key", () => {
  let locSpy: { hrefs: string[]; restore: () => void };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));
    __resetBoostToastDedupeForTests();
    __resetInvalidatedBoostExpiriesForTests();
    toastFn.mockClear();
    locSpy = installLocationSpy();
  });

  afterEach(() => {
    locSpy.restore();
    cleanup();
    vi.useRealTimers();
  });

  it("ENDING action: 5 distinct keys × 4 cards each — clicking each toast's action navigates exactly once per key", () => {
    const items: DiscoveryItem[] = Array.from({ length: 5 }, (_, i) =>
      makeBoostedItem({
        contentType: CONTENT_TYPES[i % CONTENT_TYPES.length],
        contentId: `e-${i}`,
        // 6 minutes out → after ~2 minutes we're in the 5-minute "ending" window.
        expiresAt: new Date(Date.now() + 6 * 60_000 + i * 100).toISOString(),
      }),
    );
    const allCards = items.flatMap((item) => Array(4).fill(item));
    renderCards(allCards);

    // Cross into ENDING.
    act(() => {
      vi.advanceTimersByTime(2 * 60_000 + 1000);
    });

    // Each unique key produced exactly one ending toast.
    for (const item of items) {
      expect(callsForExact("Boost ending soon", titleForItem(item))).toHaveLength(1);
    }

    // Click each ending action exactly once per key.
    act(() => {
      for (const item of items) {
        clickActionForExact("Boost ending soon", titleForItem(item));
      }
    });

    // Exactly one navigation per unique key (no duplicates from the 4 cards).
    expect(locSpy.hrefs).toHaveLength(items.length);
    // And the URL for each key matches its expected route.
    const expectedHrefs = items.map((it) => `/videos/promoted-${it.content_id}`)
      // Some items are not "video"; build the right URL per content_type.
      .map((_h, idx) => {
        const it = items[idx];
        switch (it.content_type) {
          case "video": return `/videos/promoted-${it.content_id}`;
          case "clip": return `/clips/promoted-${it.content_id}`;
          case "stream": return `/stream/promoted-${it.content_id}`;
          case "recording": return `/stream/promoted-${it.content_id}?type=recording`;
          case "post": return `/community/${it.creator_id}?post=${it.content_id}`;
          default: return `/stream/promoted-${it.content_id}`;
        }
      });
    expect(new Set(locSpy.hrefs)).toEqual(new Set(expectedHrefs));
  });

  it("ENDED action: 5 distinct keys × 4 cards each — clicking each toast's action navigates exactly once per key", () => {
    const items: DiscoveryItem[] = Array.from({ length: 5 }, (_, i) =>
      makeBoostedItem({
        contentType: CONTENT_TYPES[i % CONTENT_TYPES.length],
        contentId: `d-${i}`,
        // 1 minute out → after ~2 minutes every key is past expiry → ENDED.
        expiresAt: new Date(Date.now() + 60_000 + i * 100).toISOString(),
      }),
    );
    const allCards = items.flatMap((item) => Array(4).fill(item));
    renderCards(allCards);

    act(() => {
      vi.advanceTimersByTime(2 * 60_000 + 1000);
    });

    for (const item of items) {
      expect(callsForExact("Boost ended", titleForItem(item))).toHaveLength(1);
    }

    act(() => {
      for (const item of items) {
        clickActionForExact("Boost ended", titleForItem(item));
      }
    });

    // Exactly one navigation per unique key.
    expect(locSpy.hrefs).toHaveLength(items.length);
    expect(new Set(locSpy.hrefs).size).toBe(items.length);
  });

  it("Action click handler fires exactly once per click (no duplicate handler invocations) per unique key", () => {
    // Build 3 keys, click each ending action exactly 3 times → expect 3 navigations per key.
    const items: DiscoveryItem[] = Array.from({ length: 3 }, (_, i) =>
      makeBoostedItem({
        contentType: "video",
        contentId: `h-${i}`,
        expiresAt: new Date(Date.now() + 6 * 60_000 + i * 100).toISOString(),
      }),
    );
    // Multiple duplicate cards per key — should NOT multiply handler calls.
    renderCards(items.flatMap((it) => Array(5).fill(it)));

    act(() => {
      vi.advanceTimersByTime(2 * 60_000 + 1000);
    });

    // Click each ending action 3 times.
    act(() => {
      for (let n = 0; n < 3; n++) {
        for (const item of items) {
          clickActionForExact("Boost ending soon", titleForItem(item));
        }
      }
    });

    // 3 keys × 3 user clicks = 9 navigations total. Duplicate cards must not
    // inflate this — there's still only one toast (and one handler) per key.
    expect(locSpy.hrefs).toHaveLength(3 * 3);
    // Per-key navigation count.
    for (const item of items) {
      const url = `/videos/promoted-${item.content_id}`;
      expect(locSpy.hrefs.filter((h) => h === url)).toHaveLength(3);
    }
  });
});
