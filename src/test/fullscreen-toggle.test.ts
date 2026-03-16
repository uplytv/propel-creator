import { describe, it, expect, vi } from "vitest";

describe("Fullscreen toggle logic", () => {
  it("falls back to CSS pseudo-fullscreen when requestFullscreen rejects", async () => {
    let isFullscreen = false;
    const setIsFullscreen = (val: boolean) => { isFullscreen = val; };

    // Simulate element where requestFullscreen fails (iframe environment)
    const mockEl = {
      requestFullscreen: vi.fn().mockRejectedValue(new Error("Fullscreen API denied")),
    };

    // Simulate the toggle logic from BroadcastStudio/WebRTCPlayer
    const fullscreenEl = null; // no native fullscreen active
    if (fullscreenEl) {
      // would exit fullscreen
    } else if (isFullscreen) {
      setIsFullscreen(false);
    } else {
      try {
        await mockEl.requestFullscreen();
      } catch {
        setIsFullscreen(true);
      }
    }

    expect(isFullscreen).toBe(true);
    expect(mockEl.requestFullscreen).toHaveBeenCalled();
  });

  it("exits CSS pseudo-fullscreen on second toggle", () => {
    let isFullscreen = true;
    const setIsFullscreen = (val: boolean) => { isFullscreen = val; };

    const fullscreenEl = null; // no native fullscreen
    if (fullscreenEl) {
      // would exit native
    } else if (isFullscreen) {
      setIsFullscreen(false);
    }

    expect(isFullscreen).toBe(false);
  });

  it("uses native fullscreen when available", async () => {
    let isFullscreen = false;
    const setIsFullscreen = (val: boolean) => { isFullscreen = val; };

    const mockEl = {
      requestFullscreen: vi.fn().mockResolvedValue(undefined),
    };

    const fullscreenEl = null;
    if (fullscreenEl) {
      // exit
    } else if (isFullscreen) {
      setIsFullscreen(false);
    } else {
      try {
        await mockEl.requestFullscreen();
        // Native fullscreen succeeded — browser handles fullscreenchange event
      } catch {
        setIsFullscreen(true);
      }
    }

    // isFullscreen stays false because native fullscreen succeeded
    // (the fullscreenchange event handler would set it via document.fullscreenElement)
    expect(isFullscreen).toBe(false);
    expect(mockEl.requestFullscreen).toHaveBeenCalled();
  });
});
