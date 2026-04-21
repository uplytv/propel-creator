import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// --- Mocks ---------------------------------------------------------------

vi.mock("sonner", () => ({
  toast: vi.fn(),
}));

// LiveBadge / useLiveViewerCount touch realtime/supabase — stub them out.
vi.mock("./LiveBadge", () => ({
  default: () => null,
}));
vi.mock("@/hooks/useLiveViewerCount", () => ({
  useLiveViewerCount: () => ({ count: 0 }),
}));

import { toast } from "sonner";
import DiscoveryFeedCard from "./DiscoveryFeedCard";
import { __resetBoostToastDedupeForTests } from "./boostToastDedupe";
import { __resetInvalidatedBoostExpiriesForTests } from "./boostInvalidation";
import type { DiscoveryItem } from "@/hooks/useDiscoveryAlgorithmFeed";

// --- Helpers -------------------------------------------------------------

function makeBoostedItem(expiresAt: string): DiscoveryItem {
  return {
    content_id: "vid-123",
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
    title: "Promoted Video",
    thumbnail_url: null,
    slug: "promoted-video",
  };
}

function renderManyCards(item: DiscoveryItem, count: number) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        {Array.from({ length: count }, (_, i) => (
          <DiscoveryFeedCard key={i} item={item} />
        ))}
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// --- Tests ---------------------------------------------------------------

describe("DiscoveryFeedCard — boost toast dedupe across many cards", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Anchor "now" so boost timestamps are deterministic.
    vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));
    __resetBoostToastDedupeForTests();
    __resetInvalidatedBoostExpiriesForTests();
    (toast as unknown as ReturnType<typeof vi.fn>).mockClear();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("fires the 'ending' toast exactly once when 10 cards render the same promoted item crossing the 5-min threshold", () => {
    // Boost expires in 6 minutes — starts in "active" state.
    const expiresAt = new Date(Date.now() + 6 * 60_000).toISOString();
    const item = makeBoostedItem(expiresAt);

    renderManyCards(item, 10);

    // No toast on initial mount (state goes from null -> active, no transition fires).
    expect(toast).not.toHaveBeenCalled();

    // Advance ~2 minutes so remaining time drops below 5 min => "ending".
    // Each card's minute-tick effect re-runs and tries to toast.
    act(() => {
      vi.advanceTimersByTime(2 * 60_000 + 1000);
    });

    const endingCalls = (toast as unknown as ReturnType<typeof vi.fn>).mock.calls.filter(
      (c) => typeof c[0] === "string" && c[0].startsWith("Boost ending soon"),
    );
    expect(endingCalls).toHaveLength(1);
  });

  it("fires the 'ended' toast exactly once when 10 cards render the same promoted item that expires", () => {
    // Boost expires in 3 minutes — starts already in "ending" state.
    const expiresAt = new Date(Date.now() + 3 * 60_000).toISOString();
    const item = makeBoostedItem(expiresAt);

    renderManyCards(item, 10);

    // Cross past expiry.
    act(() => {
      vi.advanceTimersByTime(4 * 60_000 + 1000);
    });

    const endedCalls = (toast as unknown as ReturnType<typeof vi.fn>).mock.calls.filter(
      (c) => typeof c[0] === "string" && c[0].startsWith("Boost ended"),
    );
    expect(endedCalls).toHaveLength(1);
  });

  it("fires exactly one 'ending' AND one 'ended' toast across the full lifecycle with many cards", () => {
    // Boost expires in 6 min: active -> ending (after ~1m) -> ended (after ~6m).
    const expiresAt = new Date(Date.now() + 6 * 60_000).toISOString();
    const item = makeBoostedItem(expiresAt);

    renderManyCards(item, 8);

    // Move to "ending" window.
    act(() => {
      vi.advanceTimersByTime(2 * 60_000 + 1000);
    });
    // Move past expiry.
    act(() => {
      vi.advanceTimersByTime(5 * 60_000 + 1000);
    });

    const calls = (toast as unknown as ReturnType<typeof vi.fn>).mock.calls;
    const endingCalls = calls.filter(
      (c) => typeof c[0] === "string" && c[0].startsWith("Boost ending soon"),
    );
    const endedCalls = calls.filter(
      (c) => typeof c[0] === "string" && c[0].startsWith("Boost ended"),
    );

    expect(endingCalls).toHaveLength(1);
    expect(endedCalls).toHaveLength(1);
  });
});
