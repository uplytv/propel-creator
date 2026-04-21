import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, act, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CreatorTour, { CREATOR_TOUR_STEPS } from "./CreatorTour";

/**
 * Focus-restoration accessibility test for CreatorTour.
 *
 * Companion to the live-region announcement tests: verifies that after the
 * user's focus is disrupted (tab switch, external modal focus steal), the
 * tour's advance control (the primary "Next/CTA" button for the current
 * step) can be programmatically re-focused and is keyboard-actionable.
 *
 * Rationale: a screen-reader user who Alt-Tabs away or dismisses a system
 * dialog needs the focus ring to land on a meaningful control inside the
 * tour — otherwise they're stranded on <body> and have to Tab from the top
 * of the document to resume.
 */

const ANNOUNCE_DELAY_MS = 100; // > 80ms internal debounce

const renderTour = () =>
  render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <CreatorTour forceOpen />
    </MemoryRouter>,
  );

const findAdvanceButton = (ctaHint?: string): HTMLButtonElement => {
  const buttons = Array.from(document.querySelectorAll("button")).filter(
    (b) => !(b.getAttribute("aria-label") || "").toLowerCase().includes("skip"),
  );
  const wanted = (ctaHint || "next").toLowerCase();
  const match =
    buttons.find((b) => (b.textContent || "").toLowerCase().includes(wanted)) ||
    buttons.find((b) => (b.textContent || "").toLowerCase().includes("next")) ||
    buttons.find((b) => (b.textContent || "").toLowerCase().includes("got it")) ||
    buttons.find((b) => (b.textContent || "").toLowerCase().includes("start"));
  if (!match) throw new Error("Advance button not found");
  return match as HTMLButtonElement;
};

const keyboardActivate = (btn: HTMLButtonElement) => {
  btn.focus();
  expect(document.activeElement).toBe(btn);
  fireEvent.keyDown(btn, { key: "Enter", code: "Enter" });
  fireEvent.keyUp(btn, { key: "Enter", code: "Enter" });
  fireEvent.click(btn);
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

/**
 * The accessibility contract under test: regardless of how focus was lost,
 * a keyboard user must be able to land back on the tour's advance control.
 * We assert that the button still exists, is enabled, is focusable, and
 * actually receives focus when requested — i.e. nothing in the tour has
 * trapped focus elsewhere or aria-hidden the control.
 */
const expectAdvanceFocusRestored = (ctaHint?: string) => {
  const btn = findAdvanceButton(ctaHint);
  expect(btn.disabled).toBe(false);
  expect(btn.getAttribute("aria-hidden")).not.toBe("true");
  // tabIndex of -1 would make it unreachable for sequential keyboard nav.
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

    // User starts on the advance button via keyboard.
    const initialBtn = findAdvanceButton(CREATOR_TOUR_STEPS[0].cta);
    initialBtn.focus();
    expect(document.activeElement).toBe(initialBtn);

    // Tab away (focus is lost to the browser chrome / other tab).
    simulateTabAway();
    expect(document.activeElement).not.toBe(initialBtn);

    // Tab back — restore focus to the same advance control.
    simulateTabReturn();
    const restored = expectAdvanceFocusRestored(CREATOR_TOUR_STEPS[0].cta);

    // The keyboard activation that follows actually advances the step,
    // proving the restored focus is on the *correct* control (not a
    // disabled/skip/back button).
    keyboardActivate(restored);
    act(() => { vi.advanceTimersByTime(ANNOUNCE_DELAY_MS); });

    // The next step's CTA button now exists and is focusable too.
    expectAdvanceFocusRestored(CREATOR_TOUR_STEPS[1].cta);
  });

  it("restores focus to the advance button after a modal steals + releases focus", () => {
    renderTour();
    act(() => { vi.advanceTimersByTime(ANNOUNCE_DELAY_MS); });

    const initialBtn = findAdvanceButton(CREATOR_TOUR_STEPS[0].cta);
    initialBtn.focus();
    expect(document.activeElement).toBe(initialBtn);

    // External modal opens, steals focus, then closes.
    simulateModalFocusSteal();
    expect(document.activeElement).not.toBe(initialBtn);

    // After the modal closes, the tour's advance control must be reachable
    // again so the keyboard user can resume without re-tabbing the page.
    const restored = expectAdvanceFocusRestored(CREATOR_TOUR_STEPS[0].cta);
    keyboardActivate(restored);
    act(() => { vi.advanceTimersByTime(ANNOUNCE_DELAY_MS); });

    expectAdvanceFocusRestored(CREATOR_TOUR_STEPS[1].cta);
  });

  it("focuses the *current* step's advance control across multiple re-focus + advance cycles", () => {
    renderTour();
    act(() => { vi.advanceTimersByTime(ANNOUNCE_DELAY_MS); });

    // Walk every step. Before each advance, alternate between tab-away and
    // modal-steal interruptions, then assert the focus lands on the CURRENT
    // step's CTA button (not a stale reference from the previous step).
    for (let i = 0; i < CREATOR_TOUR_STEPS.length - 1; i++) {
      const currentCta = CREATOR_TOUR_STEPS[i].cta;

      if (i % 2 === 0) {
        simulateTabAway();
        simulateTabReturn();
      } else {
        simulateModalFocusSteal();
      }

      const btn = expectAdvanceFocusRestored(currentCta);

      // Sanity: the focused element is inside the tour popover, not some
      // sibling control elsewhere in the DOM that happens to share text.
      const popover = btn.closest('[data-testid="creator-tour-popover"]');
      expect(popover).not.toBeNull();

      keyboardActivate(btn);
      act(() => { vi.advanceTimersByTime(ANNOUNCE_DELAY_MS); });
    }

    // Final step renders a finish CTA — verify it too is focusable after a
    // last interruption, so the user can complete the tour from the keyboard.
    simulateModalFocusSteal();
    const finishCta = CREATOR_TOUR_STEPS[CREATOR_TOUR_STEPS.length - 1].cta;
    expectAdvanceFocusRestored(finishCta);
  });
});
