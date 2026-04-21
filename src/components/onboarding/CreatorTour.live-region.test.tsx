import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, act, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CreatorTour, { CREATOR_TOUR_STEPS } from "./CreatorTour";

/**
 * Verifies the screen-reader live region updates on each step change with the
 * correct "Step X of N. <title>. <body>" announcement. The live region is
 * intentionally cleared then repopulated on every step transition, so we
 * advance timers past the 80ms re-population delay before asserting.
 */

const ANNOUNCE_DELAY_MS = 100; // > the 80ms debounce in CreatorTour

const renderTour = () =>
  render(
    // Pre-seed the router on /dashboard so the step-1 navigate() is a no-op
    // and doesn't tear down the tour portal mid-transition.
    <MemoryRouter initialEntries={["/dashboard"]}>
      <CreatorTour forceOpen />
    </MemoryRouter>,
  );

const getLiveRegion = (): HTMLElement => {
  const el = document.querySelector<HTMLElement>(
    '[data-testid="creator-tour-live-region"]',
  );
  if (!el) throw new Error("Tour live region not found in DOM");
  return el;
};

const expectedAnnouncement = (idx: number) => {
  const s = CREATOR_TOUR_STEPS[idx];
  return `Step ${idx + 1} of ${CREATOR_TOUR_STEPS.length}. ${s.title}. ${s.body}`;
};

const flushAnnouncement = () => {
  act(() => {
    vi.advanceTimersByTime(ANNOUNCE_DELAY_MS);
  });
};

describe("CreatorTour — aria-live announcements", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    // Centered welcome step doesn't depend on viewport, but set a sane size.
    Object.defineProperty(window, "innerWidth", { value: 430, configurable: true });
    Object.defineProperty(window, "innerHeight", { value: 932, configurable: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
    localStorage.clear();
  });

  it("renders a polite, atomic live region with the correct ARIA wiring", () => {
    renderTour();
    flushAnnouncement();

    const live = getLiveRegion();
    expect(live.getAttribute("role")).toBe("status");
    expect(live.getAttribute("aria-live")).toBe("polite");
    expect(live.getAttribute("aria-atomic")).toBe("true");
    // Visually hidden so it's exposed only to assistive tech.
    expect(live.className).toContain("sr-only");
  });

  it("announces the first step's title and body on open", () => {
    renderTour();
    flushAnnouncement();

    const live = getLiveRegion();
    expect(live.textContent).toBe(expectedAnnouncement(0));
  });

  const findFooterButton = (label: "Back" | RegExp): HTMLButtonElement => {
    const matcher =
      typeof label === "string"
        ? (text: string) => text.trim().startsWith(label)
        : (text: string) => label.test(text);
    const btn = Array.from(
      document.querySelectorAll<HTMLButtonElement>(
        '[data-testid="creator-tour-popover"] button',
      ),
    ).find((b) => matcher(b.textContent ?? ""));
    if (!btn) throw new Error(`Footer button not found for ${label}`);
    return btn;
  };

  // The "Next" CTA copy varies per step (e.g. "Start the tour", "Got it",
  // "Next", "Let's go"). We match it by excluding the other known buttons.
  const findNextButton = (): HTMLButtonElement => {
    const btn = Array.from(
      document.querySelectorAll<HTMLButtonElement>(
        '[data-testid="creator-tour-popover"] button',
      ),
    ).find((b) => {
      const text = (b.textContent ?? "").trim();
      const aria = b.getAttribute("aria-label") ?? "";
      return aria !== "Skip tour" && !text.startsWith("Back");
    });
    if (!btn) throw new Error("Next button not found in popover");
    return btn;
  };

  it("clears, then re-announces, after advancing to the next step", () => {
    renderTour();
    flushAnnouncement();

    act(() => {
      fireEvent.click(findNextButton());
    });

    // Immediately after the step change the region is cleared so screen
    // readers reliably treat the next message as a *new* announcement.
    expect(getLiveRegion().textContent).toBe("");

    flushAnnouncement();
    expect(getLiveRegion().textContent).toBe(expectedAnnouncement(1));
  });

  it("updates the announcement every time the step changes (forward + back)", () => {
    renderTour();
    flushAnnouncement();
    expect(getLiveRegion().textContent).toBe(expectedAnnouncement(0));

    // Step 0 → 1 → 2
    for (let i = 1; i <= 2; i++) {
      act(() => {
        fireEvent.click(findNextButton());
      });
      flushAnnouncement();
      expect(getLiveRegion().textContent).toBe(expectedAnnouncement(i));
    }

    // Step 2 → 1
    act(() => {
      fireEvent.click(findFooterButton("Back"));
    });
    flushAnnouncement();
    expect(getLiveRegion().textContent).toBe(expectedAnnouncement(1));
  });
});
