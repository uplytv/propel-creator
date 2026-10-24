import "@testing-library/jest-dom";
import { vi } from "vitest";

// @testing-library/react's asyncWrapper drains the microtask queue with a
// real `setTimeout(..., 0)` and only advances fake timers when it detects
// Jest (its `jestFakeTimersAreEnabled()` returns false when `typeof jest ===
// "undefined"`). Under vitest + vi.useFakeTimers() that setTimeout never
// fires, so every awaited userEvent / async act call deadlocks until the test
// times out. Shim the single jest API RTL calls; RTL only invokes it while
// sinon fake timers are installed (it checks `setTimeout.clock`), so this is
// inert under real timers.
(globalThis as unknown as {
  jest?: { advanceTimersByTime: (ms: number) => void };
}).jest = {
  ...(globalThis as unknown as { jest?: object }).jest,
  advanceTimersByTime: (ms: number) => vi.advanceTimersByTime(ms),
};

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// jsdom doesn't ship IntersectionObserver — stub a no-op so components that
// rely on it (e.g. SectionShell reveal-on-scroll) render in tests.
class MockIntersectionObserver {
  constructor(_cb?: unknown, _opts?: unknown) {}
  observe = () => {};
  unobserve = () => {};
  disconnect = () => {};
  takeRecords = () => [] as IntersectionObserverEntry[];
  root = null;
  rootMargin = "";
  thresholds = [] as ReadonlyArray<number>;
}
window.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;
globalThis.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;
