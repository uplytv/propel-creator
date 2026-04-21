import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  SETTINGS_NAV_COOLDOWN_KEY,
  SETTINGS_NAV_COOLDOWN_MS,
  computeCooldownState,
  readSettingsNavLast,
  writeSettingsNavLast,
} from "./settingsNavCooldown";

describe("settingsNavCooldown", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    sessionStorage.clear();
  });

  describe("sessionStorage persistence", () => {
    it("returns 0 when nothing has been written", () => {
      expect(readSettingsNavLast()).toBe(0);
    });

    it("persists the timestamp under the documented key (survives 'refresh')", () => {
      const ts = Date.now();
      writeSettingsNavLast(ts);
      // Direct read mimics a page refresh: sessionStorage outlives reload.
      expect(sessionStorage.getItem(SETTINGS_NAV_COOLDOWN_KEY)).toBe(String(ts));
      expect(readSettingsNavLast()).toBe(ts);
    });

    it("survives a simulated module re-import (post-refresh read)", async () => {
      const ts = Date.now();
      writeSettingsNavLast(ts);
      vi.resetModules();
      const fresh = await import("./settingsNavCooldown");
      expect(fresh.readSettingsNavLast()).toBe(ts);
    });
  });

  describe("computeCooldownState — countdown label", () => {
    it("shows full countdown immediately after attempt", () => {
      const now = Date.now();
      const state = computeCooldownState(now, now);
      expect(state.ready).toBe(false);
      expect(state.remainingMs).toBe(SETTINGS_NAV_COOLDOWN_MS);
      expect(state.remainingSec).toBe(2);
      expect(state.actionLabel).toBe("Try again (2s)");
    });

    it("ticks down to '1s' partway through", () => {
      const last = Date.now();
      const state = computeCooldownState(last, last + 1100);
      expect(state.ready).toBe(false);
      expect(state.remainingSec).toBe(1);
      expect(state.actionLabel).toBe("Try again (1s)");
    });

    it("becomes ready exactly when the cooldown elapses", () => {
      const last = Date.now();
      // 1ms before
      const before = computeCooldownState(last, last + SETTINGS_NAV_COOLDOWN_MS - 1);
      expect(before.ready).toBe(false);
      expect(before.actionLabel).toMatch(/Try again \(\d+s\)/);

      // exactly on time
      const onTime = computeCooldownState(last, last + SETTINGS_NAV_COOLDOWN_MS);
      expect(onTime.ready).toBe(true);
      expect(onTime.remainingMs).toBe(0);
      expect(onTime.actionLabel).toBe("Try again");

      // after
      const after = computeCooldownState(last, last + SETTINGS_NAV_COOLDOWN_MS + 500);
      expect(after.ready).toBe(true);
      expect(after.actionLabel).toBe("Try again");
    });
  });

  describe("computeCooldownState — progress bar", () => {
    it("starts at 0% and ends at 100%", () => {
      const last = Date.now();
      expect(computeCooldownState(last, last).elapsedPct).toBe(0);
      expect(computeCooldownState(last, last + SETTINGS_NAV_COOLDOWN_MS).elapsedPct).toBe(100);
    });

    it("is approximately 50% halfway through", () => {
      const last = Date.now();
      const half = computeCooldownState(last, last + SETTINGS_NAV_COOLDOWN_MS / 2);
      expect(half.elapsedPct).toBeCloseTo(50, 0);
    });

    it("monotonically increases over time", () => {
      const last = Date.now();
      const samples = [0, 200, 400, 800, 1200, 1600, 1999, 2000].map(
        (offset) => computeCooldownState(last, last + offset).elapsedPct,
      );
      for (let i = 1; i < samples.length; i++) {
        expect(samples[i]).toBeGreaterThanOrEqual(samples[i - 1]);
      }
      expect(samples[0]).toBe(0);
      expect(samples[samples.length - 1]).toBe(100);
    });

    it("clamps to 100% past the cooldown window", () => {
      const last = Date.now();
      expect(
        computeCooldownState(last, last + SETTINGS_NAV_COOLDOWN_MS * 5).elapsedPct,
      ).toBe(100);
    });
  });

  describe("end-to-end: write → tick → ready", () => {
    it("simulates the 200ms tick loop and flips to ready exactly on time", () => {
      const start = Date.now();
      writeSettingsNavLast(start);

      const snapshots: { t: number; ready: boolean; label: string; pct: number }[] = [];
      for (let t = 0; t <= SETTINGS_NAV_COOLDOWN_MS; t += 200) {
        const s = computeCooldownState(readSettingsNavLast(), start + t);
        snapshots.push({ t, ready: s.ready, label: s.actionLabel, pct: s.elapsedPct });
      }

      // Not ready at any tick before the final one.
      for (const snap of snapshots.slice(0, -1)) {
        expect(snap.ready).toBe(false);
        expect(snap.label).toMatch(/^Try again \(\dS?s\)$/i);
      }
      // Ready exactly at t = cooldown.
      const last = snapshots[snapshots.length - 1];
      expect(last.t).toBe(SETTINGS_NAV_COOLDOWN_MS);
      expect(last.ready).toBe(true);
      expect(last.label).toBe("Try again");
      expect(last.pct).toBe(100);
    });
  });
});
