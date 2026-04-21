import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// --- Mocks ---------------------------------------------------------------

vi.mock("@/lib/posthog", () => ({
  trackEvent: vi.fn(),
  initPostHog: vi.fn(),
  identifyUser: vi.fn(),
  resetPostHog: vi.fn(),
}));

vi.mock("sonner", () => {
  let nextId = 1;
  const live = new Set<number>();
  const dismissed = new Set<number>();
  const fn = vi.fn((..._args: unknown[]) => {
    const id = nextId++;
    live.add(id);
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
import { trackEvent } from "@/lib/posthog";
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
const trackFn = trackEvent as unknown as ReturnType<typeof vi.fn>;

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

function titleForItem(item: DiscoveryItem) {
  return `Promoted ${item.content_type} ${item.content_id}`;
}

function callsForExact(prefix: string, title: string) {
  const expected = `${prefix}: ${title}`;
  return toastFn.mock.calls
    .map((c, i) => ({ c, i, id: toastFn.mock.results[i]?.value as number }))
    .filter(({ c }) => c[0] === expected);
}

function clickActionForExact(prefix: string, title: string) {
  for (const { c } of callsForExact(prefix, title)) {
    const opts = c[1] as { action?: { onClick?: () => void } } | undefined;
    opts?.action?.onClick?.();
  }
}

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

function eventsNamed(name: string) {
  return trackFn.mock.calls
    .filter((c) => c[0] === name)
    .map((c) => c[1] as Record<string, unknown>);
}

// --- Tests ---------------------------------------------------------------

describe("DiscoveryFeedCard — analytics tracking for boost toast actions", () => {
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
    trackFn.mockClear();
    locSpy = installLocationSpy();
  });

  afterEach(() => {
    locSpy.restore();
    cleanup();
    vi.useRealTimers();
  });

  it("ENDING click: emits action event with route+state and a paired dismiss event (via=action)", () => {
    const item = makeBoostedItem({
      contentType: "video",
      contentId: "vid-1",
      expiresAt: new Date(Date.now() + 6 * 60_000).toISOString(),
      slug: "promo-video-1",
    });
    renderCards([item]);

    act(() => {
      vi.advanceTimersByTime(2 * 60_000 + 1000);
    });

    const calls = callsForExact("Boost ending soon", titleForItem(item));
    expect(calls).toHaveLength(1);
    const toastId = calls[0]!.id;

    expect(eventsNamed("boost_toast_action_clicked")).toHaveLength(0);

    act(() => {
      clickActionForExact("Boost ending soon", titleForItem(item));
    });

    const clicks = eventsNamed("boost_toast_action_clicked");
    expect(clicks).toHaveLength(1);
    expect(clicks[0]).toMatchObject({
      boost_state: "ending",
      content_type: "video",
      content_id: "vid-1",
      creator_id: "creator-1",
      route: expectedHrefFor(item),
    });
    expect(clicks[0].boost_key).toEqual(expect.any(String));

    expect(locSpy.hrefs).toEqual([expectedHrefFor(item)]);

    const dismisses = eventsNamed("boost_toast_dismissed");
    expect(dismisses).toHaveLength(1);
    expect(dismisses[0]).toMatchObject({
      boost_state: "ending",
      via: "action",
      boost_key: clicks[0].boost_key,
    });

    expect(toastFn.dismiss).toHaveBeenCalledWith(toastId);
    expect(toastFn.__live.has(toastId)).toBe(false);
    expect(toastFn.__dismissed.has(toastId)).toBe(true);
  });

  it("ENDED click: emits action event with state='ended' and dismiss event with via=action", () => {
    const item = makeBoostedItem({
      contentType: "post",
      contentId: "post-XYZ",
      creatorId: "creator-Z",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      slug: null,
    });
    renderCards([item]);

    act(() => {
      vi.advanceTimersByTime(2 * 60_000 + 1000);
    });

    const calls = callsForExact("Boost ended", titleForItem(item));
    expect(calls).toHaveLength(1);
    const toastId = calls[0]!.id;

    act(() => {
      clickActionForExact("Boost ended", titleForItem(item));
    });

    const endedClicks = eventsNamed("boost_toast_action_clicked").filter(
      (e) => e.boost_state === "ended",
    );
    expect(endedClicks).toHaveLength(1);
    expect(endedClicks[0]).toMatchObject({
      content_type: "post",
      content_id: "post-XYZ",
      creator_id: "creator-Z",
      route: `/community/creator-Z?post=post-XYZ`,
    });

    expect(locSpy.hrefs).toContain(`/community/creator-Z?post=post-XYZ`);

    const endedDismisses = eventsNamed("boost_toast_dismissed").filter(
      (e) => e.boost_state === "ended",
    );
    expect(endedDismisses).toHaveLength(1);
    expect(endedDismisses[0]).toMatchObject({ via: "action" });

    expect(toastFn.dismiss).toHaveBeenCalledWith(toastId);
    expect(toastFn.__dismissed.has(toastId)).toBe(true);
  });

  it("dedupes across duplicate cards: 4 cards for one key still produce only 1 click + 1 dismiss event", () => {
    const item = makeBoostedItem({
      contentType: "stream",
      contentId: "stream-dup",
      expiresAt: new Date(Date.now() + 6 * 60_000).toISOString(),
      slug: "promo-stream-dup",
    });
    renderCards(Array(4).fill(item));

    act(() => {
      vi.advanceTimersByTime(2 * 60_000 + 1000);
    });

    expect(callsForExact("Boost ending soon", titleForItem(item))).toHaveLength(1);

    act(() => {
      clickActionForExact("Boost ending soon", titleForItem(item));
    });

    expect(eventsNamed("boost_toast_action_clicked")).toHaveLength(1);
    expect(eventsNamed("boost_toast_dismissed")).toHaveLength(1);
    expect(locSpy.hrefs).toEqual([expectedHrefFor(item)]);
  });

  it("emits a unique route + boost_key per distinct boost when multiple toasts are clicked", () => {
    const items: DiscoveryItem[] = [
      makeBoostedItem({ contentType: "video", contentId: "v1", expiresAt: new Date(Date.now() + 6 * 60_000).toISOString(), slug: "v-1" }),
      makeBoostedItem({ contentType: "clip", contentId: "c1", expiresAt: new Date(Date.now() + 6 * 60_000).toISOString(), slug: "c-1" }),
      makeBoostedItem({ contentType: "post", contentId: "p1", expiresAt: new Date(Date.now() + 6 * 60_000).toISOString(), slug: null, creatorId: "creator-z" }),
    ];
    renderCards(items);

    act(() => {
      vi.advanceTimersByTime(2 * 60_000 + 1000);
    });

    for (const item of items) {
      act(() => {
        clickActionForExact("Boost ending soon", titleForItem(item));
      });
    }

    const clicks = eventsNamed("boost_toast_action_clicked");
    expect(clicks).toHaveLength(3);

    const routes = clicks.map((c) => c.route).sort();
    expect(routes).toEqual(items.map(expectedHrefFor).sort());

    const keys = new Set(clicks.map((c) => c.boost_key as string));
    expect(keys.size).toBe(3);

    const dismisses = eventsNamed("boost_toast_dismissed");
    expect(dismisses).toHaveLength(3);
    expect(new Set(dismisses.map((d) => d.boost_key as string))).toEqual(keys);
    expect(dismisses.every((d) => d.via === "action")).toBe(true);
    expect(dismisses.every((d) => d.boost_state === "ending")).toBe(true);

    // Every toast was actually dismissed.
    expect(toastFn.__live.size).toBe(0);
    expect(toastFn.__dismissed.size).toBe(3);
  });
});
