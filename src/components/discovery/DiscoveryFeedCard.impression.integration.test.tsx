import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/lib/posthog", () => ({
  trackEvent: vi.fn(),
  initPostHog: vi.fn(),
  identifyUser: vi.fn(),
  resetPostHog: vi.fn(),
}));

vi.mock("sonner", () => {
  let nextId = 1;
  const fn = vi.fn(() => nextId++);
  (fn as unknown as { dismiss: (id?: number) => void }).dismiss = vi.fn();
  return { toast: fn };
});

vi.mock("./LiveBadge", () => ({ default: () => null }));
vi.mock("@/hooks/useLiveViewerCount", () => ({
  useLiveViewerCount: () => ({ count: 0 }),
}));

import { trackEvent } from "@/lib/posthog";
import DiscoveryFeedCard from "./DiscoveryFeedCard";
import { __resetBoostToastDedupeForTests } from "./boostToastDedupe";
import { __resetInvalidatedBoostExpiriesForTests } from "./boostInvalidation";
import { boostExpiryKey } from "./boostInvalidation";
import type {
  DiscoveryItem,
  DiscoveryContentType,
} from "@/hooks/useDiscoveryAlgorithmFeed";

const trackFn = trackEvent as unknown as ReturnType<typeof vi.fn>;

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

function renderCards(items: { item: DiscoveryItem; copies?: number }[]) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        {items.flatMap(({ item, copies = 1 }) =>
          Array.from({ length: copies }, (_, i) => (
            <DiscoveryFeedCard key={`${item.content_id}-${i}`} item={item} />
          )),
        )}
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function expectedHrefFor(item: DiscoveryItem): string {
  const slug = item.slug || item.content_id;
  switch (item.content_type) {
    case "video": return `/videos/${slug}`;
    case "clip": return `/clips/${slug}`;
    case "stream": return `/stream/${slug}`;
    case "recording": return `/stream/${slug}?type=recording`;
    case "post": return `/community/${item.creator_id}?post=${item.content_id}`;
    default: return `/stream/${slug}`;
  }
}

function impressions() {
  return trackFn.mock.calls
    .filter((c) => c[0] === "boost_toast_shown")
    .map((c) => c[1] as Record<string, unknown>);
}

describe("DiscoveryFeedCard — boost toast impression analytics", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));
    __resetBoostToastDedupeForTests();
    __resetInvalidatedBoostExpiriesForTests();
    trackFn.mockClear();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("emits boost_toast_shown with boost_state=ending, boost_key, and route on the ending transition", () => {
    const expiresAt = new Date(Date.now() + 6 * 60_000).toISOString();
    const item = makeBoostedItem({
      contentType: "video",
      contentId: "vid-1",
      expiresAt,
      slug: "promo-video-1",
    });
    renderCards([{ item }]);

    act(() => {
      vi.advanceTimersByTime(2 * 60_000 + 1000);
    });

    const ev = impressions();
    expect(ev).toHaveLength(1);
    expect(ev[0]).toMatchObject({
      boost_state: "ending",
      boost_key: boostExpiryKey("video", "vid-1", expiresAt),
      route: expectedHrefFor(item),
      content_type: "video",
      content_id: "vid-1",
      creator_id: "creator-1",
    });
  });

  it("emits boost_toast_shown with boost_state=ended, boost_key, and route when boost ends", () => {
    const expiresAt = new Date(Date.now() + 2 * 60_000).toISOString();
    const item = makeBoostedItem({
      contentType: "clip",
      contentId: "clip-9",
      expiresAt,
      slug: "promo-clip-9",
    });
    renderCards([{ item }]);

    act(() => {
      vi.advanceTimersByTime(3 * 60_000);
    });

    const ev = impressions().filter((e) => e.boost_state === "ended");
    expect(ev).toHaveLength(1);
    expect(ev[0]).toMatchObject({
      boost_state: "ended",
      boost_key: boostExpiryKey("clip", "clip-9", expiresAt),
      route: expectedHrefFor(item),
    });
  });

  it("dedupes impression events: multiple cards for the same boost key produce exactly one impression per state", () => {
    const expiresAt = new Date(Date.now() + 6 * 60_000).toISOString();
    const item = makeBoostedItem({
      contentType: "stream",
      contentId: "stream-7",
      expiresAt,
      slug: "promo-stream-7",
    });
    renderCards([{ item, copies: 5 }]);

    act(() => {
      vi.advanceTimersByTime(2 * 60_000 + 1000);
    });
    expect(impressions().filter((e) => e.boost_state === "ending")).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(5 * 60_000);
    });
    expect(impressions().filter((e) => e.boost_state === "ended")).toHaveLength(1);
  });

  it("emits one impression per distinct boost key with the correct route for each", () => {
    const now = Date.now();
    const items: DiscoveryItem[] = [
      makeBoostedItem({
        contentType: "video",
        contentId: "v1",
        expiresAt: new Date(now + 6 * 60_000).toISOString(),
      }),
      makeBoostedItem({
        contentType: "clip",
        contentId: "c1",
        expiresAt: new Date(now + 6 * 60_000).toISOString(),
        slug: null,
      }),
      makeBoostedItem({
        contentType: "post",
        contentId: "p1",
        expiresAt: new Date(now + 6 * 60_000).toISOString(),
        creatorId: "creator-42",
      }),
    ];
    renderCards(items.map((item) => ({ item, copies: 3 })));

    act(() => {
      vi.advanceTimersByTime(2 * 60_000 + 1000);
    });

    const endingImpressions = impressions().filter((e) => e.boost_state === "ending");
    expect(endingImpressions).toHaveLength(3);

    const byKey = new Map(
      endingImpressions.map((e) => [e.boost_key as string, e]),
    );
    for (const item of items) {
      const key = boostExpiryKey(
        item.content_type,
        item.content_id,
        item.boost_expires_at!,
      );
      const ev = byKey.get(key);
      expect(ev, `missing impression for ${key}`).toBeTruthy();
      expect(ev!.route).toBe(expectedHrefFor(item));
    }
  });
});
