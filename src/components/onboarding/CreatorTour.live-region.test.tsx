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

  it("clears, then re-announces, after advancing to the next step", () => {
    renderTour();
    flushAnnouncement();

    const nextBtn = document.querySelector<HTMLButtonElement>(
      '[data-testid="creator-tour-popover"] button:last-of-type',
    );
    expect(nextBtn).toBeTruthy();

    act(() => {
      fireEvent.click(nextBtn!);
    });

    // eslint-disable-next-line no-console
    console.log("DOM after click:", document.body.innerHTML.slice(0, 500));
    // Immediately after the step change the region is cleared so screen
    // readers reliably treat the next message as a *new* announcement.
    const live = getLiveRegion();
    expect(live.textContent).toBe("");

    flushAnnouncement();
    expect(getLiveRegion().textContent).toBe(expectedAnnouncement(1));
  });

  it("updates the announcement every time the step changes (forward + back)", () => {
    renderTour();
    flushAnnouncement();
    expect(getLiveRegion().textContent).toBe(expectedAnnouncement(0));

    // Step 0 → 1 → 2
    for (let i = 1; i <= 2; i++) {
      const nextBtn = document.querySelector<HTMLButtonElement>(
        '[data-testid="creator-tour-popover"] button:last-of-type',
      );
      act(() => {
        fireEvent.click(nextBtn!);
      });
      flushAnnouncement();
      expect(getLiveRegion().textContent).toBe(expectedAnnouncement(i));
    }

    // Step 2 → 1 (Back button is the first button in the footer row)
    const backBtn = Array.from(
      document.querySelectorAll<HTMLButtonElement>(
        '[data-testid="creator-tour-popover"] button',
      ),
    ).find((b) => b.textContent?.trim().startsWith("Back"));
    expect(backBtn).toBeTruthy();
    act(() => {
      fireEvent.click(backBtn!);
    });
    flushAnnouncement();
    expect(getLiveRegion().textContent).toBe(expectedAnnouncement(1));
  });
});
