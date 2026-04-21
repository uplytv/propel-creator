import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, act, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CreatorTour, { CREATOR_TOUR_STEPS } from "./CreatorTour";
import {
  getLiveRegion,
  getAdvanceButton,
  getBackButton,
  expectAriaContract,
} from "./__tests__/creatorTourTestUtils";

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
    expectAriaContract(getLiveRegion());
  });

  it("announces the first step's title and body on open", () => {
    renderTour();
    flushAnnouncement();
    expect(getLiveRegion().textContent).toBe(expectedAnnouncement(0));
  });

  it("clears, then re-announces, after advancing to the next step", () => {
    renderTour();
    flushAnnouncement();

    act(() => { fireEvent.click(getAdvanceButton()); });
    expect(getLiveRegion().textContent).toBe("");

    flushAnnouncement();
    expect(getLiveRegion().textContent).toBe(expectedAnnouncement(1));
  });

  it("updates the announcement every time the step changes (forward + back)", () => {
    renderTour();
    flushAnnouncement();
    expect(getLiveRegion().textContent).toBe(expectedAnnouncement(0));

    for (let i = 1; i <= 2; i++) {
      act(() => { fireEvent.click(getAdvanceButton()); });
      flushAnnouncement();
      expect(getLiveRegion().textContent).toBe(expectedAnnouncement(i));
    }

    act(() => { fireEvent.click(getBackButton()); });
    flushAnnouncement();
    expect(getLiveRegion().textContent).toBe(expectedAnnouncement(1));
  });
});
