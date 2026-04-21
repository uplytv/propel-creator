import { useEffect, useLayoutEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, ArrowRight, ArrowLeft, Check, Rocket, DollarSign, Users, TrendingUp, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";

export type TourStep = {
  id: string;
  /** CSS selector or `data-tour` key (we look for `[data-tour="<id>"]`) */
  target?: string;
  /** Optional route to navigate to before showing this step */
  route?: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
  cta?: string;
  /** Where to anchor the tooltip relative to the target. Auto if omitted. */
  placement?: "top" | "bottom" | "left" | "right" | "center";
};

const STORAGE_KEY = "uply_creator_tour_v1";

export const CREATOR_TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    icon: Rocket,
    title: "Welcome to your creator HQ",
    body: "In 90 seconds I'll walk you through earning your first dollar and growing your audience. Ready?",
    cta: "Start the tour",
    placement: "center",
  },
  {
    id: "first-dollar",
    target: "first-dollar-wizard",
    route: "/dashboard",
    icon: DollarSign,
    title: "Step 1 — Your first monetized product",
    body: "Pick what you'll sell first: a paid community, a course, or live tips. This is the fastest path to your first dollar on UPLY.",
    cta: "Got it",
    placement: "bottom",
  },
  {
    id: "products",
    target: "nav-products",
    route: "/products",
    icon: DollarSign,
    title: "Step 2 — Manage your products",
    body: "Every product you create lives here. Set pricing, free trials, and one-time vs subscription. We handle Stripe, taxes, and payouts.",
    cta: "Next",
    placement: "right",
  },
  {
    id: "audience",
    target: "nav-grow",
    route: "/grow",
    icon: Users,
    title: "Step 3 — Build your audience",
    body: "The Grow tab is your audience playbook: invite friends, capture emails, run referral campaigns, and unlock viral loops.",
    cta: "Next",
    placement: "right",
  },
  {
    id: "discovery",
    target: "nav-discover",
    route: "/discover",
    icon: TrendingUp,
    title: "Step 4 — Get discovered",
    body: "Every video, clip, and stream you publish enters UPLY's discovery engine within seconds. Post often — momentum compounds.",
    cta: "Next",
    placement: "right",
  },
  {
    id: "go-live",
    target: "nav-go-live",
    route: "/dashboard",
    icon: Megaphone,
    title: "Step 5 — Go live to convert",
    body: "Live streams convert 5–10× better than VOD. Schedule one this week — we'll notify your followers automatically.",
    cta: "Next",
    placement: "left",
  },
  {
    id: "finish",
    icon: Sparkles,
    title: "You're set up to win 🎉",
    body: "Your growth plan: ① Launch one product. ② Go live once a week. ③ Post 1 short daily. Do that for 30 days and you'll have your first 100 paying members.",
    cta: "Let's go",
    placement: "center",
  },
];

interface Rect { top: number; left: number; width: number; height: number; }

function getTargetRect(targetId?: string): Rect | null {
  if (!targetId) return null;
  const el =
    document.querySelector<HTMLElement>(`[data-tour="${targetId}"]`) ||
    document.querySelector<HTMLElement>(targetId);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

export default function CreatorTour({
  forceOpen,
  onComplete,
}: {
  forceOpen?: boolean;
  onComplete?: () => void;
}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  // Track viewport size in state so positioning recalculates on resize and
  // orientation change (e.g. phone rotation). Without this, `tooltipStyle` is
  // computed during render using stale `window.innerWidth/Height` snapshots.
  const [viewport, setViewport] = useState<{ w: number; h: number }>(() => ({
    w: typeof window !== "undefined" ? window.innerWidth : 0,
    h: typeof window !== "undefined" ? window.innerHeight : 0,
  }));
  const rafRef = useRef<number | null>(null);
  const viewportRafRef = useRef<number | null>(null);

  // Subscribe to resize + orientationchange so the tooltip never clips after
  // the user rotates their device or the visual viewport shrinks (e.g. when
  // the mobile browser chrome or keyboard appears/disappears).
  useEffect(() => {
    const update = () => {
      if (viewportRafRef.current) cancelAnimationFrame(viewportRafRef.current);
      viewportRafRef.current = requestAnimationFrame(() => {
        setViewport({ w: window.innerWidth, h: window.innerHeight });
      });
    };
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    // visualViewport fires more reliably on iOS when the URL bar collapses.
    window.visualViewport?.addEventListener("resize", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      window.visualViewport?.removeEventListener("resize", update);
    };
  }, []);

  const step = CREATOR_TOUR_STEPS[stepIdx];

  // Live-region announcement for screen readers. We deliberately drive this
  // with a small delay (and a momentary clear) so assistive tech reliably
  // re-announces the new step even when the new text is similar to the
  // previous one — most screen readers only fire when the live region's
  // text content actually changes.
  const [liveMessage, setLiveMessage] = useState("");
  useEffect(() => {
    if (!open || !step) {
      setLiveMessage("");
      return;
    }
    setLiveMessage("");
    const t = setTimeout(() => {
      setLiveMessage(
        `Step ${stepIdx + 1} of ${CREATOR_TOUR_STEPS.length}. ${step.title}. ${step.body}`,
      );
    }, 80);
    return () => clearTimeout(t);
  }, [open, step, stepIdx]);

  // Decide whether to auto-open for new users
  useEffect(() => {
    if (forceOpen) {
      setOpen(true);
      setStepIdx(0);
      return;
    }
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) {
      // small delay so dashboard renders
      const t = setTimeout(() => setOpen(true), 800);
      return () => clearTimeout(t);
    }
  }, [forceOpen]);

  // Listen for imperative launch (e.g. from a "Replay tour" button)
  useEffect(() => {
    const handler = () => {
      setStepIdx(0);
      setOpen(true);
    };
    window.addEventListener("uply:launch-tour", handler);
    return () => window.removeEventListener("uply:launch-tour", handler);
  }, []);

  // Navigate to step's route if needed
  useEffect(() => {
    if (!open || !step) return;
    if (step.route && window.location.pathname !== step.route) {
      navigate(step.route);
    }
  }, [open, step, navigate]);

  // Track target rect (and re-measure on scroll/resize)
  useLayoutEffect(() => {
    if (!open || !step) return;
    const measure = () => {
      const r = getTargetRect(step.target);
      setRect(r);
    };
    // measure repeatedly for first ~600ms in case route just changed
    let count = 0;
    const interval = setInterval(() => {
      measure();
      if (++count > 12) clearInterval(interval);
    }, 50);
    const onScroll = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(measure);
    };
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      clearInterval(interval);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open, step, stepIdx]);

  const finish = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
    onComplete?.();
  }, [onComplete]);

  const next = () => {
    if (stepIdx >= CREATOR_TOUR_STEPS.length - 1) finish();
    else setStepIdx((i) => i + 1);
  };
  const prev = () => setStepIdx((i) => Math.max(0, i - 1));

  if (!open || !step) return null;

  const isCenter = step.placement === "center" || !step.target || !rect;
  const Icon = step.icon;

  // Compute tooltip position
  let tooltipStyle: React.CSSProperties = {};
  const SIDE_MARGIN = 16;
  const isNarrow = viewport.w > 0 && viewport.w < 640;
  const TOOLTIP_W = isNarrow ? Math.min(340, viewport.w - SIDE_MARGIN * 2) : 340;
  const tooltipWidthStyle: React.CSSProperties = { width: TOOLTIP_W, maxWidth: `calc(100vw - ${SIDE_MARGIN * 2}px)` };

  // NOTE: We avoid CSS `transform` for positioning here because framer-motion's
  // `animate` prop drives `transform` and would clobber a translate(-50%,-50%).
  // Instead we compute concrete top/left values that already account for the
  // tooltip's own size, so the card lands in the intended spot on every device.
  const viewportW = viewport.w;
  const viewportH = viewport.h;
  // Estimated tooltip height — only used for vertical clamping. Real height is
  // measured by layout; this is intentionally generous so we never under-clamp.
  const TOOLTIP_H_EST = 280;

  if (isCenter) {
    tooltipStyle = {
      top: Math.max(SIDE_MARGIN, (viewportH - TOOLTIP_H_EST) / 2),
      left: Math.max(SIDE_MARGIN, (viewportW - TOOLTIP_W) / 2),
    };
  } else if (rect) {
    const PAD = 12;
    const clampLeft = (l: number) =>
      Math.max(SIDE_MARGIN, Math.min(viewportW - TOOLTIP_W - SIDE_MARGIN, l));
    const clampTop = (t: number) =>
      Math.max(SIDE_MARGIN, Math.min(viewportH - TOOLTIP_H_EST - SIDE_MARGIN, t));
    // On narrow screens (mobile), always place top/bottom and center horizontally
    // so left/right placements don't push the card off-screen.
    let placement = step.placement || (rect.top > viewportH / 2 ? "top" : "bottom");
    if (isNarrow && (placement === "left" || placement === "right")) {
      placement = rect.top > viewportH / 2 ? "top" : "bottom";
    }
    if (placement === "bottom") {
      tooltipStyle = { top: clampTop(rect.top + rect.height + PAD), left: clampLeft(rect.left) };
    } else if (placement === "top") {
      // Manually subtract estimated height instead of using translateY(-100%),
      // which would be overridden by framer-motion's transform animation.
      tooltipStyle = { top: clampTop(rect.top - PAD - TOOLTIP_H_EST), left: clampLeft(rect.left) };
    } else if (placement === "right") {
      tooltipStyle = { top: clampTop(rect.top), left: clampLeft(rect.left + rect.width + PAD) };
    } else {
      tooltipStyle = { top: clampTop(rect.top), left: clampLeft(rect.left - PAD - TOOLTIP_W) };
    }
  }

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="tour-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9998]"
      >
        {/* Visually-hidden live region — announces step changes to screen
            readers. Lives outside the dialog so it isn't torn down on each
            step transition (the dialog re-mounts via key={step.id}). */}
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          data-testid="creator-tour-live-region"
          className="sr-only"
        >
          {liveMessage}
        </div>
        {/* Spotlight via SVG mask */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-auto"
          onClick={isCenter ? undefined : next}
          aria-hidden="true"
          focusable="false"
        >
          <defs>
            <mask id="tour-mask">
              <rect width="100%" height="100%" fill="white" />
              {!isCenter && rect && (
                <rect
                  x={rect.left - 8}
                  y={rect.top - 8}
                  width={rect.width + 16}
                  height={rect.height + 16}
                  rx={12}
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect width="100%" height="100%" fill="hsl(var(--background) / 0.85)" mask="url(#tour-mask)" />
          {!isCenter && rect && (
            <rect
              x={rect.left - 8}
              y={rect.top - 8}
              width={rect.width + 16}
              height={rect.height + 16}
              rx={12}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="2"
              className="animate-pulse"
            />
          )}
        </svg>

        {/* Tooltip card */}
        <motion.div
          key={step.id}
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.2 }}
          style={{ ...tooltipStyle, ...tooltipWidthStyle }}
          className="fixed z-[9999] rounded-2xl border border-border bg-card shadow-2xl p-5"
          data-testid="creator-tour-popover"
          // Dialog semantics: announce as a non-modal dialog (the rest of the
          // page is still visually dimmed but not aria-hidden, so screen
          // reader users keep their place). `aria-labelledby` /
          // `aria-describedby` point at the title + body so VoiceOver / NVDA
          // read the step heading and explanation as soon as it opens.
          role="dialog"
          aria-modal="false"
          aria-labelledby={`tour-step-${step.id}-title`}
          aria-describedby={`tour-step-${step.id}-body`}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div
                className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center"
                aria-hidden="true"
              >
                <Icon className="w-4.5 h-4.5 text-primary" />
              </div>
              <div>
                <p
                  className="text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                  aria-label={`Step ${stepIdx + 1} of ${CREATOR_TOUR_STEPS.length}`}
                >
                  Step {stepIdx + 1} of {CREATOR_TOUR_STEPS.length}
                </p>
              </div>
            </div>
            <button
              onClick={finish}
              className="text-muted-foreground hover:text-foreground transition"
              aria-label="Skip tour"
              data-testid="creator-tour-skip"
              type="button"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          <h3
            id={`tour-step-${step.id}-title`}
            className="text-base font-bold text-foreground mb-1.5"
          >
            {step.title}
          </h3>
          <p
            id={`tour-step-${step.id}-body`}
            className="text-sm text-muted-foreground leading-relaxed mb-4"
          >
            {step.body}
          </p>

          {/* Progress dots — purely decorative; the textual "Step X of N"
              above already communicates progress to assistive tech. */}
          <div
            className="flex items-center gap-1 mb-4"
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={CREATOR_TOUR_STEPS.length}
            aria-valuenow={stepIdx + 1}
            aria-label="Tour progress"
          >
            {CREATOR_TOUR_STEPS.map((_, i) => (
              <div
                key={i}
                aria-hidden="true"
                className={`h-1 rounded-full transition-all ${
                  i === stepIdx ? "w-6 bg-primary" : i < stepIdx ? "w-3 bg-primary/50" : "w-3 bg-border"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={prev}
              disabled={stepIdx === 0}
              className="gap-1.5"
              data-testid="creator-tour-back"
              aria-label="Go back to previous tour step"
            >
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" /> Back
            </Button>
            <Button
              size="sm"
              onClick={next}
              className="gap-1.5 flex-1 max-w-[180px]"
              data-testid="creator-tour-advance"
              data-tour-step={step.id}
              aria-label={
                stepIdx === CREATOR_TOUR_STEPS.length - 1
                  ? `Finish tour: ${step.cta || "Finish"}`
                  : `Advance to step ${stepIdx + 2} of ${CREATOR_TOUR_STEPS.length}: ${step.cta || "Next"}`
              }
            >
              {stepIdx === CREATOR_TOUR_STEPS.length - 1 ? (
                <>
                  <Check className="w-3.5 h-3.5" aria-hidden="true" /> {step.cta || "Finish"}
                </>
              ) : (
                <>
                  {step.cta || "Next"} <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}

/** Imperative API: launch the tour from any settings/help button */
export function launchCreatorTour() {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent("uply:launch-tour"));
}
