import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// --- Mocks ---------------------------------------------------------------

vi.mock("sonner", () => {
  const fn = vi.fn((..._args: unknown[]) => 1);
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
import type { DiscoveryItem } from "@/hooks/useDiscoveryAlgorithmFeed";

const toastFn = toast as unknown as ReturnType<typeof vi.fn>;

// --- Helpers -------------------------------------------------------------

function makeBoostedItem(expiresAt: string): DiscoveryItem {
  return {
    content_id: "snap-1",
    content_type: "video",
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
    boost_expires_at: expiresAt,
    created_at: new Date().toISOString(),
    title: "My Promoted Video",
    thumbnail_url: null,
    slug: "promoted-snap-1",
  };
}

function renderCard(item: DiscoveryItem) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <DiscoveryFeedCard item={item} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function findCall(prefix: string) {
  return toastFn.mock.calls.find(
    (c) => typeof c[0] === "string" && (c[0] as string).startsWith(prefix),
  );
}

// --- Tests ---------------------------------------------------------------

describe("DiscoveryFeedCard — boost toast text + action wiring snapshots", () => {
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

  it("ENDING toast: exact title + description + action label snapshot, action.onClick is wired", () => {
    const item = makeBoostedItem(new Date(Date.now() + 6 * 60_000).toISOString());
    renderCard(item);

    act(() => {
      vi.advanceTimersByTime(2 * 60_000 + 1000);
    });

    const call = findCall("Boost ending soon");
    expect(call).toBeDefined();
    const [title, opts] = call as [
      string,
      { description?: string; action?: { label?: string; onClick?: unknown } },
    ];

    expect(title).toMatchInlineSnapshot(`"Boost ending soon: My Promoted Video"`);
    expect(opts.description).toMatchInlineSnapshot(
      `"Less than 5 minutes left in the promoted slot."`,
    );
    expect(opts.action?.label).toMatchInlineSnapshot(`"View"`);
    expect(typeof opts.action?.onClick).toBe("function");
  });

  it("ENDED toast: exact title + description + action label snapshot, action.onClick is wired", () => {
    const item = makeBoostedItem(new Date(Date.now() + 60_000).toISOString());
    renderCard(item);

    act(() => {
      vi.advanceTimersByTime(2 * 60_000 + 1000);
    });

    const call = findCall("Boost ended");
    expect(call).toBeDefined();
    const [title, opts] = call as [
      string,
      { description?: string; action?: { label?: string; onClick?: unknown } },
    ];

    expect(title).toMatchInlineSnapshot(`"Boost ended: My Promoted Video"`);
    expect(opts.description).toMatchInlineSnapshot(
      `"This promotion is no longer active."`,
    );
    expect(opts.action?.label).toMatchInlineSnapshot(`"View"`);
    expect(typeof opts.action?.onClick).toBe("function");
  });

  it("Falls back to 'Promoted item' in toast title when item.title is missing", () => {
    const item = makeBoostedItem(new Date(Date.now() + 6 * 60_000).toISOString());
    item.title = null as unknown as string;
    renderCard(item);

    act(() => {
      vi.advanceTimersByTime(2 * 60_000 + 1000);
    });

    const [title] = findCall("Boost ending soon") as [string, unknown];
    expect(title).toMatchInlineSnapshot(`"Boost ending soon: Promoted item"`);
  });
});
