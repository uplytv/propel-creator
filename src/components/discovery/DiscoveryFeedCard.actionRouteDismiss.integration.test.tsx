import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// --- Mocks ---------------------------------------------------------------
//
// Sonner mock: every toast() call returns a unique id and the action's onClick
// is wrapped to also auto-dismiss the toast (matching real sonner behavior).

vi.mock("sonner", () => {
  const live = new Set<number>();
  const dismissed = new Set<number>();
  let nextId = 1;

  const fn = vi.fn((..._args: unknown[]) => {
    const id = nextId++;
    live.add(id);
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
  (fn as unknown as { __live: Set<number>; __dismissed: Set<number> }).__live = live;
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

function makeBoostedItem(args: {
  contentType: DiscoveryContentType;
  contentId: string;
  expiresAt: string;
  slug?: string | null;
  creatorId?: string;
}): DiscoveryItem {
  return {
    content_id: args.contentId,
    content_type: args.contentType,
    creator_id: args.creatorId ?? "creator-1",
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
    slug: args.slug === undefined ? `promoted-${args.contentId}` : args.slug,
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

/**
 * Replace window.location with a stub that records every href set so we can
 * assert the toast action navigated to the correct route.
 */
function installLocationSpy() {
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

function clickActionForExact(prefix: string, title: string) {
  for (const { c } of callsForExact(prefix, title)) {
    const opts = c[1] as { action?: { onClick?: () => void } } | undefined;
    opts?.action?.onClick?.();
  }
}

/** Mirrors the linkFor() switch inside DiscoveryFeedCard.tsx. */
function expectedHrefFor(item: DiscoveryItem): string {
  const slug = item.slug || item.content_id;
  switch (item.content_type) {
    case "video": return `/videos/${slug}`;
    case "clip": return `/clips/${slug}`;
    case "stream": return `/stream/${slug}`;
    case "recording": return `/stream/${slug}?type=recording`;
    case "post": return `/community/${item.creator_id}?post=${item.content_id}`;
    case "product": return `/products/${item.content_id}`;
    case "podcast": return `/podcast?episode=${item.content_id}`;
    case "event": return `/events/global/${item.content_id}`;
    default: return `/stream/${slug}`;
  }
}

// --- Tests ---------------------------------------------------------------

describe("DiscoveryFeedCard — action navigates to correct boosted route AND dismisses, no lingering toasts", () => {
  let locSpy: ReturnType<typeof installLocationSpy>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));
    __resetBoostToastDedupeForTests();
    __resetInvalidatedBoostExpiriesForTests();
    toastFn.mockClear();
    toastFn.dismiss.mockClear();
    toastFn.__live.clear();
    toastFn.__dismissed.clear();
    locSpy = installLocationSpy();
  });

  afterEach(() => {
    locSpy.restore();
    cleanup();
    vi.useRealTimers();
  });

  it.each([
    { contentType: "video" as DiscoveryContentType, expectedPrefix: "/videos/" },
    { contentType: "clip" as DiscoveryContentType, expectedPrefix: "/clips/" },
    { contentType: "stream" as DiscoveryContentType, expectedPrefix: "/stream/" },
    { contentType: "recording" as DiscoveryContentType, expectedPrefix: "/stream/" },
    { contentType: "post" as DiscoveryContentType, expectedPrefix: "/community/" },
  ])(
    "ENDING action ($contentType): navigates to correct route, dismisses, leaves no lingering toast",
    ({ contentType, expectedPrefix }) => {
      const item = makeBoostedItem({
        contentType,
        contentId: `route-${contentType}`,
        expiresAt: new Date(Date.now() + 6 * 60_000).toISOString(),
      });
      // 4 duplicate cards for the same boost key.
      renderCards(Array(4).fill(item));

      // Cross into the ENDING window.
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

      // Navigated to the correct route.
      const expectedHref = expectedHrefFor(item);
      expect(locSpy.hrefs).toEqual([expectedHref]);
      expect(expectedHref.startsWith(expectedPrefix)).toBe(true);

      // Toast was dismissed and no live toast remains.
      expect(toastFn.__live.has(id)).toBe(false);
      expect(toastFn.__dismissed.has(id)).toBe(true);
      expect(toastFn.__live.size).toBe(0);

      // Time marches on — no second ending toast.
      act(() => {
        vi.advanceTimersByTime(2 * 60_000);
      });
      expect(callsForExact("Boost ending soon", titleForItem(item))).toHaveLength(1);
      expect(toastFn.__live.size).toBe(0);
    },
  );

  it("ENDED action (post): navigates to /community/:creator?post=:id, dismisses, leaves no lingering toast", () => {
    const item = makeBoostedItem({
      contentType: "post",
      contentId: "post-XYZ",
      creatorId: "creator-Z",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    });
    renderCards(Array(5).fill(item));

    // Cross past expiry → ENDED.
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

    expect(locSpy.hrefs).toEqual([`/community/creator-Z?post=post-XYZ`]);
    expect(toastFn.__live.has(id)).toBe(false);
    expect(toastFn.__dismissed.has(id)).toBe(true);
    expect(toastFn.__live.size).toBe(0);

    act(() => {
      vi.advanceTimersByTime(15 * 60_000);
    });
    expect(callsForExact("Boost ended", titleForItem(item))).toHaveLength(1);
    expect(toastFn.__live.size).toBe(0);
  });

  it("ENDED action (recording): navigates to /stream/:slug?type=recording, dismisses, leaves no lingering toast", () => {
    const item = makeBoostedItem({
      contentType: "recording",
      contentId: "rec-1",
      slug: "rec-pretty",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    });
    renderCards(Array(3).fill(item));

    act(() => {
      vi.advanceTimersByTime(2 * 60_000 + 1000);
    });
    const calls = callsForExact("Boost ended", titleForItem(item));
    expect(calls).toHaveLength(1);

    act(() => {
      clickActionForExact("Boost ended", titleForItem(item));
    });

    expect(locSpy.hrefs).toEqual([`/stream/rec-pretty?type=recording`]);
    expect(toastFn.__live.size).toBe(0);

    act(() => {
      vi.advanceTimersByTime(10 * 60_000);
    });
    expect(callsForExact("Boost ended", titleForItem(item))).toHaveLength(1);
    expect(toastFn.__live.size).toBe(0);
  });

  it("Falls back to content_id when slug is missing (video) — action navigates to /videos/:content_id", () => {
    const item = makeBoostedItem({
      contentType: "video",
      contentId: "no-slug-id",
      slug: null,
      expiresAt: new Date(Date.now() + 6 * 60_000).toISOString(),
    });
    renderCards(Array(2).fill(item));

    act(() => {
      vi.advanceTimersByTime(2 * 60_000 + 1000);
    });
    expect(callsForExact("Boost ending soon", titleForItem(item))).toHaveLength(1);

    act(() => {
      clickActionForExact("Boost ending soon", titleForItem(item));
    });

    expect(locSpy.hrefs).toEqual([`/videos/no-slug-id`]);
    expect(toastFn.__live.size).toBe(0);
  });

  it("Many distinct keys + mixed content types: each action navigates to its own route, all dismissed, none lingering", () => {
    const specs: Array<{
      contentType: DiscoveryContentType;
      contentId: string;
    }> = [
      { contentType: "video", contentId: "vA" },
      { contentType: "clip", contentId: "cB" },
      { contentType: "stream", contentId: "sC" },
      { contentType: "recording", contentId: "rD" },
      { contentType: "post", contentId: "pE" },
      { contentType: "video", contentId: "vF" },
    ];
    const items = specs.map((s, i) =>
      makeBoostedItem({
        contentType: s.contentType,
        contentId: s.contentId,
        expiresAt: new Date(Date.now() + 6 * 60_000 + i * 100).toISOString(),
      }),
    );
    // 3 duplicate cards per key.
    renderCards(items.flatMap((it) => Array(3).fill(it)));

    act(() => {
      vi.advanceTimersByTime(2 * 60_000 + 1000);
    });
    expect(totalCountForPrefix("Boost ending soon")).toBe(items.length);
    expect(toastFn.__live.size).toBe(items.length);

    // Click each unique key's action exactly once.
    act(() => {
      for (const item of items) {
        clickActionForExact("Boost ending soon", titleForItem(item));
      }
    });

    // Every action navigated to the right URL — and no others.
    const expected = items.map(expectedHrefFor);
    expect(locSpy.hrefs).toHaveLength(items.length);
    expect(new Set(locSpy.hrefs)).toEqual(new Set(expected));

    // Every toast was dismissed; nothing lingers.
    expect(toastFn.__live.size).toBe(0);
    expect(toastFn.__dismissed.size).toBe(items.length);

    // Time marches on — no key produces a second ending toast.
    act(() => {
      vi.advanceTimersByTime(3 * 60_000);
    });
    expect(totalCountForPrefix("Boost ending soon")).toBe(items.length);
    expect(toastFn.__live.size).toBe(0);
  });
});
