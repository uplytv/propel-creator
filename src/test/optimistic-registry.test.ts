import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  markPending,
  clearPending,
  hasPending,
  shouldAcceptRealtime,
} from "@/lib/optimisticRegistry";

describe("optimisticRegistry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const setTime = (iso: string) => {
    const ts = new Date(iso).getTime();
    vi.spyOn(Date, "now").mockReturnValue(ts);
  };

  it("accepts realtime payloads when no edit is pending", () => {
    expect(hasPending("products", "p1")).toBe(false);
    expect(
      shouldAcceptRealtime("products", "p1", { updated_at: new Date().toISOString() }),
    ).toBe(true);
  });

  it("drops stale payloads whose updated_at is older than the optimistic write", () => {
    setTime("2026-01-01T00:00:10.000Z");
    markPending("products", "p1");
    expect(
      shouldAcceptRealtime("products", "p1", {
        updated_at: "2026-01-01T00:00:09.000Z",
      }),
    ).toBe(false);
  });

  it("drops payloads with equal updated_at (not strictly newer)", () => {
    setTime("2026-01-01T00:00:10.000Z");
    const stamp = markPending("products", "p1");
    expect(
      shouldAcceptRealtime("products", "p1", {
        updated_at: new Date(stamp).toISOString(),
      }),
    ).toBe(false);
  });

  it("drops payloads with missing updated_at while pending", () => {
    markPending("products", "p1");
    expect(shouldAcceptRealtime("products", "p1", {})).toBe(false);
    expect(shouldAcceptRealtime("products", "p1", null)).toBe(false);
  });

  it("accepts payloads strictly newer than the optimistic write", () => {
    setTime("2026-01-01T00:00:10.000Z");
    markPending("products", "p1");
    expect(
      shouldAcceptRealtime("products", "p1", {
        updated_at: "2026-01-01T00:00:11.000Z",
      }),
    ).toBe(true);
  });

  it("only gates the matching table+id pair", () => {
    markPending("products", "p1");
    expect(
      shouldAcceptRealtime("products", "p2", { updated_at: "2020-01-01T00:00:00Z" }),
    ).toBe(true);
    expect(
      shouldAcceptRealtime("mux_live_streams", "p1", {
        updated_at: "2020-01-01T00:00:00Z",
      }),
    ).toBe(true);
  });

  it("clearPending leaves marker briefly so echoes are still dropped", () => {
    setTime("2026-01-01T00:00:10.000Z");
    markPending("products", "p1");
    clearPending("products", "p1");
    // Immediately after clear, the marker is still present (grace window).
    expect(hasPending("products", "p1")).toBe(true);
    expect(
      shouldAcceptRealtime("products", "p1", {
        updated_at: "2026-01-01T00:00:09.000Z",
      }),
    ).toBe(false);
  });

  it("re-marking refreshes the optimistic timestamp", () => {
    setTime("2026-01-01T00:00:10.000Z");
    markPending("products", "p1");
    setTime("2026-01-01T00:00:20.000Z");
    markPending("products", "p1");
    // Payload between the two marks is now stale.
    expect(
      shouldAcceptRealtime("products", "p1", {
        updated_at: "2026-01-01T00:00:15.000Z",
      }),
    ).toBe(false);
    expect(
      shouldAcceptRealtime("products", "p1", {
        updated_at: "2026-01-01T00:00:21.000Z",
      }),
    ).toBe(true);
  });
});
