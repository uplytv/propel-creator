import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export interface ValidationBannerHandle {
  /** Scrolls the banner into view and (optionally) focuses the supplied target element. */
  surface: (focusTarget?: HTMLElement | null) => void;
}

interface ValidationBannerProps {
  /** Whether the banner should be visible. */
  show: boolean;
  /** Bold heading shown inside the alert. */
  title: string;
  /** Body copy explaining what to fix. */
  description: string;
  /** Optional test id for assertions. Defaults to "validation-banner". */
  testId?: string;
  /** Optional className override. */
  className?: string;
}

/**
 * Reusable destructive validation banner used across the onboarding flow.
 *
 * Encapsulates the shared a11y + UX behavior:
 *  - role="alert" + aria-live="assertive" so screen readers announce immediately
 *  - imperative `surface()` method that scrolls into view AND optionally moves
 *    focus to the next actionable element near the banner (typically the field
 *    that failed validation), all inside a single rAF so the call lands after
 *    React commits the new banner DOM.
 */
const ValidationBanner = forwardRef<ValidationBannerHandle, ValidationBannerProps>(
  ({ show, title, description, testId = "validation-banner", className }, ref) => {
    const wrapperRef = useRef<HTMLDivElement | null>(null);

    useImperativeHandle(
      ref,
      () => ({
        surface: (focusTarget?: HTMLElement | null) => {
          requestAnimationFrame(() => {
            wrapperRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
            focusTarget?.focus();
          });
        },
      }),
      [],
    );

    // Defensive: if the banner gets unmounted, clear ref (React handles this,
    // but being explicit avoids stale references in tests using portals).
    useEffect(() => {
      return () => {
        wrapperRef.current = null;
      };
    }, []);

    if (!show) return null;

    return (
      <div ref={wrapperRef} className={className}>
        <Alert
          variant="destructive"
          role="alert"
          aria-live="assertive"
          className="mb-4"
          data-testid={testId}
        >
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{title}</AlertTitle>
          <AlertDescription>{description}</AlertDescription>
        </Alert>
      </div>
    );
  },
);

ValidationBanner.displayName = "ValidationBanner";

export default ValidationBanner;
