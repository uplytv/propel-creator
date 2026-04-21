import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, act, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CreatorTour, { CREATOR_TOUR_STEPS } from "./CreatorTour";

/**
 * Verifies the live region behaves correctly across two flows:
 *   1. Clicking "Skip tour" — region should clear and stop announcing.
 *   2. Reopening the tour via `uply:launch-tour` — region should re-announce
 *      step 1's title and body from scratch.
 */

const ANNOUNCE_DELAY_MS = 100; // > 80ms debounce in CreatorTour

const renderTour = () =>
  render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <CreatorTour forceOpen />
    </MemoryRouter>,
  );

const queryLiveRegion = (): HTMLElement | null =>
  document.querySelector<HTMLElement>('[role="status"][aria-live="polite"]');

const getLiveRegion = (): HTMLElement => {
  const el = queryLiveRegion();
  if (!el) throw new Error("Live region not found");
  return el;
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

const findNextButton = (): HTMLButtonElement => {
  const buttons = Array.from(document.querySelectorAll("button"));
  const next = buttons
    .filter((b) => {
      const aria = (b.getAttribute("aria-label") || "").toLowerCase();
      const text = (b.textContent || "").toLowerCase();
      return !aria.includes("skip") && !text.includes("skip");
    })
    .reverse()
    .find((b) => (b.textContent || "").trim().length > 0 && !b.disabled);
  if (!next) throw new Error("Next/CTA button not found");
  return next as HTMLButtonElement;
};

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

    // Step 1 announcement appears.
    act(() => { vi.advanceTimersByTime(ANNOUNCE_DELAY_MS); });
    expect(getLiveRegion().textContent).toBe(expectedMessage(0));

    // Skip the tour.
    act(() => { fireEvent.click(findSkipButton()); });

    // The popover (and its live region) unmounts; no stale announcement remains.
    act(() => { vi.advanceTimersByTime(ANNOUNCE_DELAY_MS); });
    expect(queryLiveRegion()).toBeNull();
  });

  it("re-announces step 1 when the tour is reopened after being skipped", () => {
    renderTour();

    // Advance to step 2 so we can prove reopen resets to step 1.
    act(() => { vi.advanceTimersByTime(ANNOUNCE_DELAY_MS); });
    expect(getLiveRegion().textContent).toBe(expectedMessage(0));

    act(() => { fireEvent.click(findNextButton()); });
    act(() => { vi.advanceTimersByTime(ANNOUNCE_DELAY_MS); });
    expect(getLiveRegion().textContent).toBe(expectedMessage(1));

    // Skip the tour.
    act(() => { fireEvent.click(findSkipButton()); });
    act(() => { vi.advanceTimersByTime(ANNOUNCE_DELAY_MS); });
    expect(queryLiveRegion()).toBeNull();

    // Reopen via the public imperative API event.
    act(() => {
      window.dispatchEvent(new CustomEvent("uply:launch-tour"));
    });

    // Region should clear immediately, then announce step 1 fresh.
    expect(getLiveRegion().textContent).toBe("");
    act(() => { vi.advanceTimersByTime(ANNOUNCE_DELAY_MS); });
    expect(getLiveRegion().textContent).toBe(expectedMessage(0));
  });
});
