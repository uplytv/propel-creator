import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, act, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CreatorTour, { CREATOR_TOUR_STEPS } from "./CreatorTour";
import {
  getLiveRegion,
  getAdvanceButton,
  keyboardActivate,
  expectAriaContract,
} from "./__tests__/creatorTourTestUtils";

/**
 * Re-focus accessibility test. Simulates tab switch / external modal focus
 * theft between keyboard advances and verifies live-region announcement
 * order is preserved exactly.
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

describe("CreatorTour — live region announcement order across re-focus", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("preserves sequential live-region order when keyboard-navigating after tab switch and modal focus steal", () => {
    renderTour();
    act(() => { vi.advanceTimersByTime(ANNOUNCE_DELAY_MS); });

    const announcements: string[] = [];
    const recordCurrent = () => {
      const text = getLiveRegion().textContent || "";
      if (text && announcements[announcements.length - 1] !== text) {
        announcements.push(text);
      }
    };

    expectAriaContract(getLiveRegion());
    recordCurrent();
    expect(announcements).toEqual([expectedMessage(0)]);

    // Scenario A: tab away between step 1 → 2.
    simulateTabAway();
    act(() => { vi.advanceTimersByTime(500); });
    expect(getLiveRegion().textContent).toBe(expectedMessage(0));
    expectAriaContract(getLiveRegion());

    simulateTabReturn();
    expectAriaContract(getLiveRegion());
    expect(getLiveRegion().textContent).toBe(expectedMessage(0));

    keyboardActivate(getAdvanceButton());
    expect(getLiveRegion().textContent).toBe("");
    act(() => { vi.advanceTimersByTime(ANNOUNCE_DELAY_MS); });
    recordCurrent();

    // Scenario B: modal focus steal between 2 → 3.
    simulateModalFocusSteal();
    expectAriaContract(getLiveRegion());
    expect(getLiveRegion().textContent).toBe(expectedMessage(1));

    keyboardActivate(getAdvanceButton());
    expect(getLiveRegion().textContent).toBe("");
    act(() => { vi.advanceTimersByTime(ANNOUNCE_DELAY_MS); });
    recordCurrent();

    // Scenario C: stacked interruptions for every remaining step.
    for (let i = 3; i < CREATOR_TOUR_STEPS.length; i++) {
      simulateTabAway();
      act(() => { vi.advanceTimersByTime(200); });
      simulateTabReturn();
      simulateModalFocusSteal();

      expectAriaContract(getLiveRegion());
      expect(getLiveRegion().textContent).toBe(expectedMessage(i - 1));

      keyboardActivate(getAdvanceButton());
      expect(getLiveRegion().textContent).toBe("");
      act(() => { vi.advanceTimersByTime(ANNOUNCE_DELAY_MS); });
      recordCurrent();
    }

    const expectedOrder = CREATOR_TOUR_STEPS.map((_, i) => expectedMessage(i));
    expect(announcements).toEqual(expectedOrder);
  });
});
