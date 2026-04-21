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
    const opts = _args[1] as
      | { action?: { onClick?: (e?: unknown) => void } }
      | undefined;
    if (opts?.action?.onClick) {
      const original = opts.action.onClick;
      opts.action.onClick = (e?: unknown) => {
        original(e);
        // Real sonner auto-dismisses on action click; our component's own
        // dismiss() call would be a no-op duplicate in this case, but we still
        // want to detect that it was attempted, so we leave dismissal up to
        // whatever the component invokes via toast.dismiss().
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

function callsForExact(prefix: string, title: string) {
  const expected = `${prefix}: ${title}`;
  return toastFn.mock.calls
    .map((c, i) => ({ c, i }))
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
    cleanup();
    locSpy.restore();
    vi.useRealTimers();
  });

  it("fires boost_toast_action_clicked with route + state on ending toast click", () => {
    // Start with > 5 min remaining (active state)
    const expiresAt = new Date(Date.now() + 6 * 60_000).toISOString();
    const item = makeBoostedItem({
      contentType: "video",
      contentId: "vid-1",
      expiresAt,
      slug: "promo-video-1",
    });

    const { rerender } = renderCards([item]);

    // Move into ending window (≤ 5 min) and re-render so the effect runs.
    act(() => {
      vi.setSystemTime(new Date(Date.now() + 2 * 60_000));
    });
    rerender(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <MemoryRouter>
          <DiscoveryFeedCard item={item} />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const endingCalls = callsForExact("Boost ending soon", item.title!);
    expect(endingCalls.length).toBeGreaterThanOrEqual(1);

    // No analytics yet (action not clicked).
    expect(eventsNamed("boost_toast_action_clicked")).toHaveLength(0);

    clickActionForExact("Boost ending soon", item.title!);

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

    // Navigation actually happened to the right route.
    expect(locSpy.hrefs).toEqual([expectedHrefFor(item)]);

    // Dismiss event fired with via=action.
    const dismissed = eventsNamed("boost_toast_dismissed");
    expect(dismissed).toHaveLength(1);
    expect(dismissed[0]).toMatchObject({
      boost_state: "ending",
      via: "action",
    });
    expect(dismissed[0].boost_key).toEqual(clicks[0].boost_key);

    // toast.dismiss() was actually called for the toast id.
    expect(toastFn.dismiss).toHaveBeenCalledTimes(1);
    expect(toastFn.__live.size).toBe(0);
    expect(toastFn.__dismissed.size).toBe(1);
  });

  it("fires boost_toast_action_clicked with state='ended' and route on ended toast click", () => {
    // Start with 1 min remaining (ending), then expire fully.
    const expiresAt = new Date(Date.now() + 60_000).toISOString();
    const item = makeBoostedItem({
      contentType: "clip",
      contentId: "clip-99",
      expiresAt,
      slug: "promo-clip-99",
      creatorId: "creator-xyz",
    });

    const { rerender } = renderCards([item]);

    // Cross into ended (past expiry).
    act(() => {
      vi.setSystemTime(new Date(Date.now() + 2 * 60_000));
    });
    rerender(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <MemoryRouter>
          <DiscoveryFeedCard item={item} />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const endedCalls = callsForExact("Boost ended", item.title!);
    expect(endedCalls.length).toBeGreaterThanOrEqual(1);

    clickActionForExact("Boost ended", item.title!);

    const clicks = eventsNamed("boost_toast_action_clicked");
    // Could be 1 (ended only) or 2 (ending + ended) depending on transitions.
    const endedClicks = clicks.filter((e) => e.boost_state === "ended");
    expect(endedClicks).toHaveLength(1);
    expect(endedClicks[0]).toMatchObject({
      content_type: "clip",
      content_id: "clip-99",
      creator_id: "creator-xyz",
      route: expectedHrefFor(item),
    });

    expect(locSpy.hrefs).toContain(expectedHrefFor(item));

    const dismissed = eventsNamed("boost_toast_dismissed").filter(
      (e) => e.boost_state === "ended",
    );
    expect(dismissed).toHaveLength(1);
    expect(dismissed[0]).toMatchObject({ via: "action" });
  });

  it("deduplicates: many cards for the same key fire only one click + one dismiss event per user click", () => {
    const expiresAt = new Date(Date.now() + 6 * 60_000).toISOString();
    const items = Array.from({ length: 4 }, () =>
      makeBoostedItem({
        contentType: "stream",
        contentId: "stream-dup",
        expiresAt,
        slug: "promo-stream-dup",
      }),
    );

    const { rerender } = renderCards(items);

    act(() => {
      vi.setSystemTime(new Date(Date.now() + 2 * 60_000));
    });
    rerender(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <MemoryRouter>
          {items.map((item, i) => (
            <DiscoveryFeedCard key={i} item={item} />
          ))}
        </MemoryRouter>
      </QueryClientProvider>,
    );

    // Only one ending toast despite 4 cards (dedupe).
    const endingCalls = callsForExact("Boost ending soon", items[0].title!);
    expect(endingCalls).toHaveLength(1);

    clickActionForExact("Boost ending soon", items[0].title!);

    expect(eventsNamed("boost_toast_action_clicked")).toHaveLength(1);
    expect(eventsNamed("boost_toast_dismissed")).toHaveLength(1);
    expect(locSpy.hrefs).toHaveLength(1);
    expect(locSpy.hrefs[0]).toBe(expectedHrefFor(items[0]));
  });

  it("emits a unique route per distinct boost key when multiple toasts are clicked", () => {
    const expiresAt = new Date(Date.now() + 6 * 60_000).toISOString();
    const items: DiscoveryItem[] = [
      makeBoostedItem({ contentType: "video", contentId: "v1", expiresAt, slug: "v-1" }),
      makeBoostedItem({ contentType: "clip", contentId: "c1", expiresAt, slug: "c-1" }),
      makeBoostedItem({ contentType: "post", contentId: "p1", expiresAt, slug: null, creatorId: "creator-z" }),
    ];

    const { rerender } = renderCards(items);

    act(() => {
      vi.setSystemTime(new Date(Date.now() + 2 * 60_000));
    });
    rerender(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <MemoryRouter>
          {items.map((item, i) => (
            <DiscoveryFeedCard key={i} item={item} />
          ))}
        </MemoryRouter>
      </QueryClientProvider>,
    );

    for (const item of items) {
      clickActionForExact("Boost ending soon", item.title!);
    }

    const clicks = eventsNamed("boost_toast_action_clicked");
    expect(clicks).toHaveLength(3);

    const routes = clicks.map((c) => c.route).sort();
    const expected = items.map(expectedHrefFor).sort();
    expect(routes).toEqual(expected);

    // Every click event has a distinct boost_key.
    const keys = new Set(clicks.map((c) => c.boost_key));
    expect(keys.size).toBe(3);

    // Every click is paired with a dismiss event for the same key+state.
    const dismisses = eventsNamed("boost_toast_dismissed");
    expect(dismisses).toHaveLength(3);
    expect(new Set(dismisses.map((d) => d.boost_key))).toEqual(keys);
    expect(dismisses.every((d) => d.via === "action")).toBe(true);
    expect(dismisses.every((d) => d.boost_state === "ending")).toBe(true);
  });
});
