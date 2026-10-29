import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, MailCheck, ShieldCheck } from "lucide-react";
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
import { getAffiliateCookie } from "@/lib/affiliateCookies";
import {
  PLATFORM_PLANS,
  TRIAL_DAYS,
  TRIAL_INTENT_STORAGE_KEY,
  TRIAL_PROFILE_STORAGE_KEY,
  trialRiskReversal,
  type PlatformPlanKey,
} from "./plans";

interface TrialSignupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Plan preselected by the card the user clicked. */
  defaultPlan: PlatformPlanKey;
  /**
   * Trial length shown and requested (founding offer passes 30). The server
   * clamps to {14, 30} — this prop can never mint an arbitrary trial.
   */
  trialDays?: number;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Hosted Checkout only. Reject anything else so a bad payload can't navigate off-site. */
function isStripeCheckoutUrl(value: unknown): value is string {
  if (typeof value !== "string" || !value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "checkout.stripe.com";
  } catch {
    return false;
  }
}

/** Shared wizard header: centered title + two-step tab indicator with active underline. */
function WizardHeader({ active, days }: { active: 1 | 2; days: number }) {
  const steps = [
    { n: 1 as const, title: "Step 1", sub: "Tell us about your business" },
    { n: 2 as const, title: "Step 2", sub: "Trial details" },
  ];
  return (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle className="text-center text-xl font-extrabold tracking-tight">
          Start your {days}-day free trial today!
        </DialogTitle>
        <DialogDescription className="sr-only">
          Two quick steps: tell us about your business, then confirm your plan and add a card.
        </DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-2 text-center">
        {steps.map((s) => (
          <div key={s.n} className={`pb-2 border-b-2 ${active === s.n ? "border-primary" : "border-border"}`}>
            <p className={`text-sm font-bold ${active === s.n ? "text-primary" : "text-muted-foreground"}`}>{s.title}</p>
            <p className="text-xs text-muted-foreground">{s.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TrialSignupModal({
  open,
  onOpenChange,
  defaultPlan,
  trialDays = TRIAL_DAYS,
}: TrialSignupModalProps) {
  const { user } = useAuth();
  // Server clamps to {14, 30}; mirror it so the UI never promises otherwise.
  const effectiveTrialDays = trialDays === 30 ? 30 : TRIAL_DAYS;

  const [step, setStep] = useState<1 | 2>(1);
  const [company, setCompany] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  // Explicit, separate SMS marketing consent. Never implied by entering a phone.
  const [smsConsent, setSmsConsent] = useState(false);
  const [password, setPassword] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<PlatformPlanKey>(defaultPlan);
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState<{
    company?: string;
    fullName?: string;
    email?: string;
    phone?: string;
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

  // Step 2 confirms the plan, then redirects to hosted Stripe Checkout.
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Reset + prefill only on the closed→open transition, so an auth-state
  // change mid-flow (signUp inside the modal) can't yank the user back to step 1.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open && !wasOpen.current) {
      setStep(1);
      setSelectedPlan(defaultPlan);
      setErrors({});
      setAgreed(false);
      setSmsConsent(false);
      setAwaitingEmailConfirm(false);
      setCheckoutLoading(false);
      setCheckoutError(null);
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
    // Company and phone are OPTIONAL — neither Stripe checkout nor Supabase
    // auth requires them (create-platform-checkout stamps them onto metadata
    // only when present). Blank values are simply never written.
    if (!fullName.trim()) next.fullName = "Full name is required";
    if (!email.trim()) next.email = "Email is required";
    else if (!EMAIL_RE.test(email.trim())) next.email = "Enter a valid email address";
    // Only validate the phone's shape when the user chose to give one.
    if (phone.trim() && phone.replace(/\D/g, "").length < 7)
      next.phone = "Enter a valid phone number, or leave it blank";
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
    stashProfile();
  };

  /** Step-1 answers stashed for the profiles write-back on the first
   *  authenticated Dashboard visit — the guest-checkout and email-confirm
   *  flows can't write another account's profiles row from here. */
  const stashProfile = () => {
    try {
      localStorage.setItem(
        TRIAL_PROFILE_STORAGE_KEY,
        JSON.stringify({
          company: company.trim(),
          full_name: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
        })
      );
    } catch {
      // localStorage unavailable — non-critical.
    }
  };

  /** Persist Step-1 answers onto the signed-in user's own profiles row.
   *  Fire-and-forget: the trial flow must never block or fail on this.
   *  phone/company_name ship in 20261029040000 and are not in generated types
   *  yet — a missing column 400s this update and the stash is kept for retry. */
  const persistStep1Profile = async (userId: string) => {
    try {
      const patch: Record<string, string> = {};
      if (phone.trim()) patch.phone = phone.trim();
      if (company.trim()) patch.company_name = company.trim();
      if (fullName.trim()) {
        // Only fill display_name when empty — never clobber a chosen name.
        const { data: prof } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("user_id", userId)
          .maybeSingle();
        if (!prof?.display_name) patch.display_name = fullName.trim();
      }
      if (Object.keys(patch).length === 0) return;
      const { error } = await (supabase as any).from("profiles").update(patch).eq("user_id", userId);
      if (!error) {
        try {
          localStorage.removeItem(TRIAL_PROFILE_STORAGE_KEY);
        } catch {
          /* noop */
        }
      }
    } catch {
      // Non-critical — the Dashboard stash write-back is the fallback.
    }
  };

  // Guest checkout: the email already has an UPLY account but NO paid plan —
  // don't wall the purchase behind a password. Step 2 checks out by email;
  // Stripe attaches the card + trial to their customer record, and they sign
  // in later for access. The password wall only appears if the backend says
  // the email already carries a live paid plan (already_subscribed).
  const [guestCheckout, setGuestCheckout] = useState(false);

  // Signals Landing's authed-redirect to stand down while the trial is mid-flow
  // (Step 1 creates a session; redirecting would unmount the modal before the
  // Step 2 card capture ever renders — e2e-caught P0).
  useEffect(() => {
    if (open) sessionStorage.setItem("uply_trial_in_progress", "1");
    else sessionStorage.removeItem("uply_trial_in_progress");
    return () => sessionStorage.removeItem("uply_trial_in_progress");
  }, [open]);

  /** Existing account detected mid-signup → continue as guest checkout unless
   *  the account already has a live paid plan (then sign-in is required). */
  const redirectExistingAccount = async () => {
    if (!existingAccount || !password) {
      if (!existingAccount) {
        // Unpaid existing account → frictionless guest checkout.
        setGuestCheckout(true);
        stashIntent();
        toast.info("You already have an UPLY account", {
          description: "No problem — start your trial now and sign in afterwards to access it.",
        });
        setStep(2);
        return;
      }
      // Password wall is showing (already_subscribed) but empty — prompt.
      toast.info("Enter your password", {
        description: "This email already has an active plan — sign in to continue.",
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
    void persistStep1Profile(data.session.user.id);
    setStep(2);
  };

  const handleContinue = async () => {
    if (!validateStep1() || creatingAccount) return;

    if (isAuthed) {
      if (user) void persistStep1Profile(user.id);
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
        void persistStep1Profile(data.session.user.id);
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

  // Step 2 does not mount Embedded Checkout. After the plan + ToS are
  // confirmed, create-platform-checkout (hosted mode) returns session.url
  // and the browser goes to checkout.stripe.com. Card entry stays on Stripe.
  const startHostedCheckout = async () => {
    if (!agreed || checkoutLoading || awaitingEmailConfirm) return;
    if (!(isAuthed || guestCheckout)) return;

    setCheckoutError(null);
    setCheckoutLoading(true);

    // Affiliate attribution: forward the uply_ref cookie (if any) so the
    // checkout stamps metadata.affiliate_code for the scheduled reconciler.
    // Display-only on this side — the server sanitizes it, it never changes
    // pricing, and commission amounts are always computed server-side.
    const affiliateCode = getAffiliateCookie("uply_ref");

    try {
      const { data, error } = await supabase.functions.invoke("create-platform-checkout", {
        body: {
          plan: selectedPlan,
          trial: true,
          // Optional fields are omitted entirely when blank.
          ...(company.trim() ? { company: company.trim() } : {}),
          full_name: fullName.trim(),
          ...(phone.trim() ? { phone: phone.trim(), sms_consent: smsConsent } : {}),
          email: email.trim(),
          // Additive: server clamps to {14, 30}.
          trial_days: effectiveTrialDays,
          ...(affiliateCode ? { affiliate_code: affiliateCode } : {}),
        },
      });
      if (error) throw error;
      if (data?.error === "already_subscribed") {
        // The email already carries a live paid plan — require sign-in.
        setGuestCheckout(false);
        setExistingAccount(true);
        setStep(1);
        toast.info("This email already has an active UPLY plan", {
          description: "Enter your password to sign in and manage your subscription.",
        });
        setCheckoutLoading(false);
        return;
      }
      if (!isStripeCheckoutUrl(data?.url)) throw new Error("No checkout URL returned");
      trackEvent("platform_trial_checkout_redirect", { plan: selectedPlan, price: plan.price });
      try {
        localStorage.removeItem(TRIAL_INTENT_STORAGE_KEY);
      } catch {
        /* noop */
      }
      window.location.assign(data.url);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not start secure checkout";
      setCheckoutError(message);
      setCheckoutLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`rounded-md ${
          step === 2 ? "sm:max-w-lg max-h-[92vh] overflow-y-auto" : "sm:max-w-md"
        }`}
      >
        {step === 1 ? (
          <>
            <WizardHeader active={1} days={effectiveTrialDays} />

            <div className="space-y-3 py-1">
              <div className="space-y-1">
                <Input
                  id="trial-company"
                  aria-label="Company name"
                  className="rounded-sm h-11"
                  placeholder="Company name (optional)"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
                {errors.company && <p className="text-xs text-destructive">{errors.company}</p>}
              </div>
              <div className="space-y-1">
                <Input
                  id="trial-name"
                  aria-label="Full name"
                  className="rounded-sm h-11"
                  placeholder="Full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
                {errors.fullName && <p className="text-xs text-destructive">{errors.fullName}</p>}
              </div>
              <div className="space-y-1">
                <Input
                  id="trial-email"
                  type="email"
                  aria-label="Email address"
                  className="rounded-sm h-11"
                  placeholder="Email address"
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
              <div className="space-y-1">
                <Input
                  id="trial-phone"
                  type="tel"
                  aria-label="Phone number"
                  className="rounded-sm h-11"
                  placeholder="Phone number (optional)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
              </div>
              {/* SMS is opt-in and only offered once a phone is actually given —
                  a supplied number never enrolls anyone in texts by itself. */}
              {phone.trim().length > 0 && (
                <label className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Checkbox
                    id="trial-sms-consent"
                    checked={smsConsent}
                    onCheckedChange={(v) => setSmsConsent(v === true)}
                    className="mt-0.5"
                  />
                  <span>Text me about my trial and setup. Optional — message rates may apply.</span>
                </label>
              )}
            </div>

            <div className="space-y-2">
              <Button
                onClick={handleContinue}
                disabled={creatingAccount}
                className="w-full rounded-sm font-bold h-11"
              >
                {creatingAccount && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {creatingAccount ? "Creating your account…" : "Go to step 2"}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                We'll email you about your trial. Company and phone are optional.
              </p>
            </div>
          </>
        ) : (
          <>
            <WizardHeader active={2} days={effectiveTrialDays} />

            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Go back to step 1
            </button>

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
                        {effectiveTrialDays}-day free trial — then ${p.price}/month
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

              {/* Card entry is hosted Stripe Checkout — not an embedded Element. */}
              {awaitingEmailConfirm ? (
                <div className="flex items-start gap-3 rounded-sm border border-border bg-muted/50 p-3.5">
                  <MailCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div className="text-xs leading-relaxed text-muted-foreground">
                    <p className="font-bold text-foreground">Check your email to confirm your account</p>
                    <p className="mt-1">
                      We sent a confirmation link to <span className="font-semibold text-foreground">{email.trim()}</span>.
                      Click it and payment resumes automatically — your {effectiveTrialDays} free days are saved.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {checkoutError && (
                    <p className="text-center text-xs text-destructive">{checkoutError}</p>
                  )}
                  <Button
                    type="button"
                    onClick={startHostedCheckout}
                    disabled={!agreed || checkoutLoading}
                    className="w-full rounded-sm font-bold h-11"
                  >
                    {checkoutLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {checkoutLoading ? "Opening secure checkout…" : "Continue to checkout"}
                  </Button>
                  {!agreed && (
                    <p className="text-center text-xs font-medium text-muted-foreground">
                      Tick the box above to continue. Your card is entered on Stripe's secure page.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-3">
              {!awaitingEmailConfirm && (
                <div className="space-y-1">
                  <p className="text-center text-xs font-semibold text-foreground">
                    {trialRiskReversal(effectiveTrialDays)}
                  </p>
                  <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Secured by Stripe — after {effectiveTrialDays} days, ${plan.price}/mo is billed to the card on file.
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
