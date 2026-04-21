import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, act, cleanup, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import CreatorTour, { CREATOR_TOUR_STEPS } from "./CreatorTour";

/**
 * End-to-end style test for the CreatorTour live region.
 *
 * Unlike the unit tests, this drives the tour using the *real* browser router
 * (BrowserRouter + window.history) and walks every step via real Next clicks,
 * verifying the aria-live region announces each step's title and body during
 * actual route navigation.
 */

const ANNOUNCE_DELAY_MS = 100; // > 80ms debounce in CreatorTour

const renderTour = () => {
  // Seed a stable starting URL so route-driven steps don't unmount the portal.
  window.history.pushState({}, "", "/dashboard");
  return render(
    <BrowserRouter>
      <CreatorTour forceOpen />
    </BrowserRouter>,
  );
};

const getLiveRegion = (): HTMLElement => {
  const el = document.querySelector<HTMLElement>('[role="status"][aria-live="polite"]');
  if (!el) throw new Error("Live region not found");
  return el;
};

const findNextButton = (): HTMLButtonElement => {
  const buttons = Array.from(document.querySelectorAll("button"));
  const candidate = buttons
    .filter((b) => {
      const label = (b.textContent || "").trim().toLowerCase();
      const aria = (b.getAttribute("aria-label") || "").toLowerCase();
      return !label.includes("skip") && !aria.includes("skip");
    })
    .reverse() // primary CTA is rendered last in the popover
    .find((b) => {
      const t = (b.textContent || "").trim();
      return t.length > 0 && !b.disabled;
    });
  if (!candidate) throw new Error("Next/CTA button not found");
  return candidate as HTMLButtonElement;
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

    // Initial step
    act(() => { vi.advanceTimersByTime(ANNOUNCE_DELAY_MS); });
    expect(getLiveRegion().textContent).toBe(expectedMessage(0));

    // Walk through every remaining step using real CTA clicks.
    for (let i = 1; i < CREATOR_TOUR_STEPS.length; i++) {
      act(() => { fireEvent.click(findNextButton()); });

      // Region must clear immediately so screen readers re-announce.
      expect(getLiveRegion().textContent).toBe("");

      // Then the new step content appears after the debounce window.
      act(() => { vi.advanceTimersByTime(ANNOUNCE_DELAY_MS); });
      expect(getLiveRegion().textContent).toBe(expectedMessage(i));
    }
  });

  it("keeps the live region wired with correct ARIA attributes throughout the flow", () => {
    renderTour();
    act(() => { vi.advanceTimersByTime(ANNOUNCE_DELAY_MS); });

    // Click forward a couple of times and re-check ARIA wiring at each stop.
    for (let i = 1; i < Math.min(3, CREATOR_TOUR_STEPS.length); i++) {
      act(() => { fireEvent.click(findNextButton()); });
      act(() => { vi.advanceTimersByTime(ANNOUNCE_DELAY_MS); });

      const region = getLiveRegion();
      expect(region.getAttribute("role")).toBe("status");
      expect(region.getAttribute("aria-live")).toBe("polite");
      expect(region.getAttribute("aria-atomic")).toBe("true");
      expect(region.className).toContain("sr-only");
      expect(region.textContent).toBe(expectedMessage(i));
    }
  });
});
