import { useState } from "react";
import { Gift, Loader2, Star } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const CANCEL_REASONS = [
  "Too expensive",
  "Not using it enough",
  "Missing a feature",
  "Moving to another platform",
  "Just taking a break",
  "Other",
] as const;

type Step = "offer" | "survey" | "done";

interface CancelSubscriptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Display name of the current plan (e.g. "Unlimited"). */
  planName?: string;
  /** Called after the subscription actually changed (offer accepted or cancel scheduled). */
  onChanged?: () => void;
}

/**
 * Platform-subscription cancellation retention flow.
 * Step A: one-time "30 days free" save offer.
 * Step B: exit survey (reason / would-return / 1–5 stars), then cancel at period end.
 * Intercepts BEFORE any Stripe-portal redirect; square corners per UPLY tokens.
 */
export default function CancelSubscriptionModal({
  open,
  onOpenChange,
  planName,
  onChanged,
}: CancelSubscriptionModalProps) {
  const [step, setStep] = useState<Step>("offer");
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState<string>("");
  const [otherDetail, setOtherDetail] = useState("");
  const [wouldReturn, setWouldReturn] = useState<string>("");
  const [rating, setRating] = useState<number>(0);
  const [endsAt, setEndsAt] = useState<string | null>(null);

  const resetAndClose = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      // Reset after the close animation so the flow restarts cleanly next time.
      setTimeout(() => {
        setStep("offer");
        setLoading(false);
        setReason("");
        setOtherDetail("");
        setWouldReturn("");
        setRating(0);
        setEndsAt(null);
      }, 200);
    }
  };

  const handleAcceptOffer = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("cancel-platform-subscription", {
        body: { action: "accept_offer" },
      });
      if (error) throw error;
      if (data?.error === "offer_already_used") {
        // Offer was already redeemed once — go straight to the exit survey.
        setStep("survey");
        return;
      }
      if (data?.error) throw new Error(data.error);
      toast.success("30 free days added — glad you're staying");
      onChanged?.();
      resetAndClose(false);
    } catch (err: any) {
      toast.error("Couldn't apply the offer", { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (rating < 1) return;
    setLoading(true);
    try {
      const fullReason =
        reason === "Other" && otherDetail.trim()
          ? `Other: ${otherDetail.trim()}`
          : reason || null;
      const { data, error } = await supabase.functions.invoke("cancel-platform-subscription", {
        body: {
          action: "cancel",
          reason: fullReason,
          would_return: wouldReturn || null,
          rating,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setEndsAt(data?.ends_at ?? null);
      setStep("done");
      onChanged?.();
    } catch (err: any) {
      toast.error("Couldn't cancel", { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="max-w-md rounded-none sm:rounded-none">
        {step === "offer" && (
          <>
            <DialogHeader>
              <DialogTitle>Before you go — 30 days on us</DialogTitle>
              <DialogDescription>
                {planName ? `You're on the ${planName} plan. ` : ""}
                We'd rather earn you back than say goodbye.
              </DialogDescription>
            </DialogHeader>

            {/* Gold offer card */}
            <div className="rounded-none border border-amber-400/70 bg-amber-50 dark:bg-amber-500/10 p-4 flex items-start gap-3">
              <div className="w-9 h-9 rounded-none bg-amber-400/20 flex items-center justify-center flex-shrink-0">
                <Gift className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">
                  Enjoy the next 30 days FREE before canceling
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Keep everything — your community, content, and payouts — free for 30 days.
                  You won't be charged during that time, and you can still cancel anytime.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button onClick={handleAcceptOffer} disabled={loading} className="w-full rounded-none font-bold">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gift className="w-4 h-4" />}
                Claim 30 free days
              </Button>
              <Button
                variant="ghost"
                onClick={() => setStep("survey")}
                disabled={loading}
                className="w-full rounded-none text-muted-foreground"
              >
                Continue to cancel
              </Button>
            </div>
          </>
        )}

        {step === "survey" && (
          <>
            <DialogHeader>
              <DialogTitle>Sorry to see you go</DialogTitle>
              <DialogDescription>
                A few quick questions so we can make UPLY better.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Why are you canceling?</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger className="rounded-none">
                    <SelectValue placeholder="Select a reason" />
                  </SelectTrigger>
                  <SelectContent className="rounded-none">
                    {CANCEL_REASONS.map((r) => (
                      <SelectItem key={r} value={r} className="rounded-none">
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {reason === "Other" && (
                  <Textarea
                    value={otherDetail}
                    onChange={(e) => setOtherDetail(e.target.value)}
                    placeholder="Tell us more (optional)"
                    maxLength={1000}
                    className="rounded-none mt-1.5"
                  />
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Would you consider coming back?</Label>
                <RadioGroup value={wouldReturn} onValueChange={setWouldReturn} className="flex gap-4 pt-1">
                  {["Yes", "Maybe", "No"].map((opt) => (
                    <div key={opt} className="flex items-center gap-1.5">
                      <RadioGroupItem value={opt} id={`would-return-${opt}`} />
                      <Label htmlFor={`would-return-${opt}`} className="text-sm font-normal cursor-pointer">
                        {opt}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">How would you rate UPLY?</Label>
                <div className="flex gap-1 pt-1" role="radiogroup" aria-label="Rate UPLY from 1 to 5 stars">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setRating(n)}
                      aria-label={`${n} star${n > 1 ? "s" : ""}`}
                      aria-pressed={rating === n}
                      className="p-1 hover:scale-110 transition-transform"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          n <= rating
                            ? "text-amber-500 fill-amber-500"
                            : "text-muted-foreground/40"
                        }`}
                      />
                    </button>
                  ))}
                </div>
                {rating < 1 && (
                  <p className="text-[11px] text-muted-foreground">Rating is required.</p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <Button
                variant="destructive"
                onClick={handleCancel}
                disabled={loading || rating < 1}
                className="w-full rounded-none font-bold"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Cancel my subscription
              </Button>
              <Button
                variant="ghost"
                onClick={() => resetAndClose(false)}
                disabled={loading}
                className="w-full rounded-none text-muted-foreground"
              >
                Never mind, keep my plan
              </Button>
            </div>
          </>
        )}

        {step === "done" && (
          <>
            <DialogHeader>
              <DialogTitle>Your cancellation is scheduled</DialogTitle>
              <DialogDescription>
                Your plan stays active until{" "}
                <span className="font-semibold text-foreground">
                  {endsAt ? new Date(endsAt).toLocaleDateString() : "the end of your billing period"}
                </span>
                ; your account and content remain.
              </DialogDescription>
            </DialogHeader>
            <p className="text-xs text-muted-foreground">
              Changed your mind? You can resubscribe anytime from the pricing page — everything
              will be exactly where you left it.
            </p>
            <Button onClick={() => resetAndClose(false)} variant="secondary" className="w-full rounded-none font-bold">
              Done
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
