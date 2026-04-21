import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, act, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CreatorTour from "./CreatorTour";
import {
  queryPopover,
  queryLiveRegion,
} from "./__tests__/creatorTourTestUtils";

/**
 * Verifies tour completion is persistent: once the storage flag is set
 * (simulating a previously-finished tour), mounting CreatorTour WITHOUT
 * `forceOpen` must not auto-show the popover, even after the internal
 * 800ms auto-open delay.
 *
 * Conversely, with `forceOpen` the tour must always open regardless of the
 * persisted flag (this is what powers "Replay tour" surfaces).
 */

const STORAGE_KEY = "uply_creator_tour_v1";
const AUTO_OPEN_DELAY_MS = 1500; // > the 800ms internal delay

const renderTour = (props: { forceOpen?: boolean } = {}) =>
  render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <CreatorTour {...props} />
    </MemoryRouter>,
  );

describe("CreatorTour — persistence prevents auto-reopen after completion", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    localStorage.clear();
  });

  it("does not auto-open when the completion flag is set", () => {
    localStorage.setItem(STORAGE_KEY, "1");
    renderTour();

    // Walk past the auto-open delay; nothing should appear.
    act(() => { vi.advanceTimersByTime(AUTO_OPEN_DELAY_MS); });

    expect(queryPopover()).toBeNull();
    expect(queryLiveRegion()).toBeNull();
  });

  it("auto-opens for first-time users (no flag set)", () => {
    renderTour();

    // Initially, the tour is hidden behind the 800ms delay.
    expect(queryPopover()).toBeNull();

    act(() => { vi.advanceTimersByTime(AUTO_OPEN_DELAY_MS); });

    // After the delay, the tour is mounted and the live region is present.
    expect(queryPopover()).not.toBeNull();
    expect(queryLiveRegion()).not.toBeNull();
  });

  it("forceOpen overrides the persisted completion flag (replay tour)", () => {
    localStorage.setItem(STORAGE_KEY, "1");
    renderTour({ forceOpen: true });

    act(() => { vi.advanceTimersByTime(150); });

    expect(queryPopover()).not.toBeNull();
    expect(queryLiveRegion()).not.toBeNull();
  });
});
