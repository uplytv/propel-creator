import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, act, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CreatorTour, { CREATOR_TOUR_STEPS } from "./CreatorTour";
import {
  getAdvanceButton,
  expectAdvanceForStep,
  keyboardActivate,
} from "./__tests__/creatorTourTestUtils";

/**
 * Verifies the advance button always carries `data-tour-step` matching the
 * current step's id, and that activating it advances the tour to the next
 * step (with the attribute updating in lockstep). Guards against regressions
 * where the CTA could activate a stale step due to closure capture or
 * mis-ordered re-renders.
 */

const ANNOUNCE_DELAY_MS = 100;

const renderTour = () =>
  render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <CreatorTour forceOpen />
    </MemoryRouter>,
  );

describe("CreatorTour — advance button targets the correct current step", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("stamps data-tour-step with the current step id on initial mount", () => {
    renderTour();
    act(() => { vi.advanceTimersByTime(ANNOUNCE_DELAY_MS); });

    const btn = getAdvanceButton();
    expect(btn.getAttribute("data-tour-step")).toBe(CREATOR_TOUR_STEPS[0].id);
  });

  it("activating the advance button moves data-tour-step to the next step in order", () => {
    renderTour();
    act(() => { vi.advanceTimersByTime(ANNOUNCE_DELAY_MS); });

    for (let i = 0; i < CREATOR_TOUR_STEPS.length - 1; i++) {
      // Before activation, the button must target the *current* step.
      const before = expectAdvanceForStep(CREATOR_TOUR_STEPS[i].id);

      // Activate via keyboard (focus → Enter → click).
      keyboardActivate(before);
      act(() => { vi.advanceTimersByTime(ANNOUNCE_DELAY_MS); });

      // After activation, the (re-rendered) button targets the next step.
      const after = expectAdvanceForStep(CREATOR_TOUR_STEPS[i + 1].id);
      expect(after.getAttribute("data-tour-step")).toBe(CREATOR_TOUR_STEPS[i + 1].id);
    }
  });

  it("the advance button's accessible name reflects the current step's CTA copy and position", () => {
    renderTour();
    act(() => { vi.advanceTimersByTime(ANNOUNCE_DELAY_MS); });

    for (let i = 0; i < CREATOR_TOUR_STEPS.length; i++) {
      const btn = expectAdvanceForStep(CREATOR_TOUR_STEPS[i].id);
      const ariaLabel = btn.getAttribute("aria-label") || "";

      if (i === CREATOR_TOUR_STEPS.length - 1) {
        // Final step: finish semantics, includes the step's CTA copy.
        expect(ariaLabel.toLowerCase()).toContain("finish");
        expect(ariaLabel).toContain(CREATOR_TOUR_STEPS[i].cta || "Finish");
        break;
      }

      // Intermediate step: announces target step number + CTA.
      expect(ariaLabel).toContain(`step ${i + 2} of ${CREATOR_TOUR_STEPS.length}`);
      expect(ariaLabel).toContain(CREATOR_TOUR_STEPS[i].cta || "Next");

      keyboardActivate(btn);
      act(() => { vi.advanceTimersByTime(ANNOUNCE_DELAY_MS); });
    }
  });

  it("never targets a stale step: data-tour-step matches the current step after every transition", () => {
    renderTour();
    act(() => { vi.advanceTimersByTime(ANNOUNCE_DELAY_MS); });

    const observed: string[] = [];
    observed.push(getAdvanceButton().getAttribute("data-tour-step") || "");

    for (let i = 0; i < CREATOR_TOUR_STEPS.length - 1; i++) {
      keyboardActivate(getAdvanceButton());
      act(() => { vi.advanceTimersByTime(ANNOUNCE_DELAY_MS); });
      observed.push(getAdvanceButton().getAttribute("data-tour-step") || "");
    }

    expect(observed).toEqual(CREATOR_TOUR_STEPS.map((s) => s.id));
  });
});
