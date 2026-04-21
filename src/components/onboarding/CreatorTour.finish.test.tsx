import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, act, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CreatorTour, { CREATOR_TOUR_STEPS } from "./CreatorTour";
import {
  getAdvanceButton,
  expectAdvanceForStep,
  queryPopover,
  queryLiveRegion,
  keyboardActivate,
  TOUR_TESTID,
} from "./__tests__/creatorTourTestUtils";

/**
 * Verifies the FINISH path of the tour:
 *   - The final step's advance control is the finish CTA (aria-label includes
 *     "finish") and is targeted by data-tour-step="<last step id>".
 *   - Activating it closes the tour: the popover unmounts, the advance button
 *     is removed from the DOM, the live region is torn down, the onComplete
 *     callback fires, and the persistence flag is written so the tour does
 *     not auto-reopen.
 */

const ANNOUNCE_DELAY_MS = 100;
const STORAGE_KEY = "uply_creator_tour_v1";
const LAST_STEP = CREATOR_TOUR_STEPS[CREATOR_TOUR_STEPS.length - 1];

const renderTour = (onComplete?: () => void) =>
  render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <CreatorTour forceOpen onComplete={onComplete} />
    </MemoryRouter>,
  );

const walkToFinalStep = () => {
  // Step 0 is already mounted on render; advance through every intermediate
  // step until the finish CTA is the visible advance control.
  act(() => { vi.advanceTimersByTime(ANNOUNCE_DELAY_MS); });
  for (let i = 0; i < CREATOR_TOUR_STEPS.length - 1; i++) {
    keyboardActivate(getAdvanceButton());
    act(() => { vi.advanceTimersByTime(ANNOUNCE_DELAY_MS); });
  }
};

describe("CreatorTour — finish control closes the tour", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    localStorage.clear();
  });

  it("exposes a finish-flavored advance control on the last step", () => {
    renderTour();
    walkToFinalStep();

    const finishBtn = expectAdvanceForStep(LAST_STEP.id);
    const ariaLabel = (finishBtn.getAttribute("aria-label") || "").toLowerCase();
    expect(ariaLabel).toContain("finish");
    expect(finishBtn.disabled).toBe(false);
    // Visible CTA copy comes from the last step.
    expect(finishBtn.textContent || "").toContain(LAST_STEP.cta || "Finish");
  });

  it("activating finish unmounts the popover, advance button, and live region", () => {
    renderTour();
    walkToFinalStep();

    // Sanity: tour UI is present before finishing.
    expect(queryPopover()).not.toBeNull();
    expect(queryLiveRegion()).not.toBeNull();

    keyboardActivate(expectAdvanceForStep(LAST_STEP.id));
    // Allow any pending debounce / animation frame timers to flush.
    act(() => { vi.advanceTimersByTime(ANNOUNCE_DELAY_MS); });

    // The whole tour is gone — no popover, no advance control, no live region.
    expect(queryPopover()).toBeNull();
    expect(queryLiveRegion()).toBeNull();
    expect(
      document.querySelector(`[data-testid="${TOUR_TESTID.advance}"]`),
    ).toBeNull();
  });

  it("invokes onComplete and persists the completion flag so the tour doesn't auto-reopen", () => {
    const onComplete = vi.fn();
    renderTour(onComplete);
    walkToFinalStep();

    keyboardActivate(expectAdvanceForStep(LAST_STEP.id));
    act(() => { vi.advanceTimersByTime(ANNOUNCE_DELAY_MS); });

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(STORAGE_KEY)).toBe("1");
  });
});
