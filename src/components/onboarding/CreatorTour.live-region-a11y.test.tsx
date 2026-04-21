import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, act, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CreatorTour, { CREATOR_TOUR_STEPS } from "./CreatorTour";
import {
  queryLiveRegion,
  getLiveRegion,
  getSkipButton,
  expectAriaContract,
} from "./__tests__/creatorTourTestUtils";

/**
 * Accessibility test for the live region's ARIA contract across the
 * Skip → Reopen lifecycle.
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

describe("CreatorTour — live region a11y across skip + reopen", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("exposes the correct ARIA contract on initial mount", () => {
    renderTour();
    act(() => { vi.advanceTimersByTime(ANNOUNCE_DELAY_MS); });

    const region = getLiveRegion();
    expectAriaContract(region);
    expect(region.textContent).toBe(expectedMessage(0));
  });

  it("removes the live region from the a11y tree after Skip tour", () => {
    renderTour();
    act(() => { vi.advanceTimersByTime(ANNOUNCE_DELAY_MS); });
    expectAriaContract(getLiveRegion());

    act(() => { fireEvent.click(getSkipButton()); });
    act(() => { vi.advanceTimersByTime(ANNOUNCE_DELAY_MS); });

    expect(queryLiveRegion()).toBeNull();
  });

  it("re-establishes the ARIA contract and announces fresh content after reopen", () => {
    renderTour();
    act(() => { vi.advanceTimersByTime(ANNOUNCE_DELAY_MS); });

    act(() => { fireEvent.click(getSkipButton()); });
    act(() => { vi.advanceTimersByTime(ANNOUNCE_DELAY_MS); });
    expect(queryLiveRegion()).toBeNull();

    act(() => {
      window.dispatchEvent(new CustomEvent("uply:launch-tour"));
    });

    const region = getLiveRegion();
    expectAriaContract(region);
    expect(region.textContent).toBe("");

    act(() => { vi.advanceTimersByTime(ANNOUNCE_DELAY_MS); });
    const announced = getLiveRegion();
    expectAriaContract(announced);
    expect(announced.textContent).toBe(expectedMessage(0));
  });
});
