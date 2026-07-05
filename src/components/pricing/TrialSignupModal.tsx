import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CalendarCheck, Loader2, MailCheck, PartyPopper, ShieldCheck } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { trackEvent } from "@/lib/posthog";
import { validatePassword } from "@/lib/passwordValidation";
import {
  PLATFORM_PLANS,
  SETUP_CALL_URL,
  TRIAL_DAYS,
  TRIAL_INTENT_STORAGE_KEY,
  TRIAL_RISK_REVERSAL,
  type PlatformPlanKey,
} from "./plans";

interface TrialSignupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Plan preselected by the card the user clicked. */
  defaultPlan: PlatformPlanKey;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Same PCI-safe pattern as PurchaseOverlay: card entry happens inside
// Stripe's embedded-checkout iframe — no card data ever touches our code.
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "");

export default function TrialSignupModal({ open, onOpenChange, defaultPlan }: TrialSignupModalProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2>(1);
  const [company, setCompany] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<PlatformPlanKey>(defaultPlan);
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState<{
    company?: string;
    fullName?: string;
    email?: string;
    password?: string;
  }>({});
  const [creatingAccount, setCreatingAccount] = useState(false);
  // True when supabase.auth.signUp succeeded but returned no session —
  // the project requires email confirmation, so payment resumes via
  // the uply_trial_intent + TrialIntentResume fallback after confirming.
  const [awaitingEmailConfirm, setAwaitingEmailConfirm] = useState(false);
  // Set as soon as signUp hands back a live session (AuthContext's `user`
  // updates async, but the supabase client can already call edge functions).
  const [sessionReady, setSessionReady] = useState(false);

  // Embedded checkout state (step 2)
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutAttempt, setCheckoutAttempt] = useState(0);
  // Card accepted, trial subscription live → in-modal success/onboarding step.
  const [trialLive, setTrialLive] = useState(false);

  // Reset + prefill only on the closed→open transition, so an auth-state
  // change mid-flow (signUp inside the modal) can't yank the user back to step 1.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open && !wasOpen.current) {
      setStep(1);
      setSelectedPlan(defaultPlan);
      setErrors({});
      setAgreed(false);
      setAwaitingEmailConfirm(false);
      setClientSecret(null);
      setCheckoutError(null);
      setTrialLive(false);
      if (user) {
        setEmail((prev) => prev || user.email || "");
        setFullName(
          (prev) => prev || (user.user_metadata?.full_name as string | undefined) || ""
        );
      }
    }
    wasOpen.current = open;
  }, [open, defaultPlan, user]);

  const plan = PLATFORM_PLANS.find((p) => p.key === selectedPlan) ?? PLATFORM_PLANS[0];
  const isAuthed = !!user || sessionReady;

  // GHL-simple step 1: no password field. Accounts are auto-created with a
  // secure generated password; a set-password email follows. The field only
  // appears inline if the email already has an account (sign-in required).
  const [existingAccount, setExistingAccount] = useState(false);

  const validateStep1 = () => {
    const next: typeof errors = {};
    if (!company.trim()) next.company = "Company or brand name is required";
    if (!fullName.trim()) next.fullName = "Full name is required";
    if (!email.trim()) next.email = "Email is required";
    else if (!EMAIL_RE.test(email.trim())) next.email = "Enter a valid email address";
    if (!isAuthed && existingAccount) {
      if (!password) next.password = "Enter your existing UPLY password";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const stashIntent = () => {
    try {
      localStorage.setItem(
        TRIAL_INTENT_STORAGE_KEY,
        JSON.stringify({
          plan: selectedPlan,
          company: company.trim(),
          full_name: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
        })
      );
    } catch {
      // localStorage unavailable (private mode) — flow still works without the stash.
    }
  };

  /** Existing account detected mid-signup → reveal an inline password field and
   *  sign in right here, then continue to payment. Never leaves the modal. */
  const redirectExistingAccount = async () => {
    if (!existingAccount || !password) {
      // First detection: reveal the password field on step 1 and explain.
      setExistingAccount(true);
      toast.info("You already have an account", {
        description: "Enter your UPLY password below to continue straight to payment.",
      });
      return;
    }
    trackEvent("platform_trial_signin_inline", { plan: selectedPlan, price: plan.price, reason: "existing_account" });
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error || !data.session) {
      setErrors((prev) => ({ ...prev, password: "That password doesn't match this account" }));
      return;
    }
    setSessionReady(true);
    setAwaitingEmailConfirm(false);
    try {
      localStorage.removeItem(TRIAL_INTENT_STORAGE_KEY);
    } catch {
      /* noop */
    }
    setStep(2);
  };

  const handleContinue = async () => {
    if (!validateStep1() || creatingAccount) return;

    if (isAuthed) {
      setStep(2);
      return;
    }

    // Existing account with the inline password revealed → sign in, don't re-signup.
    if (existingAccount) {
      setCreatingAccount(true);
      await redirectExistingAccount();
      setCreatingAccount(false);
      return;
    }

    // Create the account NOW so payment can happen inside step 2. No password
    // asked at this step (GHL-simple): we generate a secure one and email the
    // user a set-password link after payment.
    setCreatingAccount(true);
    try {
      // Guard: TrialIntentResume fires on any auth-state change when an intent
      // is stashed. We're handling checkout inline, so suppress it for this page load.
      try {
        sessionStorage.setItem("uply_trial_resume_attempted", "1");
      } catch {
        /* sessionStorage unavailable */
      }

      const generatedPassword =
        Array.from(crypto.getRandomValues(new Uint8Array(18)), (b) => b.toString(16).padStart(2, "0")).join("") + "Aa1!";

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: generatedPassword,
        options: {
          emailRedirectTo: window.location.origin,
          data: { full_name: fullName.trim() },
        },
      });

      if (error) {
        if (/already|registered|exists/i.test(error.message)) {
          await redirectExistingAccount();
          return;
        }
        throw error;
      }

      // With "Confirm email" ON, Supabase obfuscates existing accounts:
      // signUp "succeeds" but the user has no identities. Treat as existing.
      if (data.user && !data.session && (data.user.identities?.length ?? 0) === 0) {
        await redirectExistingAccount();
        return;
      }

      trackEvent("platform_trial_account_created", {
        plan: selectedPlan,
        instant_session: !!data.session,
      });

      if (data.session) {
        // Live session — proceed straight to in-modal payment. Send a
        // set-password link so they can choose their own password later
        // (account was created with a generated one). Fire-and-forget.
        supabase.auth
          .resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` })
          .catch(() => {});
        setSessionReady(true);
        setAwaitingEmailConfirm(false);
        try {
          localStorage.removeItem(TRIAL_INTENT_STORAGE_KEY);
        } catch {
          /* noop */
        }
      } else {
        // Email confirmation required by the Supabase project — stash the
        // intent so TrialIntentResume relaunches checkout after they confirm.
        stashIntent();
        setAwaitingEmailConfirm(true);
      }
      setStep(2);
    } catch (err: any) {
      toast.error(err?.message || "Could not create your account. Please try again.");
    } finally {
      setCreatingAccount(false);
    }
  };

  // Step 2: create the embedded checkout session (14-day trial, card on file,
  // billed after) as soon as we're authed. Re-runs when the plan radio changes.
  useEffect(() => {
    if (!open || step !== 2 || awaitingEmailConfirm || !isAuthed || trialLive) return;

    let cancelled = false;
    setClientSecret(null);
    setCheckoutError(null);
    setCheckoutLoading(true);

    supabase.functions
      .invoke("create-platform-checkout", {
        body: {
          plan: selectedPlan,
          trial: true,
          embedded: true,
          company: company.trim(),
          full_name: fullName.trim(),
          phone: phone.trim(),
        },
      })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) throw error;
        if (!data?.client_secret) throw new Error("No checkout session returned");
        setClientSecret(data.client_secret);
      })
      .catch((err: any) => {
        if (!cancelled) setCheckoutError(err?.message || "Could not load secure checkout");
      })
      .finally(() => {
        if (!cancelled) setCheckoutLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // company/fullName/phone are frozen once step 2 renders — plan is the only live input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step, awaitingEmailConfirm, isAuthed, selectedPlan, checkoutAttempt, trialLive]);

  // Card accepted inside the iframe → trial subscription is live. The session
  // is created with redirect_on_completion "never", so no page reload happens:
  // we swap the modal to the success/onboarding step right here.
  const handleCheckoutComplete = useCallback(() => {
    try {
      localStorage.removeItem(TRIAL_INTENT_STORAGE_KEY);
    } catch {
      /* noop */
    }
    trackEvent("platform_trial_started", { plan: selectedPlan, price: plan.price });
    setTrialLive(true);
  }, [selectedPlan, plan.price]);

  const goToDashboard = () => {
    onOpenChange(false);
    navigate("/dashboard?trial=started");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        // Once the trial is live, any dismissal should land them in the app.
        if (!nextOpen && trialLive) {
          goToDashboard();
          return;
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent
        className={`rounded-md ${
          step === 2 && !trialLive ? "sm:max-w-lg max-h-[92vh] overflow-y-auto" : "sm:max-w-md"
        }`}
      >
        {trialLive ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <PartyPopper className="h-5 w-5 text-primary" />
                You're in — your {TRIAL_DAYS}-day trial is live
              </DialogTitle>
              <DialogDescription>
                Your card is on file and UPLY {plan.name} is unlocked. One last thing before you dive in.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-1">
              {/* Free human setup call — the onboarding offer */}
              <div className="rounded-md border border-primary/40 bg-primary/5 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-primary/15">
                    <CalendarCheck className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">Book your free setup call</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      We'll build your website funnel, SEO blog post, and community &amp; course
                      setup with you — a real human rep, free with your trial.
                    </p>
                  </div>
                </div>
                <Button
                  className="mt-3 w-full rounded-sm font-bold"
                  onClick={() => window.open(SETUP_CALL_URL, "_blank", "noopener,noreferrer")}
                >
                  Book my setup call
                </Button>
                <p className="mt-2 text-center text-xs text-muted-foreground">{TRIAL_RISK_REVERSAL}</p>
              </div>

              <button
                type="button"
                onClick={goToDashboard}
                className="w-full text-center text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                Skip for now — go to my dashboard
              </button>
            </div>
          </>
        ) : step === 1 ? (
          <>
            <DialogHeader>
              <DialogTitle>Tell us about your business</DialogTitle>
              <DialogDescription>
                Step 1 of 2 — a few details so we can set up your trial.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-1">
              <div className="space-y-1.5">
                <Label htmlFor="trial-company">Company / Brand name</Label>
                <Input
                  id="trial-company"
                  className="rounded-sm"
                  placeholder="Your brand"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
                {errors.company && <p className="text-xs text-destructive">{errors.company}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="trial-name">Full name</Label>
                <Input
                  id="trial-name"
                  className="rounded-sm"
                  placeholder="Your name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
                {errors.fullName && <p className="text-xs text-destructive">{errors.fullName}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="trial-email">Email</Label>
                <Input
                  id="trial-email"
                  type="email"
                  className="rounded-sm"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>
              {!isAuthed && existingAccount && (
                <div className="space-y-1.5">
                  <Label htmlFor="trial-password">Welcome back — enter your password</Label>
                  <Input
                    id="trial-password"
                    type="password"
                    autoComplete="current-password"
                    className="rounded-sm"
                    placeholder="Your UPLY password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="trial-phone">
                  Phone <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Input
                  id="trial-phone"
                  type="tel"
                  className="rounded-sm"
                  placeholder="+1 (555) 000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            <Button
              onClick={handleContinue}
              disabled={creatingAccount}
              className="w-full rounded-sm font-bold"
            >
              {creatingAccount && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {creatingAccount ? "Creating your account…" : "Continue to step 2"}
            </Button>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Start your {TRIAL_DAYS}-day free trial</DialogTitle>
              <DialogDescription>
                Step 2 of 2 — confirm your plan and add a card. $0.00 due today.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-1">
              <RadioGroup
                value={selectedPlan}
                onValueChange={(v) => setSelectedPlan(v as PlatformPlanKey)}
                className="gap-0 divide-y divide-border border border-border rounded-md"
              >
                {PLATFORM_PLANS.map((p) => (
                  <label
                    key={p.key}
                    htmlFor={`trial-plan-${p.key}`}
                    className={`flex cursor-pointer items-start gap-3 p-3 ${
                      selectedPlan === p.key ? "bg-muted" : "bg-card"
                    }`}
                  >
                    <RadioGroupItem id={`trial-plan-${p.key}`} value={p.key} className="mt-0.5" />
                    <span className="flex-1">
                      <span className="flex items-center gap-2 text-sm font-bold text-foreground">
                        UPLY {p.name}
                        {p.popular && (
                          <span className="rounded-sm bg-primary px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary-foreground">
                            Most popular
                          </span>
                        )}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {TRIAL_DAYS}-day free trial — then ${p.price}/month
                      </span>
                    </span>
                  </label>
                ))}
              </RadioGroup>

              {/* Order summary */}
              <div className="flex items-center justify-between border border-border bg-muted/50 rounded-sm px-3 py-2.5 text-sm">
                <span className="text-muted-foreground">
                  UPLY {plan.name} · due today
                </span>
                <span className="font-bold text-foreground">
                  $0.00 <span className="font-normal text-muted-foreground">— then ${plan.price}/mo</span>
                </span>
              </div>

              <div className="flex items-start gap-2.5">
                <Checkbox
                  id="trial-terms"
                  checked={agreed}
                  onCheckedChange={(v) => setAgreed(v === true)}
                  className="mt-0.5 rounded-sm"
                />
                <Label htmlFor="trial-terms" className="text-xs font-normal leading-relaxed text-muted-foreground">
                  I agree to the{" "}
                  <Link to="/terms" target="_blank" className="text-primary underline">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link to="/privacy" target="_blank" className="text-primary underline">
                    Privacy Policy
                  </Link>
                </Label>
              </div>

              {/* Payment — Stripe embedded checkout (PCI-safe iframe) */}
              {awaitingEmailConfirm ? (
                <div className="flex items-start gap-3 rounded-sm border border-border bg-muted/50 p-3.5">
                  <MailCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div className="text-xs leading-relaxed text-muted-foreground">
                    <p className="font-bold text-foreground">Check your email to confirm your account</p>
                    <p className="mt-1">
                      We sent a confirmation link to <span className="font-semibold text-foreground">{email.trim()}</span>.
                      Click it and payment resumes automatically — your {TRIAL_DAYS} free days are saved.
                    </p>
                  </div>
                </div>
              ) : checkoutError ? (
                <div className="rounded-sm border border-border bg-muted/30 p-4 text-center">
                  <p className="mb-3 text-xs text-destructive">{checkoutError}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-sm"
                    onClick={() => setCheckoutAttempt((n) => n + 1)}
                  >
                    Try again
                  </Button>
                </div>
              ) : clientSecret ? (
                <div className="space-y-2">
                  {/* Card entry is always visible and required; it becomes
                      interactive once the terms box above is ticked. */}
                  <div
                    aria-disabled={!agreed}
                    className={`rounded-sm border border-border bg-card transition-opacity ${agreed ? "" : "pointer-events-none opacity-50"}`}
                  >
                    <EmbeddedCheckoutProvider
                      key={clientSecret}
                      stripe={stripePromise}
                      options={{ clientSecret, onComplete: handleCheckoutComplete }}
                    >
                      <EmbeddedCheckout />
                    </EmbeddedCheckoutProvider>
                  </div>
                  {!agreed && (
                    <p className="text-center text-xs font-medium text-muted-foreground">
                      Card details are required to start your trial — tick the box above to enable payment.
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 rounded-sm border border-border bg-muted/30 py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <p className="text-xs text-muted-foreground">
                    {checkoutLoading ? "Loading secure checkout…" : "Preparing checkout…"}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              {!awaitingEmailConfirm && (
                <div className="space-y-1">
                  <p className="text-center text-xs font-semibold text-foreground">
                    {TRIAL_RISK_REVERSAL}
                  </p>
                  <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Secured by Stripe — after {TRIAL_DAYS} days, ${plan.price}/mo is billed to the card on file.
                  </p>
                </div>
              )}
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
              >
                Back to step 1
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
