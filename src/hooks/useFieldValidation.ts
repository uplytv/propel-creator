import { useCallback, useRef } from "react";
import type { ValidationBannerHandle } from "@/components/onboarding/ValidationBanner";

/**
 * Generic field-validation rule.
 *
 *  - `isInvalid`: predicate evaluated at submit time. Return `true` when this
 *    rule should block submission and surface the banner.
 *  - `title` / `description`: copy shown inside the banner when this rule fails.
 *  - `focusTarget`: the element to receive focus after the banner scrolls into
 *    view. Can be a ref-like object, a raw element, or a getter (useful when
 *    the target is queried from the DOM at validation time, e.g. a radio card).
 */
export interface ValidationRule {
  isInvalid: () => boolean;
  title: string;
  description: string;
  focusTarget?:
    | HTMLElement
    | null
    | { current: HTMLElement | null }
    | (() => HTMLElement | null);
}
const resolveFocusTarget = (
  target: ValidationRule["focusTarget"],
): HTMLElement | null => {
  if (!target) return null;
  if (typeof target === "function") return target();
  if ("current" in target) return target.current;
  return target;
};

export interface UseFieldValidationResult {
  /** Attach to a `<ValidationBanner ref={...} />`. */
  bannerRef: React.MutableRefObject<ValidationBannerHandle | null>;
  /**
   * Walks the supplied rules in order. The first failing rule surfaces the
   * banner (scroll + focus the rule's target) and returns `false`. If every
   * rule passes, returns `true` so the caller can proceed.
   */
  validate: (rules: ValidationRule[]) => boolean;
  /**
   * Convenience reader: which rule (if any) is currently invalid given the
   * supplied list. Components use this to drive the banner's `show`/`title`/
   * `description` props without duplicating predicate logic.
   */
  activeRule: (rules: ValidationRule[]) => ValidationRule | null;
}

/**
 * Reusable validation orchestrator for onboarding-style forms.
 *
 * Centralizes the "evaluate rules → surface banner → focus invalid field"
 * dance so individual steps only declare *what* to check, not *how* to react.
 */
export function useFieldValidation(): UseFieldValidationResult {
  const bannerRef = useRef<ValidationBannerHandle | null>(null);

  const validate = useCallback((rules: ValidationRule[]) => {
    for (const rule of rules) {
      if (rule.isInvalid()) {
        bannerRef.current?.surface(resolveFocusTarget(rule.focusTarget));
        return false;
      }
    }
    return true;
  }, []);

  const activeRule = useCallback((rules: ValidationRule[]) => {
    return rules.find((r) => r.isInvalid()) ?? null;
  }, []);

  return { bannerRef, validate, activeRule };
}
