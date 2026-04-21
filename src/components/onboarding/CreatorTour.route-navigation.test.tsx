import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, act, cleanup } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import CreatorTour, { CREATOR_TOUR_STEPS } from "./CreatorTour";
import {
  getAdvanceButton,
  expectAdvanceForStep,
  keyboardActivate,
} from "./__tests__/creatorTourTestUtils";

/**
 * Verifies that tour steps with a `route` field actually drive navigation:
 * activating the advance button to enter such a step pushes the browser URL
 * to that route. Uses the real BrowserRouter so the navigate() effect runs
 * end-to-end against window.history.
 */

const ANNOUNCE_DELAY_MS = 100;

const renderTour = (initialPath = "/dashboard") => {
  window.history.pushState({}, "", initialPath);
  return render(
    <BrowserRouter>
      <CreatorTour forceOpen />
    </BrowserRouter>,
  );
};

describe("CreatorTour — step.route drives real navigation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    window.history.pushState({}, "", "/");
  });

  it("navigates to each step's route as the user advances", () => {
    renderTour("/dashboard");

    // Step 0 is centered (no route). Allow effects + announcement to flush.
    act(() => { vi.advanceTimersByTime(ANNOUNCE_DELAY_MS); });
    expectAdvanceForStep(CREATOR_TOUR_STEPS[0].id);

    // Walk forward; for every step that declares a route, after activation
    // and effect flush, window.location.pathname must equal that route.
    for (let i = 0; i < CREATOR_TOUR_STEPS.length - 1; i++) {
      keyboardActivate(getAdvanceButton());
      act(() => { vi.advanceTimersByTime(ANNOUNCE_DELAY_MS); });

      const next = CREATOR_TOUR_STEPS[i + 1];
      if (next.route) {
        expect(window.location.pathname).toBe(next.route);
      }
      expectAdvanceForStep(next.id);
    }
  });

  it("does not re-navigate when already on the step's route (no pushState churn)", () => {
    // Pre-seed on the route declared by step index 1 (`/dashboard`).
    const step1 = CREATOR_TOUR_STEPS[1];
    if (!step1.route) {
      // Defensive: if the catalog ever changes, skip rather than false-positive.
      expect(step1.route).toBeDefined();
      return;
    }
    renderTour(step1.route);

    act(() => { vi.advanceTimersByTime(ANNOUNCE_DELAY_MS); });

    // Capture history length, advance to the step, ensure no extra entries
    // are pushed when we're already on the right route.
    const lengthBefore = window.history.length;

    // Move from step 0 → step 1 (which targets the same route we're on).
    keyboardActivate(getAdvanceButton());
    act(() => { vi.advanceTimersByTime(ANNOUNCE_DELAY_MS); });

    expect(window.location.pathname).toBe(step1.route);
    // No regression: history length unchanged (component skips redundant nav).
    expect(window.history.length).toBe(lengthBefore);
  });
});
