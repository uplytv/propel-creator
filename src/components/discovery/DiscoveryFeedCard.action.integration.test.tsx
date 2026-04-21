import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// --- Mocks ---------------------------------------------------------------
//
// Sonner is mocked to capture both the message and any `action` passed in
// the second-argument options object. We expose helpers on the mock so the
// test can simulate the user clicking the toast's action button.
vi.mock("sonner", () => {
  const dismissed = new Set<number>();
  const fn = vi.fn((..._args: unknown[]) => Math.floor(Math.random() * 1_000_000));
  (fn as unknown as { dismiss: (id?: number) => void }).dismiss = vi.fn(
    (id?: number) => {
      if (typeof id === "number") dismissed.add(id);
    },
  );
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
import type { DiscoveryItem } from "@/hooks/useDiscoveryAlgorithmFeed";

const toastFn = toast as unknown as ReturnType<typeof vi.fn> & {
  dismiss: ReturnType<typeof vi.fn>;
  __dismissed: Set<number>;
};

// --- Helpers -------------------------------------------------------------

function makeBoostedItem(expiresAt: string): DiscoveryItem {
  return {
    content_id: "vid-action-1",
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
    title: "Promoted Action Video",
    thumbnail_url: null,
    slug: "promoted-action-video",
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

function callsStartingWith(prefix: string) {
  return toastFn.mock.calls.filter(
    (c) => typeof c[0] === "string" && (c[0] as string).startsWith(prefix),
  );
}

/**
 * Simulate the user clicking a toast's action button. If the toast was created
 * with an `action: { label, onClick }` option, invoke `onClick`. As is sonner's
 * default behavior, also dismiss the toast.
 */
function clickToastAction(prefix: string) {
  const idx = toastFn.mock.calls.findIndex(
    (c) => typeof c[0] === "string" && (c[0] as string).startsWith(prefix),
  );
  if (idx === -1) return false;
  const opts = toastFn.mock.calls[idx]?.[1] as
    | { action?: { onClick?: (e?: unknown) => void } }
    | undefined;
  opts?.action?.onClick?.();
  const id = toastFn.mock.results[idx]?.value as number | undefined;
  toastFn.dismiss(id);
  return true;
}

// --- Tests ---------------------------------------------------------------

describe("DiscoveryFeedCard — toast action click does not re-fire across cards", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));
    __resetBoostToastDedupeForTests();
    __resetInvalidatedBoostExpiriesForTests();
    toastFn.__dismissed.clear();
    toastFn.mockClear();
    toastFn.dismiss.mockClear();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("clicking the action on the ENDING toast does not produce a second ending toast across many cards", () => {
    const expiresAt = new Date(Date.now() + 6 * 60_000).toISOString();
    renderManyCards(makeBoostedItem(expiresAt), 12);

    // Cross into ending window.
    act(() => {
      vi.advanceTimersByTime(2 * 60_000 + 1000);
    });
    expect(callsStartingWith("Boost ending soon")).toHaveLength(1);

    // User clicks the toast action (whether or not the toast defines one).
    act(() => {
      clickToastAction("Boost ending soon");
    });

    // More minute ticks pass — every card's effect re-runs.
    act(() => {
      vi.advanceTimersByTime(3 * 60_000 + 1000);
    });

    expect(callsStartingWith("Boost ending soon")).toHaveLength(1);
  });

  it("clicking the action on the ENDED toast does not produce a second ended toast across many cards", () => {
    const expiresAt = new Date(Date.now() + 3 * 60_000).toISOString();
    renderManyCards(makeBoostedItem(expiresAt), 12);

    // Cross past expiry.
    act(() => {
      vi.advanceTimersByTime(4 * 60_000 + 1000);
    });
    expect(callsStartingWith("Boost ended")).toHaveLength(1);

    // User clicks the toast action.
    act(() => {
      clickToastAction("Boost ended");
    });

    // More time passes — straggling card timers must not re-toast.
    act(() => {
      vi.advanceTimersByTime(10 * 60_000);
    });

    expect(callsStartingWith("Boost ended")).toHaveLength(1);
  });

  it("clicking actions across the full lifecycle still yields exactly one ending and one ended toast", () => {
    const expiresAt = new Date(Date.now() + 6 * 60_000).toISOString();
    renderManyCards(makeBoostedItem(expiresAt), 8);

    act(() => {
      vi.advanceTimersByTime(2 * 60_000 + 1000);
    });
    expect(callsStartingWith("Boost ending soon")).toHaveLength(1);

    act(() => {
      clickToastAction("Boost ending soon");
    });

    act(() => {
      vi.advanceTimersByTime(5 * 60_000 + 1000);
    });
    expect(callsStartingWith("Boost ended")).toHaveLength(1);

    act(() => {
      clickToastAction("Boost ended");
    });

    act(() => {
      vi.advanceTimersByTime(15 * 60_000);
    });

    expect(callsStartingWith("Boost ending soon")).toHaveLength(1);
    expect(callsStartingWith("Boost ended")).toHaveLength(1);
  });
});
