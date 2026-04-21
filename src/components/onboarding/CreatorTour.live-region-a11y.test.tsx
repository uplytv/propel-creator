import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, act, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CreatorTour, { CREATOR_TOUR_STEPS } from "./CreatorTour";

/**
 * Accessibility test focused on the live region's ARIA contract across the
 * Skip → Reopen lifecycle. Screen-reader announcements only work when the
 * region is wired with the right role/aria-live/aria-atomic attributes AND
 * is the visually-hidden `sr-only` variant so it isn't seen but is read.
 */

const ANNOUNCE_DELAY_MS = 100; // > 80ms debounce in CreatorTour

const renderTour = () =>
  render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <CreatorTour forceOpen />
    </MemoryRouter>,
  );

const queryLiveRegion = (): HTMLElement | null =>
  document.querySelector<HTMLElement>('[role="status"]');

const getLiveRegion = (): HTMLElement => {
  const el = queryLiveRegion();
  if (!el) throw new Error("Live region not found");
  return el;
};

const expectAriaContract = (region: HTMLElement) => {
  expect(region.getAttribute("role")).toBe("status");
  expect(region.getAttribute("aria-live")).toBe("polite");
  expect(region.getAttribute("aria-atomic")).toBe("true");
  expect(region.className).toContain("sr-only");
};

const findSkipButton = (): HTMLButtonElement => {
  const buttons = Array.from(document.querySelectorAll("button"));
  const skip = buttons.find((b) => {
    const aria = (b.getAttribute("aria-label") || "").toLowerCase();
    const text = (b.textContent || "").toLowerCase();
    return aria.includes("skip") || text.includes("skip");
  });
  if (!skip) throw new Error("Skip tour button not found");
  return skip as HTMLButtonElement;
};

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

    act(() => { fireEvent.click(findSkipButton()); });
    act(() => { vi.advanceTimersByTime(ANNOUNCE_DELAY_MS); });

    // Once skipped, no status region should remain announcing stale content.
    expect(queryLiveRegion()).toBeNull();
  });

  it("re-establishes the ARIA contract and announces fresh content after reopen", () => {
    renderTour();
    act(() => { vi.advanceTimersByTime(ANNOUNCE_DELAY_MS); });

    // Skip the tour.
    act(() => { fireEvent.click(findSkipButton()); });
    act(() => { vi.advanceTimersByTime(ANNOUNCE_DELAY_MS); });
    expect(queryLiveRegion()).toBeNull();

    // Reopen via the imperative launch event.
    act(() => {
      window.dispatchEvent(new CustomEvent("uply:launch-tour"));
    });

    // Region remounts immediately, empty (so SR will treat the next text as new).
    const region = getLiveRegion();
    expectAriaContract(region);
    expect(region.textContent).toBe("");

    // After the debounce, step 1 is announced fresh with the full ARIA contract intact.
    act(() => { vi.advanceTimersByTime(ANNOUNCE_DELAY_MS); });
    const announced = getLiveRegion();
    expectAriaContract(announced);
    expect(announced.textContent).toBe(expectedMessage(0));
  });
});
