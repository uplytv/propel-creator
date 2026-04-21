import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  invalidateBoostFeedOnce,
  boostExpiryKey,
  __resetInvalidatedBoostExpiriesForTests,
} from "./boostInvalidation";

describe("invalidateBoostFeedOnce", () => {
  beforeEach(() => {
    __resetInvalidatedBoostExpiriesForTests();
  });

  it("runs the callback exactly once for a single key", () => {
    const run = vi.fn();
    const key = boostExpiryKey("video", "abc", "2025-01-01T00:00:00Z");

    expect(invalidateBoostFeedOnce(key, run)).toBe(true);
    expect(invalidateBoostFeedOnce(key, run)).toBe(false);
    expect(invalidateBoostFeedOnce(key, run)).toBe(false);

    expect(run).toHaveBeenCalledTimes(1);
  });

  it("dedupes across many simulated cards rendering the same boosted item", () => {
    const run = vi.fn();
    const key = boostExpiryKey("stream", "stream-123", "2025-06-01T12:00:00Z");

    // Simulate 25 cards all firing their expiry handler at the same moment.
    const results = Array.from({ length: 25 }, () =>
      invalidateBoostFeedOnce(key, run),
    );

    expect(run).toHaveBeenCalledTimes(1);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(results.filter((r) => r === false)).toHaveLength(24);
  });

  it("invalidates once per distinct expiry key", () => {
    const run = vi.fn();
    const k1 = boostExpiryKey("video", "abc", "2025-01-01T00:00:00Z");
    const k2 = boostExpiryKey("video", "abc", "2025-01-02T00:00:00Z"); // different expiry
    const k3 = boostExpiryKey("clip", "abc", "2025-01-01T00:00:00Z"); // different type
    const k4 = boostExpiryKey("video", "xyz", "2025-01-01T00:00:00Z"); // different id

    [k1, k1, k2, k2, k3, k3, k4, k4].forEach((k) =>
      invalidateBoostFeedOnce(k, run),
    );

    expect(run).toHaveBeenCalledTimes(4);
  });

  it("does not run callback again after the first call even if it throws", () => {
    const key = boostExpiryKey("post", "p1", "2025-01-01T00:00:00Z");
    const throwing = vi.fn(() => {
      throw new Error("boom");
    });

    expect(() => invalidateBoostFeedOnce(key, throwing)).toThrow("boom");
    // Key was marked before run() — subsequent calls must not re-run.
    const run2 = vi.fn();
    expect(invalidateBoostFeedOnce(key, run2)).toBe(false);
    expect(run2).not.toHaveBeenCalled();
  });

  it("boostExpiryKey produces the documented format", () => {
    expect(boostExpiryKey("video", "abc", "2025-01-01T00:00:00Z")).toBe(
      "video:abc:2025-01-01T00:00:00Z",
    );
  });
});
