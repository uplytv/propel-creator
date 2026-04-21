import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  notifyBoostEndingOnce,
  notifyBoostEndedOnce,
  __resetBoostToastDedupeForTests,
} from "./boostToastDedupe";
import { boostExpiryKey } from "./boostInvalidation";

describe("boost toast dedupe", () => {
  beforeEach(() => {
    __resetBoostToastDedupeForTests();
  });

  it("fires the ENDING toast exactly once per boost key across many cards", () => {
    const toast = vi.fn();
    const key = boostExpiryKey("video", "v1", "2025-01-01T00:00:00Z");

    // Simulate 50 DiscoveryFeedCard instances rendering the same promoted item
    // and each crossing the "ending" threshold at the same minute tick.
    const results = Array.from({ length: 50 }, () =>
      notifyBoostEndingOnce(key, toast),
    );

    expect(toast).toHaveBeenCalledTimes(1);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(results.filter((r) => r === false)).toHaveLength(49);
  });

  it("fires the ENDED toast exactly once per boost key across many cards", () => {
    const toast = vi.fn();
    const key = boostExpiryKey("stream", "s1", "2025-01-01T00:00:00Z");

    const results = Array.from({ length: 50 }, () =>
      notifyBoostEndedOnce(key, toast),
    );

    expect(toast).toHaveBeenCalledTimes(1);
    expect(results.filter(Boolean)).toHaveLength(1);
  });

  it("ENDING and ENDED dedupe sets are independent", () => {
    const endingToast = vi.fn();
    const endedToast = vi.fn();
    const key = boostExpiryKey("clip", "c1", "2025-01-01T00:00:00Z");

    // Same boost transitions active -> ending -> ended over its lifetime.
    notifyBoostEndingOnce(key, endingToast);
    notifyBoostEndingOnce(key, endingToast); // duplicate from another card
    notifyBoostEndedOnce(key, endedToast);
    notifyBoostEndedOnce(key, endedToast); // duplicate from another card

    expect(endingToast).toHaveBeenCalledTimes(1);
    expect(endedToast).toHaveBeenCalledTimes(1);
  });

  it("fires once per distinct boost key", () => {
    const toast = vi.fn();
    const k1 = boostExpiryKey("video", "abc", "2025-01-01T00:00:00Z");
    const k2 = boostExpiryKey("video", "abc", "2025-01-02T00:00:00Z"); // different expiry
    const k3 = boostExpiryKey("video", "xyz", "2025-01-01T00:00:00Z"); // different id

    [k1, k1, k1, k2, k2, k3, k3].forEach((k) =>
      notifyBoostEndingOnce(k, toast),
    );

    expect(toast).toHaveBeenCalledTimes(3);
  });

  it("reset helper allows re-firing in subsequent tests", () => {
    const toast = vi.fn();
    const key = boostExpiryKey("video", "v1", "2025-01-01T00:00:00Z");

    notifyBoostEndingOnce(key, toast);
    notifyBoostEndingOnce(key, toast);
    expect(toast).toHaveBeenCalledTimes(1);

    __resetBoostToastDedupeForTests();

    notifyBoostEndingOnce(key, toast);
    expect(toast).toHaveBeenCalledTimes(2);
  });
});
