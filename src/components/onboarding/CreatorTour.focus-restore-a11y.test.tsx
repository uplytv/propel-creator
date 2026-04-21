import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, act, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CreatorTour, { CREATOR_TOUR_STEPS } from "./CreatorTour";
import {
  getAdvanceButton,
  expectAdvanceForStep,
  keyboardActivate,
  TOUR_TESTID,
} from "./__tests__/creatorTourTestUtils";

/**
 * Focus-restoration accessibility test. Verifies that after disruption (tab
 * switch / external modal focus steal), the tour's advance control for the
 * CURRENT step remains focusable and keyboard-actionable.
 */

const ANNOUNCE_DELAY_MS = 100;

const renderTour = () =>
  render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <CreatorTour forceOpen />
    </MemoryRouter>,
  );

const simulateTabAway = () => {
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => "hidden",
  });
  document.dispatchEvent(new Event("visibilitychange"));
  window.dispatchEvent(new Event("blur"));
};

const simulateTabReturn = () => {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => "visible",
  });
  document.dispatchEvent(new Event("visibilitychange"));
  window.dispatchEvent(new Event("focus"));
};

const simulateModalFocusSteal = () => {
  const modal = document.createElement("button");
  modal.setAttribute("data-testid", "external-modal-focus-trap");
  modal.textContent = "External modal";
  document.body.appendChild(modal);
  modal.focus();
  expect(document.activeElement).toBe(modal);
  modal.remove();
  if (document.body) document.body.focus();
};

const expectAdvanceFocusRestored = (stepId: string) => {
  const btn = expectAdvanceForStep(stepId);
  expect(btn.disabled).toBe(false);
  expect(btn.getAttribute("aria-hidden")).not.toBe("true");
  expect(btn.tabIndex).toBeGreaterThanOrEqual(0);
  btn.focus();
  expect(document.activeElement).toBe(btn);
  return btn;
};

describe("CreatorTour — focus restoration after re-focus scenarios", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("restores focus to the advance button after a tab switch and remains keyboard-actionable", () => {
    renderTour();
    act(() => { vi.advanceTimersByTime(ANNOUNCE_DELAY_MS); });

    const initialBtn = getAdvanceButton();
    initialBtn.focus();
    expect(document.activeElement).toBe(initialBtn);

    simulateTabAway();
    expect(document.activeElement).not.toBe(initialBtn);

    simulateTabReturn();
    const restored = expectAdvanceFocusRestored(CREATOR_TOUR_STEPS[0].id);

    keyboardActivate(restored);
    act(() => { vi.advanceTimersByTime(ANNOUNCE_DELAY_MS); });

    expectAdvanceFocusRestored(CREATOR_TOUR_STEPS[1].id);
  });

  it("restores focus to the advance button after a modal steals + releases focus", () => {
    renderTour();
    act(() => { vi.advanceTimersByTime(ANNOUNCE_DELAY_MS); });

    const initialBtn = getAdvanceButton();
    initialBtn.focus();
    expect(document.activeElement).toBe(initialBtn);

    simulateModalFocusSteal();
    expect(document.activeElement).not.toBe(initialBtn);

    const restored = expectAdvanceFocusRestored(CREATOR_TOUR_STEPS[0].id);
    keyboardActivate(restored);
    act(() => { vi.advanceTimersByTime(ANNOUNCE_DELAY_MS); });

    expectAdvanceFocusRestored(CREATOR_TOUR_STEPS[1].id);
  });

  it("focuses the *current* step's advance control across multiple re-focus + advance cycles", () => {
    renderTour();
    act(() => { vi.advanceTimersByTime(ANNOUNCE_DELAY_MS); });

    for (let i = 0; i < CREATOR_TOUR_STEPS.length - 1; i++) {
      if (i % 2 === 0) {
        simulateTabAway();
        simulateTabReturn();
      } else {
        simulateModalFocusSteal();
      }

      const btn = expectAdvanceFocusRestored(CREATOR_TOUR_STEPS[i].id);

      const popover = btn.closest(`[data-testid="${TOUR_TESTID.popover}"]`);
      expect(popover).not.toBeNull();

      keyboardActivate(btn);
      act(() => { vi.advanceTimersByTime(ANNOUNCE_DELAY_MS); });
    }

    simulateModalFocusSteal();
    expectAdvanceFocusRestored(CREATOR_TOUR_STEPS[CREATOR_TOUR_STEPS.length - 1].id);
  });
});
