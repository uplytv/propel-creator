import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, act, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CreatorTour, { CREATOR_TOUR_STEPS } from "./CreatorTour";
import {
  queryLiveRegion,
  getLiveRegion,
  getAdvanceButton,
  getSkipButton,
  keyboardActivate,
  expectAriaContract,
} from "./__tests__/creatorTourTestUtils";

/**
 * Keyboard-only accessibility test for the CreatorTour live region.
 * Verifies that after a Skip → Reopen lifecycle, a keyboard user can still
 * walk the tour using Tab + Enter, and the live region announces every step.
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

describe("CreatorTour — keyboard-only live region announcements after skip + reopen", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("announces each step via the live region when navigated by keyboard after a skip + reopen cycle", () => {
    renderTour();
    act(() => { vi.advanceTimersByTime(ANNOUNCE_DELAY_MS); });

    expectAriaContract(getLiveRegion());
    expect(getLiveRegion().textContent).toBe(expectedMessage(0));

    // Skip via keyboard.
    keyboardActivate(getSkipButton());
    act(() => { vi.advanceTimersByTime(ANNOUNCE_DELAY_MS); });
    expect(queryLiveRegion()).toBeNull();

    // Reopen.
    act(() => {
      window.dispatchEvent(new CustomEvent("uply:launch-tour"));
    });

    const region = getLiveRegion();
    expectAriaContract(region);
    expect(region.textContent).toBe("");

    act(() => { vi.advanceTimersByTime(ANNOUNCE_DELAY_MS); });
    expect(getLiveRegion().textContent).toBe(expectedMessage(0));

    // Walk every remaining step via keyboard activation only.
    for (let i = 1; i < CREATOR_TOUR_STEPS.length; i++) {
      keyboardActivate(getAdvanceButton());
      expect(getLiveRegion().textContent).toBe("");

      act(() => { vi.advanceTimersByTime(ANNOUNCE_DELAY_MS); });
      const announced = getLiveRegion();
      expectAriaContract(announced);
      expect(announced.textContent).toBe(expectedMessage(i));
    }
  });
});
