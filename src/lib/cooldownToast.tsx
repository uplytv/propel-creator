/**
 * Reusable cooldown toast helper.
 *
 * Renders a sonner toast that re-ticks every 200ms while a cooldown is
 * active, showing a progress bar + counting-down action label
 * ("Try again (Xs)"). When the cooldown elapses the action button becomes
 * enabled and clicking it invokes `onAction`.
 *
 * Variants (`error` | `warning` | `success`) keep consistent ARIA semantics
 * and restore-focus behavior — focus returns to whatever was focused when
 * the toast first appeared, on dismiss / auto-close / action.
 */
import { toast } from "sonner";
import {
  computeCooldownState,
  readSettingsNavLast,
} from "@/lib/settingsNavCooldown";
import { captureFocus } from "@/lib/restoreFocus";

export type CooldownToastVariant = "error" | "warning" | "success";

interface ShowCooldownToastOptions {
  /** Toast title (e.g. "Couldn't open Settings"). */
  title: string;
  /** Body description shown above the progress bar. */
  description: string;
  /** Visual + semantic variant. Defaults to "error". */
  variant?: CooldownToastVariant;
  /** Stable id — pass to dedupe across re-renders / ticks. */
  id?: string;
  /** Invoked when the user activates the action after cooldown. */
  onAction?: () => void;
  /** Action label when ready. Defaults to "Try again". */
  actionLabel?: string;
  /** Reads the last-attempt timestamp (ms). Defaults to settings-nav store. */
  readLastAttempt?: () => number;
}

const variantToFn = {
  error: toast.error,
  warning: toast.warning,
  success: toast.success,
} as const;

const variantToProgressClass = {
  error: "bg-destructive",
  warning: "bg-warning",
  success: "bg-primary",
} as const;

/**
 * Show a sonner cooldown toast with progress bar + countdown action.
 * Returns the toast id.
 */
export function showCooldownToast({
  title,
  description,
  variant = "error",
  id,
  onAction,
  actionLabel: actionLabelReady = "Try again",
  readLastAttempt = readSettingsNavLast,
}: ShowCooldownToastOptions): string {
  const toastId = id ?? `cooldown-${variant}-${Date.now()}`;
  const restoreFocus = captureFocus();
  const fn = variantToFn[variant];
  const progressClass = variantToProgressClass[variant];

  const tick = () => {
    const state = computeCooldownState(readLastAttempt());
    const { ready, elapsedPct, remainingSec } = state;
    const label = ready ? actionLabelReady : `${actionLabelReady} (${remainingSec}s)`;

    fn(title, {
      id: toastId,
      description: (
        <div className="space-y-2">
          <p>{description}</p>
          {!ready && (
            <div
              className="h-1 w-full overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(elapsedPct)}
              aria-label="Cooldown progress"
            >
              <div
                className={`h-full ${progressClass} transition-[width] duration-200 ease-linear`}
                style={{ width: `${elapsedPct}%` }}
              />
            </div>
          )}
        </div>
      ),
      duration: ready ? 8000 : 1500,
      onDismiss: () => restoreFocus(),
      onAutoClose: () => restoreFocus(),
      action: onAction
        ? {
            label,
            onClick: () => {
              if (!ready) return;
              restoreFocus();
              onAction();
            },
          }
        : undefined,
    });

    if (!ready) setTimeout(tick, 200);
  };

  tick();
  return toastId;
}
