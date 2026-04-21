import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// --- Mocks ---------------------------------------------------------------

// `toast` is a function returning an id; `toast.dismiss` cancels it. We mock
// both so we can simulate the user closing the toast early.
const dismissed = new Set<number>();
const toastFn = vi.fn((..._args: unknown[]) => {
  const id = Math.floor(Math.random() * 1_000_000);
  return id;
});
(toastFn as unknown as { dismiss: (id?: number) => void }).dismiss = vi.fn(
  (id?: number) => {
    if (typeof id === "number") dismissed.add(id);
  },
);

vi.mock("sonner", () => ({
  toast: toastFn,
}));

vi.mock("./LiveBadge", () => ({ default: () => null }));
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

function endingCalls() {
  return (toast as unknown as ReturnType<typeof vi.fn>).mock.calls.filter(
    (c) => typeof c[0] === "string" && (c[0] as string).startsWith("Boost ending soon"),
  );
}
function endedCalls() {
  return (toast as unknown as ReturnType<typeof vi.fn>).mock.calls.filter(
    (c) => typeof c[0] === "string" && (c[0] as string).startsWith("Boost ended"),
  );
}

// --- Tests ---------------------------------------------------------------

describe("DiscoveryFeedCard — dismissed toast does not re-fire across cards", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));
    __resetBoostToastDedupeForTests();
    __resetInvalidatedBoostExpiriesForTests();
    dismissed.clear();
    toastFn.mockClear();
    (
      (toastFn as unknown as { dismiss: ReturnType<typeof vi.fn> }).dismiss
    ).mockClear();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("ENDING: dismissing the toast does NOT cause a second 'ending' toast on the next minute tick", () => {
    // 6 minutes out — starts active.
    const expiresAt = new Date(Date.now() + 6 * 60_000).toISOString();
    renderManyCards(makeBoostedItem(expiresAt), 12);

    // Cross into the ending window (≤ 5 min remaining).
    act(() => {
      vi.advanceTimersByTime(2 * 60_000 + 1000);
    });
    expect(endingCalls()).toHaveLength(1);

    // User dismisses the toast immediately.
    const firstCallId = toastFn.mock.results[0]?.value as number | undefined;
    act(() => {
      (toast as unknown as { dismiss: (id?: number) => void }).dismiss(firstCallId);
    });
    expect(dismissed.size).toBe(1);

    // Several more minute ticks pass while still in the ending window —
    // every card's effect re-runs but dedupe must hold.
    act(() => {
      vi.advanceTimersByTime(2 * 60_000 + 1000);
    });

    expect(endingCalls()).toHaveLength(1);
  });

  it("ENDED: dismissing the toast does NOT cause a second 'ended' toast as more cards' timers fire", () => {
    // 3 minutes out — already in ending window.
    const expiresAt = new Date(Date.now() + 3 * 60_000).toISOString();
    renderManyCards(makeBoostedItem(expiresAt), 12);

    // Cross past expiry.
    act(() => {
      vi.advanceTimersByTime(4 * 60_000 + 1000);
    });
    expect(endedCalls()).toHaveLength(1);

    // User dismisses the ended toast right away.
    const endedToastResult = toastFn.mock.results.find((_, i) => {
      const arg = toastFn.mock.calls[i]?.[0];
      return typeof arg === "string" && (arg as string).startsWith("Boost ended");
    });
    const endedId = endedToastResult?.value as number | undefined;
    act(() => {
      (toast as unknown as { dismiss: (id?: number) => void }).dismiss(endedId);
    });
    expect(dismissed.size).toBe(1);

    // More minute ticks — any straggling card timers must NOT re-toast.
    act(() => {
      vi.advanceTimersByTime(5 * 60_000 + 1000);
    });

    expect(endedCalls()).toHaveLength(1);
  });

  it("Full lifecycle with mid-flight dismissals: still exactly one ending and one ended toast", () => {
    const expiresAt = new Date(Date.now() + 6 * 60_000).toISOString();
    renderManyCards(makeBoostedItem(expiresAt), 8);

    // Enter ending window.
    act(() => {
      vi.advanceTimersByTime(2 * 60_000 + 1000);
    });
    expect(endingCalls()).toHaveLength(1);

    // Dismiss ending toast.
    const endingId = toastFn.mock.results[0]?.value as number | undefined;
    act(() => {
      (toast as unknown as { dismiss: (id?: number) => void }).dismiss(endingId);
    });

    // Cross past expiry.
    act(() => {
      vi.advanceTimersByTime(5 * 60_000 + 1000);
    });
    expect(endedCalls()).toHaveLength(1);

    // Dismiss ended toast.
    const endedToastResult = toastFn.mock.results.find((_, i) => {
      const arg = toastFn.mock.calls[i]?.[0];
      return typeof arg === "string" && (arg as string).startsWith("Boost ended");
    });
    const endedId = endedToastResult?.value as number | undefined;
    act(() => {
      (toast as unknown as { dismiss: (id?: number) => void }).dismiss(endedId);
    });

    // Let more time pass — no further toasts should appear.
    act(() => {
      vi.advanceTimersByTime(10 * 60_000);
    });

    expect(endingCalls()).toHaveLength(1);
    expect(endedCalls()).toHaveLength(1);
    expect(dismissed.size).toBe(2);
  });
});
