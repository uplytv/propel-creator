/**
 * Restore-focus helpers for non-modal toasts.
 *
 * Captures `document.activeElement` when a toast appears and returns a
 * `restore()` callback that moves focus back when the toast is dismissed
 * or its action is activated. Safe across portals (sonner) and shadow trees.
 */

export type FocusRestorer = () => void;

const isFocusableElement = (el: unknown): el is HTMLElement =>
  !!el &&
  typeof el === "object" &&
  el instanceof HTMLElement &&
  typeof (el as HTMLElement).focus === "function" &&
  // Don't restore to <body> — it's the default and provides no value.
  el !== document.body;

/**
 * Capture the currently focused element. Returns a restore function that
 * focuses it again, guarding against the element being removed from the DOM
 * in the meantime. Calling restore() more than once is a no-op.
 */
export const captureFocus = (): FocusRestorer => {
  const previouslyFocused =
    typeof document !== "undefined" ? document.activeElement : null;
  let restored = false;
  return () => {
    if (restored) return;
    restored = true;
    const doFocus = () => {
      if (
        isFocusableElement(previouslyFocused) &&
        previouslyFocused.isConnected
      ) {
        try {
          previouslyFocused.focus({ preventScroll: true });
        } catch {
          previouslyFocused.focus();
        }
      }
    };
    // Defer to a microtask + macrotask so any in-flight DOM removals
    // (e.g. the toast action being unmounted) settle first. Otherwise the
    // browser blurs our newly-focused element when the previously-focused
    // (now-removed) node is detached.
    if (typeof queueMicrotask === "function") {
      queueMicrotask(doFocus);
    }
    setTimeout(doFocus, 0);
  };
};
