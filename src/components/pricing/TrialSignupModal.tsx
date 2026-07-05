import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
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
import {
  PLATFORM_PLANS,
  TRIAL_DAYS,
  TRIAL_INTENT_STORAGE_KEY,
  type PlatformPlanKey,
} from "./plans";

interface TrialSignupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Plan preselected by the card the user clicked. */
  defaultPlan: PlatformPlanKey;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function TrialSignupModal({ open, onOpenChange, defaultPlan }: TrialSignupModalProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2>(1);
  const [company, setCompany] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<PlatformPlanKey>(defaultPlan);
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState<{ company?: string; fullName?: string; email?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  // Sync preselected plan + prefill from auth user each time the modal opens.
  useEffect(() => {
    if (!open) return;
    setStep(1);
    setSelectedPlan(defaultPlan);
    setErrors({});
    if (user) {
      setEmail((prev) => prev || user.email || "");
      setFullName(
        (prev) => prev || (user.user_metadata?.full_name as string | undefined) || ""
      );
    }
  }, [open, defaultPlan, user]);

  const plan = PLATFORM_PLANS.find((p) => p.key === selectedPlan) ?? PLATFORM_PLANS[0];

  const validateStep1 = () => {
    const next: typeof errors = {};
    if (!company.trim()) next.company = "Company or brand name is required";
    if (!fullName.trim()) next.fullName = "Full name is required";
    if (!email.trim()) next.email = "Email is required";
    else if (!EMAIL_RE.test(email.trim())) next.email = "Enter a valid email address";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleContinue = () => {
    if (validateStep1()) setStep(2);
  };

  const handleStartTrial = async () => {
    if (!agreed || submitting) return;

    const intent = {
      plan: selectedPlan,
      company: company.trim(),
      full_name: fullName.trim(),
      email: email.trim(),
      phone: phone.trim(),
    };

    if (!user) {
      // Not logged in — stash the intent and send them through signup.
      try {
        localStorage.setItem(TRIAL_INTENT_STORAGE_KEY, JSON.stringify(intent));
      } catch {
        // localStorage unavailable (private mode) — signup still works.
      }
      trackEvent("platform_trial_signup_redirect", { plan: selectedPlan, price: plan.price });
      onOpenChange(false);
      navigate(`/auth?mode=signup&plan=${selectedPlan}`);
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-platform-checkout", {
        body: {
          plan: selectedPlan,
          trial: true,
          company: intent.company,
          full_name: intent.full_name,
          phone: intent.phone,
        },
      });
      if (error) throw error;
      if (!data?.url) throw new Error("No checkout URL returned");
      trackEvent("platform_trial_started", { plan: selectedPlan, price: plan.price });
      window.location.href = data.url;
      // Navigating away — leave the spinner on.
    } catch (err: any) {
      toast.error(err?.message || "Failed to start your trial. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-md sm:max-w-md">
        {step === 1 ? (
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

            <Button onClick={handleContinue} className="w-full rounded-sm font-bold">
              Continue to step 2
            </Button>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Trial details</DialogTitle>
              <DialogDescription>
                Step 2 of 2 — pick your plan and start your {TRIAL_DAYS}-day free trial.
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
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleStartTrial}
                disabled={!agreed || submitting}
                className="w-full rounded-sm font-bold"
              >
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Start your {TRIAL_DAYS}-day free trial
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                After {TRIAL_DAYS} days you'll be billed to the card on file. Cancel anytime.
              </p>
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
