import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, act, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CreatorTour, { CREATOR_TOUR_STEPS } from "./CreatorTour";

/**
 * Keyboard-only accessibility test for the CreatorTour live region focused on
 * RE-FOCUS scenarios: simulate the user switching browser tabs / opening a
 * modal (which steals focus + fires visibilitychange/blur), then returning
 * to the tour. After re-focus, keyboard navigation must continue to drive
 * live-region announcements in the correct sequential order — no stale,
 * skipped, or out-of-order messages.
 */

const ANNOUNCE_DELAY_MS = 100; // > 80ms internal debounce

const renderTour = () =>
  render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <CreatorTour forceOpen />
    </MemoryRouter>,
  );

const queryLiveRegion = (): HTMLElement | null =>
  document.querySelector<HTMLElement>('[data-testid="creator-tour-live-region"]');

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

const expectedMessage = (idx: number) => {
  const s = CREATOR_TOUR_STEPS[idx];
  return `Step ${idx + 1} of ${CREATOR_TOUR_STEPS.length}. ${s.title}. ${s.body}`;
};

const keyboardActivate = (btn: HTMLButtonElement) => {
  btn.focus();
  expect(document.activeElement).toBe(btn);
  fireEvent.keyDown(btn, { key: "Enter", code: "Enter" });
  fireEvent.keyUp(btn, { key: "Enter", code: "Enter" });
  // jsdom doesn't auto-translate Enter on a button into a click.
  fireEvent.click(btn);
};

/**
 * Simulate the user switching to another browser tab: visibility flips to
 * hidden, the window blurs, and focus is removed from the tour control.
 */
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

/**
 * Simulate the user returning to the tab.
 */
const simulateTabReturn = () => {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => "visible",
  });
  document.dispatchEvent(new Event("visibilitychange"));
  window.dispatchEvent(new Event("focus"));
};

/**
 * Simulate an external modal stealing focus (e.g. a confirm() dialog or a
 * shadcn Dialog opening on top), then closing and returning focus to the
 * page. We mount a temporary focusable element, focus it, then remove it.
 */
const simulateModalFocusSteal = () => {
  const modal = document.createElement("button");
  modal.setAttribute("data-testid", "external-modal-focus-trap");
  modal.textContent = "External modal";
  document.body.appendChild(modal);
  modal.focus();
  expect(document.activeElement).toBe(modal);
  // Modal closes and is removed; focus falls back to <body>.
  modal.remove();
  if (document.body) document.body.focus();
};

describe("CreatorTour — live region announcement order across re-focus (tab switch / modal)", () => {
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

    // Track every announcement we observe so we can assert ORDER at the end.
    const announcements: string[] = [];
    const recordCurrent = () => {
      const text = getLiveRegion().textContent || "";
      if (text && announcements[announcements.length - 1] !== text) {
        announcements.push(text);
      }
    };

    // Step 1 announces.
    expectAriaContract(getLiveRegion());
    recordCurrent();
    expect(announcements).toEqual([expectedMessage(0)]);

    // --- Re-focus scenario A: user switches tabs between step 1 → 2 ---
    simulateTabAway();
    // While away, advance the debounce clock — nothing should change because
    // the user hasn't pressed anything yet, and the region must still hold
    // step 1 (no spurious announcements during background visibility).
    act(() => { vi.advanceTimersByTime(500); });
    expect(getLiveRegion().textContent).toBe(expectedMessage(0));
    expectAriaContract(getLiveRegion());

    simulateTabReturn();
    // On return, ARIA contract is intact and content is still step 1 (we
    // haven't navigated yet, so no re-announcement is fired — which is the
    // correct, non-spammy behavior).
    expectAriaContract(getLiveRegion());
    expect(getLiveRegion().textContent).toBe(expectedMessage(0));

    // Now the user keyboard-advances to step 2.
    keyboardActivate(findAdvanceButton(CREATOR_TOUR_STEPS[0].cta));
    expect(getLiveRegion().textContent).toBe(""); // clears for SR re-announcement
    act(() => { vi.advanceTimersByTime(ANNOUNCE_DELAY_MS); });
    recordCurrent();

    // --- Re-focus scenario B: external modal steals focus between 2 → 3 ---
    simulateModalFocusSteal();
    expectAriaContract(getLiveRegion());
    expect(getLiveRegion().textContent).toBe(expectedMessage(1));

    keyboardActivate(findAdvanceButton(CREATOR_TOUR_STEPS[1].cta));
    expect(getLiveRegion().textContent).toBe("");
    act(() => { vi.advanceTimersByTime(ANNOUNCE_DELAY_MS); });
    recordCurrent();

    // --- Re-focus scenario C: tab away + modal steal stacked between every
    // remaining step. This is the worst-case "user keeps getting interrupted"
    // pattern and must NOT cause out-of-order or skipped announcements. ---
    for (let i = 3; i < CREATOR_TOUR_STEPS.length; i++) {
      simulateTabAway();
      act(() => { vi.advanceTimersByTime(200); });
      simulateTabReturn();
      simulateModalFocusSteal();

      // Live region content must still be the previous step's message — no
      // ghost announcements while interrupted.
      expectAriaContract(getLiveRegion());
      expect(getLiveRegion().textContent).toBe(expectedMessage(i - 1));

      keyboardActivate(findAdvanceButton(CREATOR_TOUR_STEPS[i - 1].cta));
      expect(getLiveRegion().textContent).toBe("");
      act(() => { vi.advanceTimersByTime(ANNOUNCE_DELAY_MS); });
      recordCurrent();
    }

    // Final assertion: announcements arrived in EXACT step order, one per step,
    // with no duplicates, no skips, and no reordering caused by re-focus events.
    const expectedOrder = CREATOR_TOUR_STEPS.map((_, i) => expectedMessage(i));
    expect(announcements).toEqual(expectedOrder);
  });
});
