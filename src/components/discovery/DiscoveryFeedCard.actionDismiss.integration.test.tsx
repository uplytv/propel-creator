import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// --- Mocks ---------------------------------------------------------------
//
// Sonner mock: every toast() call returns a unique id. The action option's
// onClick is wrapped so calling it triggers the user handler AND auto-dismisses
// the toast (matching real sonner behavior). We expose tracking sets so the
// tests can assert the toast lifecycle.

vi.mock("sonner", () => {
  const live = new Set<number>();
  const dismissed = new Set<number>();
  let nextId = 1;

  const fn = vi.fn((..._args: unknown[]) => {
    const id = nextId++;
    live.add(id);
    // Wrap the action.onClick (if any) so it also dismisses, like real sonner.
    const opts = _args[1] as
      | { action?: { onClick?: (e?: unknown) => void } }
      | undefined;
    if (opts?.action?.onClick) {
      const original = opts.action.onClick;
      opts.action.onClick = (e?: unknown) => {
        original(e);
        live.delete(id);
        dismissed.add(id);
      };
    }
    return id;
  });
  (fn as unknown as { dismiss: (id?: number) => void }).dismiss = vi.fn(
    (id?: number) => {
      if (typeof id === "number") {
        live.delete(id);
        dismissed.add(id);
      }
    },
  );
  (fn as unknown as { __live: Set<number>; __dismissed: Set<number> }).__live =
    live;
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
  __live: Set<number>;
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

function callsForExact(prefix: string, title: string) {
  const expected = `${prefix}: ${title}`;
  return toastFn.mock.calls
    .map((c, i) => ({ c, i, id: toastFn.mock.results[i]?.value as number }))
    .filter(({ c }) => c[0] === expected);
}

function totalCountForPrefix(prefix: string) {
  return toastFn.mock.calls.filter(
    (c) => typeof c[0] === "string" && (c[0] as string).startsWith(prefix),
  ).length;
}

/** Stub window.location.href so the action's navigation doesn't blow up jsdom. */
function installLocationStub() {
  const original = Object.getOwnPropertyDescriptor(window, "location");
  let current = "http://localhost/";
  Object.defineProperty(window, "location", {
    configurable: true,
    value: {
      get href() {
        return current;
      },
      set href(v: string) {
        current = v;
      },
    },
  });
  return () => {
    if (original) Object.defineProperty(window, "location", original);
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

describe("DiscoveryFeedCard — clicking the toast action dismisses the toast and leaves none lingering", () => {
  let restoreLoc: () => void;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));
    __resetBoostToastDedupeForTests();
    __resetInvalidatedBoostExpiriesForTests();
    toastFn.mockClear();
    toastFn.dismiss.mockClear();
    toastFn.__live.clear();
    toastFn.__dismissed.clear();
    restoreLoc = installLocationStub();
  });

  afterEach(() => {
    restoreLoc();
    cleanup();
    vi.useRealTimers();
  });

  it("ENDING: clicking the action dismisses the toast and no lingering ending toast remains across many cards", () => {
    const item = makeBoostedItem({
      contentType: "video",
      contentId: "L1",
      expiresAt: new Date(Date.now() + 6 * 60_000).toISOString(),
    });
    renderCards(Array(6).fill(item));

    // Cross into the ending window.
    act(() => {
      vi.advanceTimersByTime(2 * 60_000 + 1000);
    });
    const calls = callsForExact("Boost ending soon", titleForItem(item));
    expect(calls).toHaveLength(1);
    const id = calls[0]!.id;
    expect(toastFn.__live.has(id)).toBe(true);

    // User clicks the action.
    act(() => {
      clickActionForExact("Boost ending soon", titleForItem(item));
    });

    // The clicked toast is no longer live (it was dismissed by the action).
    expect(toastFn.__live.has(id)).toBe(false);
    expect(toastFn.__dismissed.has(id)).toBe(true);
    expect(toastFn.__live.size).toBe(0);

    // Lots more time passes — no new ending toast must appear, and no toast lingers.
    act(() => {
      vi.advanceTimersByTime(2 * 60_000);
    });
    expect(callsForExact("Boost ending soon", titleForItem(item))).toHaveLength(1);
    expect(toastFn.__live.size).toBe(0);
  });

  it("ENDED: clicking the action dismisses the toast and no lingering ended toast remains across many cards", () => {
    const item = makeBoostedItem({
      contentType: "clip",
      contentId: "L2",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    });
    renderCards(Array(6).fill(item));

    act(() => {
      vi.advanceTimersByTime(2 * 60_000 + 1000);
    });
    const calls = callsForExact("Boost ended", titleForItem(item));
    expect(calls).toHaveLength(1);
    const id = calls[0]!.id;
    expect(toastFn.__live.has(id)).toBe(true);

    act(() => {
      clickActionForExact("Boost ended", titleForItem(item));
    });

    expect(toastFn.__live.has(id)).toBe(false);
    expect(toastFn.__dismissed.has(id)).toBe(true);
    expect(toastFn.__live.size).toBe(0);

    // Plenty of time afterward — straggling ticks must not re-toast.
    act(() => {
      vi.advanceTimersByTime(15 * 60_000);
    });
    expect(callsForExact("Boost ended", titleForItem(item))).toHaveLength(1);
    expect(toastFn.__live.size).toBe(0);
  });

  it("Many distinct keys: clicking each ENDING action dismisses every toast and leaves zero lingering", () => {
    const NUM_KEYS = 12;
    const items = Array.from({ length: NUM_KEYS }, (_, i) =>
      makeBoostedItem({
        contentType: CONTENT_TYPES[i % CONTENT_TYPES.length],
        contentId: `M-${i}`,
        // 6 minutes out (+ jitter) → after a 2-minute tick everyone is in ENDING.
        expiresAt: new Date(Date.now() + 6 * 60_000 + i * 100).toISOString(),
      }),
    );
    renderCards(items.flatMap((it) => Array(3).fill(it)));

    act(() => {
      vi.advanceTimersByTime(2 * 60_000 + 1000);
    });

    // One ending toast per unique key, all currently live.
    expect(totalCountForPrefix("Boost ending soon")).toBe(NUM_KEYS);
    expect(toastFn.__live.size).toBe(NUM_KEYS);

    // Click every action.
    act(() => {
      for (const item of items) {
        clickActionForExact("Boost ending soon", titleForItem(item));
      }
    });

    // Every toast was dismissed — none linger.
    expect(toastFn.__live.size).toBe(0);
    expect(toastFn.__dismissed.size).toBe(NUM_KEYS);

    // Time marches on — no key produces a second ending toast.
    act(() => {
      vi.advanceTimersByTime(2 * 60_000);
    });
    expect(totalCountForPrefix("Boost ending soon")).toBe(NUM_KEYS);
    expect(toastFn.__live.size).toBe(0);
  });

  it("Full lifecycle: clicking ENDING then later clicking ENDED dismisses both with zero lingering toasts", () => {
    const item = makeBoostedItem({
      contentType: "video",
      contentId: "lifecycle",
      // 5min30s out → first 1m tick lands in ENDING; later we cross expiry.
      expiresAt: new Date(Date.now() + 5 * 60_000 + 30_000).toISOString(),
    });
    renderCards(Array(4).fill(item));

    // ENDING fires.
    act(() => {
      vi.advanceTimersByTime(61_000);
    });
    expect(callsForExact("Boost ending soon", titleForItem(item))).toHaveLength(1);
    expect(toastFn.__live.size).toBe(1);

    // User clicks the ending action → dismissed.
    act(() => {
      clickActionForExact("Boost ending soon", titleForItem(item));
    });
    expect(toastFn.__live.size).toBe(0);

    // Cross past expiry → ENDED fires (a brand-new toast).
    act(() => {
      vi.advanceTimersByTime(6 * 60_000);
    });
    expect(callsForExact("Boost ended", titleForItem(item))).toHaveLength(1);
    expect(toastFn.__live.size).toBe(1);

    // User clicks the ended action → dismissed.
    act(() => {
      clickActionForExact("Boost ended", titleForItem(item));
    });
    expect(toastFn.__live.size).toBe(0);

    // Far future — nothing lingers, nothing reappears.
    act(() => {
      vi.advanceTimersByTime(30 * 60_000);
    });
    expect(callsForExact("Boost ending soon", titleForItem(item))).toHaveLength(1);
    expect(callsForExact("Boost ended", titleForItem(item))).toHaveLength(1);
    expect(toastFn.__live.size).toBe(0);
  });
});
