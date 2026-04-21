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

type ToastOpts = {
  description?: string;
  action?: { label: string; onClick: () => void };
  onDismiss?: (t?: unknown) => void;
  onAutoClose?: (t?: unknown) => void;
};

vi.mock("sonner", () => {
  let nextId = 1;
  const fn = vi.fn((_msg: string, _opts?: ToastOpts) => nextId++);
  (fn as unknown as { dismiss: (id?: number) => void }).dismiss = vi.fn();
  return { toast: fn };
});

import { toast } from "sonner";
import { trackEvent } from "@/lib/posthog";
import DiscoveryFeedCard from "./DiscoveryFeedCard";
import { __resetBoostToastDedupeForTests } from "./boostToastDedupe";
import {
  __resetInvalidatedBoostExpiriesForTests,
  boostExpiryKey,
} from "./boostInvalidation";
import type {
  DiscoveryItem,
  DiscoveryContentType,
} from "@/hooks/useDiscoveryAlgorithmFeed";

vi.mock("./LiveBadge", () => ({ default: () => null }));
vi.mock("@/hooks/useLiveViewerCount", () => ({
  useLiveViewerCount: () => ({ count: 0 }),
}));

const toastFn = toast as unknown as ReturnType<typeof vi.fn>;
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

function expectedHrefFor(item: DiscoveryItem): string {
  const slug = item.slug || item.content_id;
  switch (item.content_type) {
    case "video": return `/videos/${slug}`;
    case "clip": return `/clips/${slug}`;
    case "stream": return `/stream/${slug}`;
    default: return `/stream/${slug}`;
  }
}

function lastToastOpts(): ToastOpts | undefined {
  const last = toastFn.mock.calls[toastFn.mock.calls.length - 1];
  return last?.[1] as ToastOpts | undefined;
}

function dismissEvents() {
  return trackFn.mock.calls
    .filter((c) => c[0] === "boost_toast_dismissed")
    .map((c) => c[1] as Record<string, unknown>);
}

describe("DiscoveryFeedCard — boost toast non-action dismissal analytics", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));
    __resetBoostToastDedupeForTests();
    __resetInvalidatedBoostExpiriesForTests();
    toastFn.mockClear();
    trackFn.mockClear();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("ENDING: onDismiss (user swipe/close) emits boost_toast_dismissed with via=user, boost_state, boost_key, route", () => {
    const expiresAt = new Date(Date.now() + 6 * 60_000).toISOString();
    const item = makeBoostedItem({
      contentType: "video",
      contentId: "vid-1",
      expiresAt,
      slug: "promo-video-1",
    });
    renderCards([item]);

    act(() => {
      vi.advanceTimersByTime(2 * 60_000 + 1000);
    });

    const opts = lastToastOpts();
    expect(opts?.onDismiss).toBeTypeOf("function");
    opts!.onDismiss!();

    const ev = dismissEvents();
    expect(ev).toHaveLength(1);
    expect(ev[0]).toMatchObject({
      boost_state: "ending",
      boost_key: boostExpiryKey("video", "vid-1", expiresAt),
      route: expectedHrefFor(item),
      via: "user",
    });
  });

  it("ENDING: onAutoClose (timeout) emits via=auto", () => {
    const expiresAt = new Date(Date.now() + 6 * 60_000).toISOString();
    const item = makeBoostedItem({
      contentType: "clip",
      contentId: "clip-2",
      expiresAt,
      slug: "promo-clip-2",
    });
    renderCards([item]);

    act(() => {
      vi.advanceTimersByTime(2 * 60_000 + 1000);
    });

    lastToastOpts()!.onAutoClose!();

    expect(dismissEvents()).toEqual([
      expect.objectContaining({
        boost_state: "ending",
        boost_key: boostExpiryKey("clip", "clip-2", expiresAt),
        route: expectedHrefFor(item),
        via: "auto",
      }),
    ]);
  });

  it("ENDED: onDismiss emits with boost_state=ended and via=user", () => {
    const expiresAt = new Date(Date.now() + 2 * 60_000).toISOString();
    const item = makeBoostedItem({
      contentType: "stream",
      contentId: "str-3",
      expiresAt,
      slug: "promo-stream-3",
    });
    renderCards([item]);

    act(() => {
      vi.advanceTimersByTime(3 * 60_000);
    });

    lastToastOpts()!.onDismiss!();

    const ev = dismissEvents();
    expect(ev).toHaveLength(1);
    expect(ev[0]).toMatchObject({
      boost_state: "ended",
      boost_key: boostExpiryKey("stream", "str-3", expiresAt),
      route: expectedHrefFor(item),
      via: "user",
    });
  });

  it("does NOT double-fire: action click then onDismiss only emits one dismissed event (via=action)", () => {
    const expiresAt = new Date(Date.now() + 6 * 60_000).toISOString();
    const item = makeBoostedItem({
      contentType: "video",
      contentId: "vid-dup",
      expiresAt,
      slug: "promo-vid-dup",
    });
    renderCards([item]);

    act(() => {
      vi.advanceTimersByTime(2 * 60_000 + 1000);
    });

    const opts = lastToastOpts()!;
    // Replicate sonner: action click triggers onDismiss afterwards.
    opts.action!.onClick();
    opts.onDismiss!();

    const ev = dismissEvents();
    expect(ev).toHaveLength(1);
    expect(ev[0]).toMatchObject({ via: "action" });
  });

  it("onAutoClose then onDismiss does not double-emit", () => {
    const expiresAt = new Date(Date.now() + 6 * 60_000).toISOString();
    const item = makeBoostedItem({
      contentType: "video",
      contentId: "vid-auto",
      expiresAt,
    });
    renderCards([item]);

    act(() => {
      vi.advanceTimersByTime(2 * 60_000 + 1000);
    });

    const opts = lastToastOpts()!;
    opts.onAutoClose!();
    opts.onDismiss!();

    const ev = dismissEvents();
    expect(ev).toHaveLength(1);
    expect(ev[0]).toMatchObject({ via: "auto" });
  });
});
