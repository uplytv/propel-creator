import "@testing-library/jest-dom";

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
  observe = () => {};
  unobserve = () => {};
  disconnect = () => {};
  takeRecords = () => [] as IntersectionObserverEntry[];
  root = null;
  rootMargin = "";
  thresholds = [] as ReadonlyArray<number>;
}
// @ts-expect-error – assigning test stub
window.IntersectionObserver = MockIntersectionObserver;
// @ts-expect-error – assigning test stub
globalThis.IntersectionObserver = MockIntersectionObserver;
