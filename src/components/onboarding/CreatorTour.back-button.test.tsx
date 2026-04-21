import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, act, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CreatorTour, { CREATOR_TOUR_STEPS } from "./CreatorTour";
import {
  getLiveRegion,
  getAdvanceButton,
  getBackButton,
  expectAdvanceForStep,
  keyboardActivate,
} from "./__tests__/creatorTourTestUtils";

/**
 * Verifies the Back button:
 *   - is disabled on step 1 (cannot go before the first step),
 *   - decrements the current step on each activation,
 *   - keeps `data-tour-step` on the advance button in sync, and
 *   - re-fires the correct live-region announcement for the previous step.
 */

const ANNOUNCE_DELAY_MS = 100;

const renderTour = () =>
  render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <CreatorTour forceOpen />
    </MemoryRouter>,
  );

const expectedMessage = (idx: number) => {
  const s = CREATOR_TOUR_STEPS[idx];
  return `Step ${idx + 1} of ${CREATOR_TOUR_STEPS.length}. ${s.title}. ${s.body}`;
};

describe("CreatorTour — Back button navigation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("disables Back on the first step", () => {
    renderTour();
    act(() => { vi.advanceTimersByTime(ANNOUNCE_DELAY_MS); });

    const back = getBackButton();
    expect(back.disabled).toBe(true);
  });

  it("decrements the current step, syncs data-tour-step, and re-announces", () => {
    renderTour();
    act(() => { vi.advanceTimersByTime(ANNOUNCE_DELAY_MS); });

    // Advance forward a few steps.
    for (let i = 0; i < 3; i++) {
      keyboardActivate(getAdvanceButton());
      act(() => { vi.advanceTimersByTime(ANNOUNCE_DELAY_MS); });
    }
    expectAdvanceForStep(CREATOR_TOUR_STEPS[3].id);
    expect(getLiveRegion().textContent).toBe(expectedMessage(3));

    // Step back twice and verify state.
    for (let target = 2; target >= 1; target--) {
      keyboardActivate(getBackButton());
      act(() => { vi.advanceTimersByTime(ANNOUNCE_DELAY_MS); });

      expectAdvanceForStep(CREATOR_TOUR_STEPS[target].id);
      expect(getLiveRegion().textContent).toBe(expectedMessage(target));
    }

    // Back to step 1 — Back is now disabled again.
    keyboardActivate(getBackButton());
    act(() => { vi.advanceTimersByTime(ANNOUNCE_DELAY_MS); });
    expectAdvanceForStep(CREATOR_TOUR_STEPS[0].id);
    expect(getLiveRegion().textContent).toBe(expectedMessage(0));
    expect(getBackButton().disabled).toBe(true);
  });
});
