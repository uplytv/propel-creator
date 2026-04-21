import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, act, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CreatorTour, { CREATOR_TOUR_STEPS } from "./CreatorTour";
import {
  queryLiveRegion,
  getLiveRegion,
  getAdvanceButton,
  getSkipButton,
} from "./__tests__/creatorTourTestUtils";

/**
 * Verifies the live region behaves correctly across:
 *   1. Clicking "Skip tour" — region should clear and stop announcing.
 *   2. Reopening the tour via `uply:launch-tour` — region re-announces step 1.
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

describe("CreatorTour — live region on skip and reopen", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("clears the live region when the user clicks 'Skip tour'", () => {
    renderTour();

    act(() => { vi.advanceTimersByTime(ANNOUNCE_DELAY_MS); });
    expect(getLiveRegion().textContent).toBe(expectedMessage(0));

    act(() => { fireEvent.click(getSkipButton()); });
    act(() => { vi.advanceTimersByTime(ANNOUNCE_DELAY_MS); });
    expect(queryLiveRegion()).toBeNull();
  });

  it("re-announces step 1 when the tour is reopened after being skipped", () => {
    renderTour();

    act(() => { vi.advanceTimersByTime(ANNOUNCE_DELAY_MS); });
    expect(getLiveRegion().textContent).toBe(expectedMessage(0));

    act(() => { fireEvent.click(getAdvanceButton()); });
    act(() => { vi.advanceTimersByTime(ANNOUNCE_DELAY_MS); });
    expect(getLiveRegion().textContent).toBe(expectedMessage(1));

    act(() => { fireEvent.click(getSkipButton()); });
    act(() => { vi.advanceTimersByTime(ANNOUNCE_DELAY_MS); });
    expect(queryLiveRegion()).toBeNull();

    act(() => {
      window.dispatchEvent(new CustomEvent("uply:launch-tour"));
    });

    expect(getLiveRegion().textContent).toBe("");
    act(() => { vi.advanceTimersByTime(ANNOUNCE_DELAY_MS); });
    expect(getLiveRegion().textContent).toBe(expectedMessage(0));
  });
});
