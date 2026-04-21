import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, act, cleanup, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import CreatorTour, { CREATOR_TOUR_STEPS } from "./CreatorTour";
import {
  getLiveRegion,
  getAdvanceButton,
  expectAriaContract,
} from "./__tests__/creatorTourTestUtils";

/**
 * End-to-end style test for the CreatorTour live region driven by the real
 * browser router. Walks every step via the advance CTA and verifies the
 * live region announces each step's title and body.
 */

const ANNOUNCE_DELAY_MS = 100;

const renderTour = () => {
  window.history.pushState({}, "", "/dashboard");
  return render(
    <BrowserRouter>
      <CreatorTour forceOpen />
    </BrowserRouter>,
  );
};

const expectedMessage = (idx: number) => {
  const s = CREATOR_TOUR_STEPS[idx];
  return `Step ${idx + 1} of ${CREATOR_TOUR_STEPS.length}. ${s.title}. ${s.body}`;
};

describe("CreatorTour — live region E2E across real navigation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    window.history.pushState({}, "", "/dashboard");
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    window.history.pushState({}, "", "/");
  });

  it("announces every step's title and body as the user advances through the tour", () => {
    renderTour();

    act(() => { vi.advanceTimersByTime(ANNOUNCE_DELAY_MS); });
    expect(getLiveRegion().textContent).toBe(expectedMessage(0));

    for (let i = 1; i < CREATOR_TOUR_STEPS.length; i++) {
      act(() => { fireEvent.click(getAdvanceButton()); });
      expect(getLiveRegion().textContent).toBe("");

      act(() => { vi.advanceTimersByTime(ANNOUNCE_DELAY_MS); });
      expect(getLiveRegion().textContent).toBe(expectedMessage(i));
    }
  });

  it("keeps the live region wired with correct ARIA attributes throughout the flow", () => {
    renderTour();
    act(() => { vi.advanceTimersByTime(ANNOUNCE_DELAY_MS); });

    for (let i = 1; i < Math.min(3, CREATOR_TOUR_STEPS.length); i++) {
      act(() => { fireEvent.click(getAdvanceButton()); });
      act(() => { vi.advanceTimersByTime(ANNOUNCE_DELAY_MS); });

      const region = getLiveRegion();
      expectAriaContract(region);
      expect(region.textContent).toBe(expectedMessage(i));
    }
  });
});
