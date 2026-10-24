import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, ArrowLeft, Camera, Check, X, Loader2, AlertTriangle, RotateCcw, Settings as SettingsIcon } from "lucide-react";
import { toast } from "sonner";
import { getAffiliateCookie, clearAffiliateCookie, getReferralData, clearReferralData } from "@/lib/affiliateCookies";
import { trackEvent } from "@/lib/posthog";
import MilestoneProgressPill from "@/components/onboarding/MilestoneProgressPill";
import { useAutoRetryPreference } from "@/hooks/useAutoRetryPreference";
import {
  SETTINGS_NAV_COOLDOWN_MS,
  readSettingsNavLast,
  writeSettingsNavLast,
} from "@/lib/settingsNavCooldown";
import { showCooldownToast } from "@/lib/cooldownToast";

const CREATOR_TYPES = [
  "Fitness", "Finance", "Gaming", "Lifestyle", "Business", "Education",
  "Music", "Cooking", "Sports", "Beauty", "Travel", "Tech", "Real Estate", "IRL", "Other"
];

const FOLLOWER_RANGES = [
  "Under 1K", "1K–10K", "10K–50K", "50K–100K", "100K–500K", "500K+"
];

const PLATFORMS = [
  "YouTube", "Instagram", "TikTok", "Twitch", "Kick", "Podcast", "Newsletter", "LinkedIn", "Twitter/X", "Other"
];

const EARNING_RANGES = ["$0–$500", "$500–$2K", "$2K–$10K", "$10K–$50K", "$50K+"];

const CHALLENGES = [
  "Platform takes too much",
  "Can't reach monetization thresholds",
  "No good tools for communities",
  "Hard to sell courses",
  "No way to go live and get paid",
  "Audience too small",
  "Don't know where to start",
  "Other"
];

const USE_CASES = [
  "Go live and earn tips",
  "Build a paid community",
  "Sell a course",
  "Host paid events",
  "All of the above"
];

const HEAR_ABOUT = [
  "Referred by a friend", "Twitter/X", "Instagram", "TikTok", "YouTube",
  "Google Search", "Podcast", "Newsletter", "Other"
];

const CREATOR_STAGES = [
  {
    key: "just-starting",
    emoji: "🌱",
    title: "Just Starting Out",
    desc: "I'm new and figuring things out — no audience yet.",
  },
  {
    key: "early-traction",
    emoji: "🛠️",
    title: "Early Traction",
    desc: "I post regularly and have a small but growing audience.",
  },
  {
    key: "growing",
    emoji: "📈",
    title: "Growing",
    desc: "I make money from my work, but I want to scale.",
  },
  {
    key: "scaling",
    emoji: "🚀",
    title: "Scaling",
    desc: "I run a real creator business and want better tools.",
  },
];

const slideVariants = {
  enter: { opacity: 0, x: 40 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -40 },
};

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [showOptionalProfile, setShowOptionalProfile] = useState(false);
  const [showOptionalQualifying, setShowOptionalQualifying] = useState(false);

  // Step 1: Basics
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [socialHandle, setSocialHandle] = useState("");

  // Step 2: Creator Profile
  const [creatorType, setCreatorType] = useState("");
  const [creatorLayout, setCreatorLayout] = useState<string>("generic");
  const [followerCount, setFollowerCount] = useState("");
  const [primaryPlatform, setPrimaryPlatform] = useState("");
  const [isMonetizing, setIsMonetizing] = useState<string | null>(null);
  const [monthlyEarnings, setMonthlyEarnings] = useState("");

  // Step 3: Qualifying — hydrate from localStorage so refresh mid-step keeps inputs
  const STEP3_STORAGE_KEY = "onboarding:step3";
  const STEP3_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
  const initialStep3 = (() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(STEP3_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as {
        savedAt?: number;
        creatorStage?: string;
        oneSentence?: string;
        challenges?: string[];
        firstUseCase?: string;
        hearAbout?: string;
      };
      // Expire drafts older than 24h
      if (!parsed.savedAt || Date.now() - parsed.savedAt > STEP3_TTL_MS) {
        window.localStorage.removeItem(STEP3_STORAGE_KEY);
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  })();

  const [creatorStage, setCreatorStage] = useState<string>(initialStep3?.creatorStage ?? "");
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [oneSentence, setOneSentence] = useState<string>(initialStep3?.oneSentence ?? "");
  const [challenges, setChallenges] = useState<string[]>(initialStep3?.challenges ?? []);
  const [firstUseCase, setFirstUseCase] = useState<string>(initialStep3?.firstUseCase ?? "");
  const [hearAbout, setHearAbout] = useState<string>(initialStep3?.hearAbout ?? "");

  // Persist Step 3 inputs to survive refreshes (with timestamp for TTL)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        STEP3_STORAGE_KEY,
        JSON.stringify({
          savedAt: Date.now(),
          creatorStage,
          oneSentence,
          challenges,
          firstUseCase,
          hearAbout,
        })
      );
    } catch {
      // ignore quota / serialization errors
    }
  }, [creatorStage, oneSentence, challenges, firstUseCase, hearAbout]);

  // Photo & state
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitSucceeded, setSubmitSucceeded] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [autoRetryCountdown, setAutoRetryCountdown] = useState<number | null>(null);
  const [retryAt, setRetryAt] = useState<Date | null>(null);
  const AUTO_RETRY_SECONDS = 5;
  const [referralCode, setReferralCode] = useState("");
  const { enabled: autoRetryEnabled } = useAutoRetryPreference();

  // Auto-retry countdown: tick every second; at 0, fire finishOnboarding once.
  // We leave the value at 0 (not null) so the overlay can show "Retrying now…"
  // until finishOnboarding clears submitError or the failure overlay re-opens.
  useEffect(() => {
    if (autoRetryCountdown === null) return;
    if (autoRetryCountdown <= 0) {
      finishOnboarding();
      return;
    }
    const t = setTimeout(() => setAutoRetryCountdown((n) => (n === null ? null : n - 1)), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRetryCountdown]);

  const fileRef = useRef<HTMLInputElement>(null);

  // Referrer info from cookies
  const [referrerName, setReferrerName] = useState<string | null>(null);
  const [referrerAvatar, setReferrerAvatar] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const check = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("onboarding_complete, is_approved, referral_code")
        .eq("user_id", user.id)
        .single();
      const p = data as any;
      if (p?.onboarding_complete && p?.is_approved) {
        navigate("/discover", { replace: true });
      } else if (p?.onboarding_complete) {
        navigate("/waitlist", { replace: true });
      }
      if (p?.referral_code) setReferralCode(p.referral_code);
    };
    check();

    // Load referrer info from all storage methods
    const refData = getReferralData();
    const name = refData.name || sessionStorage.getItem("referrer_name");
    const avatar = localStorage.getItem("uply_referrer_avatar") || sessionStorage.getItem("referrer_avatar");
    if (name) setReferrerName(name);
    if (avatar) setReferrerAvatar(avatar);
  }, [user]);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Photo must be under 5MB"); return; }
    setAvatarFile(file);
    setAvatarUrl(URL.createObjectURL(file));
  };

  const uploadPhoto = async (): Promise<string | null> => {
    if (!avatarFile || !user) return null;
    const ext = avatarFile.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, avatarFile, { upsert: true });
    if (error) return null;
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    return urlData.publicUrl;
  };

  const finishOnboarding = async () => {
    if (!user) return;
    if (saving || submitSucceeded) return; // Prevent double-submit
    setSubmitError(null);
    setAutoRetryCountdown(null);
    setRetryAt(null);
    setSaving(true);

    try {
    let uploadedUrl = avatarUrl;
    if (avatarFile) uploadedUrl = await uploadPhoto();

    // STEP 3: Read referral data at submit time using bulletproof reader
    const { code: refCode, username: referrerUsernameFromStorage, name: referrerNameFromStorage } = getReferralData();
    

    // Handle invite codes
    const inviteCode = getAffiliateCookie("uply_invite_code");
    let isApproved = false;
    if (inviteCode) {
      // Use secure RPC to validate — never exposes full table
      const { data: inviteResult } = await supabase.rpc("validate_invite_code", { p_code: inviteCode }) as any;
      const invite = inviteResult && inviteResult.id && !inviteResult.is_used ? inviteResult : null;
      if (invite) {
        await supabase
          .from("invite_codes")
          .update({ is_used: true, used_by: user.id, used_at: new Date().toISOString() })
          .eq("id", invite.id);
        isApproved = true;
        if (invite.owner_id !== user.id) {
          await supabase.from("referrals").insert({
            referrer_id: invite.owner_id,
            referred_id: user.id,
          });
        }
      }
      clearAffiliateCookie("uply_invite_code");
    }

    // Handle referral codes (non-invite)
    if (refCode && !inviteCode) {
      const { data: referrer } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("referral_code", refCode)
        .maybeSingle();
      if (referrer && (referrer as any).user_id !== user.id) {
        await supabase.from("referrals").insert({
          referrer_id: (referrer as any).user_id,
          referred_id: user.id,
        });
      }
    }

    // Update profile
    await supabase
      .from("profiles")
      .update({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        display_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
        role_type: "creator",
        avatar_url: uploadedUrl,
        onboarding_complete: true,
        is_approved: isApproved,
        creator_type: creatorType || "Content Creator",
        creator_layout: creatorLayout || "generic",
      })
      .eq("user_id", user.id);

    trackEvent("onboarding_completed", {
      creator_type: creatorType || "Content Creator",
      is_approved: isApproved,
      has_social: !!socialHandle,
    });

    // Clear the persisted Step 3 draft now that onboarding is submitted
    try {
      window.localStorage.removeItem(STEP3_STORAGE_KEY);
      window.localStorage.removeItem("onboarding:step4");
    } catch {
      // ignore
    }

    // Get updated referral code
    const { data: updatedProfile } = await supabase
      .from("profiles")
      .select("referral_code, username")
      .eq("user_id", user.id)
      .single();
    const updatedRefCode = (updatedProfile as any)?.referral_code || "";
    const updatedUsername = (updatedProfile as any)?.username;

    // Insert into waitlist table — use data from getReferralData() called above
    const referrerUsername = referrerUsernameFromStorage || getAffiliateCookie("uply_referrer_username");
    const referrerDisplayName = referrerNameFromStorage || getAffiliateCookie("uply_referrer_name");
    const referrerAvatarUrl = localStorage.getItem("uply_referrer_avatar");

    

    const { data: waitlistRow } = await supabase
      .from("waitlist")
      .insert({
        full_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
        email: user.email || "",
        social_handle: socialHandle || null,
        creator_type: creatorType || null,
        follower_count: followerCount || null,
        primary_platform: primaryPlatform || null,
        one_sentence: oneSentence || null,
        referred_by: refCode || null,
        referral_code: updatedRefCode,
        is_monetizing: isMonetizing || null,
        monthly_earnings: isMonetizing === "yes" ? monthlyEarnings : null,
        monetization_challenges: challenges.length > 0 ? challenges : null,
        first_use_case: firstUseCase || null,
        hear_about: hearAbout || null,
        user_id: user.id,
        referrer_display_name: referrerDisplayName || null,
        referrer_avatar_url: referrerAvatarUrl || null,
        referrer_username: referrerUsername || null,
      })
      .select("position, id")
      .single() as any;

    // Send referrer notification if referred
    if (refCode) {
      const { data: referrerProfile } = await supabase
        .from("profiles")
        .select("user_id, display_name, username")
        .eq("referral_code", refCode)
        .maybeSingle();

      if (referrerProfile && (referrerProfile as any).user_id !== user.id) {
        const referrerId = (referrerProfile as any).user_id;
        const referrerDisplayName = (referrerProfile as any).display_name || "Creator";
        // Get updated referral count & position
        const { data: referrerWaitlist } = await supabase
          .from("waitlist")
          .select("referral_count, position")
          .eq("referral_code", refCode)
          .maybeSingle() as any;
        const newCount = referrerWaitlist?.referral_count || 0;
        const referrerPosition = referrerWaitlist?.position || 0;
        const remaining = Math.max(0, 25 - newCount);

        // In-platform notification
        await supabase.from("notifications").insert({
          user_id: referrerId,
          type: "referral_signup",
          title: `🎉 ${firstName.trim()} used your invite link!`,
          message: `Your referral count is now ${newCount}. ${remaining > 0 ? `${remaining} more to reach Founding Creator status.` : "You've reached Founding Creator! 👑"}`,
          actor_id: user.id,
        });

        // Email notification to referrer (fire and forget)
        const { data: referrerAuth } = await supabase.rpc("lookup_referrer_by_code", { ref_code: refCode });
        const referrerEmail = await supabase.from("waitlist").select("email").eq("referral_code", refCode).maybeSingle() as any;
        const rEmail = referrerEmail?.data?.email;
        if (rEmail) {
          const { buildReferralUrl: buildUrl } = await import("@/lib/referralUrls");
          supabase.functions.invoke("send-referral-email", {
            body: {
              type: "referrer_notification",
              referrerEmail: rEmail,
              referrerName: referrerDisplayName,
              applicantName: `${firstName.trim()} ${lastName.trim()}`.trim(),
              newCount,
              position: referrerPosition,
              referralLink: buildUrl(refCode, (referrerProfile as any).username),
            },
          }).catch(() => {});
        }
      }
    }

    // Send welcome email to the new applicant (fire and forget)
    const applicantFullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    const { count: totalCount } = await supabase.from("waitlist").select("*", { count: "exact", head: true }) as any;
    const applicantPosition = waitlistRow?.position || 0;
    const { buildReferralUrl: buildRefUrl } = await import("@/lib/referralUrls");
    supabase.functions.invoke("send-referral-email", {
      body: {
        type: "welcome_applicant",
        applicantEmail: user.email,
        applicantName: applicantFullName,
        position: applicantPosition,
        referralLink: buildRefUrl(updatedRefCode, updatedUsername),
        total: totalCount || applicantPosition,
      },
    }).catch(() => {});

    // Clear all referral data from all storage methods
    clearReferralData();

    // Store position for post-application screen
    const position = waitlistRow?.position || 0;
    sessionStorage.setItem("waitlist_position", String(position));
    sessionStorage.setItem("waitlist_referral_code", updatedRefCode);
    sessionStorage.setItem("waitlist_username", updatedUsername || "");
    sessionStorage.setItem("waitlist_display_name", `${firstName.trim()} ${lastName.trim()}`.trim());
    sessionStorage.setItem("waitlist_email", user.email || "");

    setSaving(false);
    setSubmitSucceeded(true);

    // Brief success screen, then navigate
    setTimeout(() => {
      if (isApproved) {
        navigate("/discover", { replace: true });
      } else {
        navigate("/waitlist?applied=true", { replace: true });
      }
    }, 1200);
    } catch (err: any) {
      console.error("[Onboarding] submission failed", err);
      setSaving(false);
      setSubmitError(
        err?.message?.toString().slice(0, 200) ||
          "Something went wrong while submitting your application."
      );
      // Kick off the auto-retry countdown only if the user has enabled it
      if (autoRetryEnabled) {
        const at = new Date(Date.now() + AUTO_RETRY_SECONDS * 1000);
        setRetryAt(at);
        setAutoRetryCountdown(AUTO_RETRY_SECONDS);
        toast.error("Submission failed", {
          description: `Auto-retry is on — we'll try again at ${at.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}. You can cancel anytime.`,
        });
      } else {
        setRetryAt(null);
        toast.error("Submission failed", {
          description: "Auto-retry is off. Tap Retry to try again, or enable auto-retry in Settings.",
        });
      }
    }
  };

  const totalSteps = 3;
  const progressStep = step;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-8 relative overflow-y-auto overflow-x-hidden">
      {step > 0 && step < 5 && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-secondary">
          <motion.div className="h-full bg-primary" animate={{ width: `${(progressStep / totalSteps) * 100}%` }} transition={{ duration: 0.4 }} />
        </div>
      )}

      {/* Referrer banner */}
      {step > 0 && step < 5 && referrerName && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full text-xs"
          style={{ background: "hsl(var(--primary) / 0.1)", border: "1px solid hsl(var(--primary) / 0.3)" }}
        >
          {referrerAvatar ? (
            <img src={referrerAvatar} alt={referrerName || ""} className="w-5 h-5 rounded-full object-cover" loading="lazy" />
          ) : (
            <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] font-bold">
              {referrerName[0]}
            </div>
          )}
          <span className="text-foreground font-medium">{referrerName} invited you</span>
        </motion.div>
      )}

      {step > 0 && <MilestoneProgressPill onboardingStep={step} totalOnboardingSteps={3} />}

      {/* Full-screen submission overlay — blocks interaction & shows progress / success / failure */}
      {(saving || submitSucceeded || submitError) && (
        <div
          className="fixed inset-0 z-[100] bg-background/90 backdrop-blur-sm flex flex-col items-center justify-center p-6"
          role={submitError ? "alertdialog" : "status"}
          aria-live="assertive"
          aria-busy={saving}
        >
          {submitError ? (
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 220, damping: 18 }}
              className="flex flex-col items-center max-w-sm text-center"
            >
              <div className="w-16 h-16 rounded-full bg-destructive/15 ring-4 ring-destructive/30 flex items-center justify-center mb-4">
                <AlertTriangle className="w-9 h-9 text-destructive" aria-hidden="true" />
              </div>
              <p className="text-lg font-semibold text-foreground">Submission failed</p>
              <p className="text-sm text-muted-foreground mt-1">{submitError}</p>

              {/* Inline auto-retry status */}
              <div className="mt-3 w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs" aria-live="polite">
                {autoRetryEnabled ? (
                  autoRetryCountdown === null ? (
                    <span className="text-muted-foreground">Auto-retry is <span className="font-semibold text-foreground">on</span>.</span>
                  ) : autoRetryCountdown > 0 ? (
                    <span className="text-muted-foreground">
                      Auto-retry is <span className="font-semibold text-foreground">on</span> — retrying in{" "}
                      <span className="font-semibold text-foreground">{autoRetryCountdown}s</span>
                      {retryAt && (
                        <> at <span className="font-semibold text-foreground">{retryAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span></>
                      )}
                      .
                    </span>
                  ) : (
                    <span className="font-semibold text-primary flex items-center justify-center gap-1.5" aria-live="assertive">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Retrying now…
                    </span>
                  )
                ) : (
                  <span className="text-muted-foreground">
                    Auto-retry is <span className="font-semibold text-foreground">off</span>. Tap Retry now, or enable it in Settings.
                  </span>
                )}
              </div>

              <div className="flex gap-2 mt-5 w-full">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setAutoRetryCountdown(null);
                    setRetryAt(null);
                    setSubmitError(null);
                  }}
                >
                  {autoRetryCountdown !== null ? "Cancel" : "Dismiss"}
                </Button>
                <Button
                  variant="hero"
                  className="flex-1 gap-1"
                  onClick={() => {
                    setAutoRetryCountdown(null);
                    setSubmitError(null);
                    finishOnboarding();
                  }}
                >
                  <RotateCcw className="w-4 h-4" /> Retry now
                </Button>
              </div>
              <button
                type="button"
                onClick={() => {
                  const baseDestination = "/settings?tab=account&highlight=auto-retry";

                  // Show a cooldown toast that re-renders every 200ms with a
                  // counting-down "Try again (Xs)" label + progress bar until cooldown elapses.
                  const showErrorWithCountdown = (description: string) => {
                    showCooldownToast({
                      title: "Couldn't open Settings",
                      description,
                      variant: "error",
                      id: `settings-nav-error-${Date.now()}`,
                      onAction: () => attemptNavigate(true),
                    });
                  };

                  const attemptNavigate = (isRetry = false) => {
                    const now = Date.now();
                    const sinceLast = now - readSettingsNavLast();
                    if (sinceLast < SETTINGS_NAV_COOLDOWN_MS) {
                      const wait = Math.ceil((SETTINGS_NAV_COOLDOWN_MS - sinceLast) / 1000);
                      toast.warning("Slow down", {
                        description: `Please wait ${wait}s before trying again.`,
                      });
                      return;
                    }
                    writeSettingsNavLast(now);
                    const destination = isRetry ? `${baseDestination}&from=retry` : baseDestination;
                    try {
                      toast.info("Opening Settings → Account", {
                        description: `Navigating to ${destination}`,
                      });
                      navigate(destination);
                      setTimeout(() => {
                        if (!window.location.pathname.startsWith("/settings")) {
                          showErrorWithCountdown(`Navigation to ${destination} didn't complete.`);
                        }
                      }, 600);
                    } catch (err) {
                      console.error("[Onboarding] settings navigation failed", err);
                      showErrorWithCountdown(`Navigation to ${destination} failed.`);
                    }
                  };
                  attemptNavigate(false);
                }}
                className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline transition-colors"
              >
                <SettingsIcon className="w-3.5 h-3.5" />
                {autoRetryEnabled ? "Manage auto-retry in Settings" : "Enable auto-retry in Settings"}
              </button>
            </motion.div>
          ) : submitSucceeded ? (
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 220, damping: 18 }}
              className="flex flex-col items-center"
            >
              <div className="w-16 h-16 rounded-full bg-primary/15 ring-4 ring-primary/30 flex items-center justify-center mb-4">
                <Check className="w-9 h-9 text-primary" aria-hidden="true" />
              </div>
              <p className="text-lg font-semibold text-foreground">Application submitted!</p>
              <p className="text-sm text-muted-foreground mt-1">Redirecting…</p>
            </motion.div>
          ) : (
            <>
              <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" aria-hidden="true" />
              <p className="text-lg font-semibold text-foreground">Submitting your application…</p>
              <p className="text-sm text-muted-foreground mt-1">Hang tight, this only takes a moment.</p>
            </>
          )}
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* STEP 1: The Basics */}
        {step === 1 && (
          <motion.div key="basics" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.35 }} className="w-full max-w-md">
            <p className="text-xs text-muted-foreground text-center mb-1 uppercase tracking-wider">Step 1 of 3</p>
            <h1 className="text-2xl md:text-3xl font-bold text-center mb-2">Your name</h1>
            <p className="text-muted-foreground text-center text-sm mb-6">Then two short questions. Approval still happens after you submit.</p>
            <div className="space-y-4 mb-4">
              <Input placeholder="Full name *" value={firstName} onChange={(e) => setFirstName(e.target.value)} autoFocus className="text-center text-lg py-6" />
              <Input placeholder="Email" value={user?.email || ""} disabled className="text-center text-sm py-4 opacity-60" />
              <Input placeholder="@yourhandle or youtube.com/c/yourchannel" value={socialHandle} onChange={(e) => setSocialHandle(e.target.value)} className="text-center text-sm py-4" />
            </div>

            {/* Photo upload */}
            <div className="flex flex-col items-center gap-3 mb-6">
              <button type="button" aria-label="Add a profile photo" onClick={() => fileRef.current?.click()} className="w-20 h-20 rounded-full border-2 border-dashed border-border hover:border-primary transition-colors flex items-center justify-center overflow-hidden bg-card">
                {avatarUrl ? <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" loading="lazy" /> : <Camera className="w-6 h-6 text-muted-foreground" />}
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
              <p className="text-xs text-muted-foreground">Add a profile photo (optional)</p>
              {avatarUrl && (
                <button onClick={() => { setAvatarUrl(null); setAvatarFile(null); }} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                  <X className="w-3 h-3" /> Remove
                </button>
              )}
            </div>

            <Button variant="hero" size="xl" className="w-full" disabled={!firstName.trim()} onClick={() => setStep(2)}>
              Continue <ArrowRight className="ml-1 w-4 h-4" />
            </Button>
            <p className="text-[10px] text-muted-foreground text-center mt-3">🔒 Your info is private and never shared</p>
          </motion.div>
        )}

        {/* STEP 2: Creator Profile */}
        {step === 2 && (
          <motion.div key="profile" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.35 }} className="w-full max-w-md">
            <p className="text-xs text-muted-foreground text-center mb-1 uppercase tracking-wider">Step 2 of 3</p>
            <h1 className="text-2xl md:text-3xl font-bold text-center mb-2">What you make</h1>
            <p className="text-muted-foreground text-center text-sm mb-6">Category is enough. Audience size can wait.</p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">What type of creator are you?</label>
                <Select value={creatorType} onValueChange={setCreatorType}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {CREATOR_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {showOptionalProfile && (<>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">How will your profile look? <span className="text-muted-foreground font-normal">Optional</span></label>
                <p className="text-xs text-muted-foreground mb-2">You can change this later. Skip it and we use a general layout.</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "musician", emoji: "🎵", label: "Musician" },
                    { value: "dj_producer", emoji: "🎧", label: "DJ / Producer" },
                    { value: "podcaster", emoji: "🎙️", label: "Podcaster" },
                    { value: "filmmaker", emoji: "🎬", label: "Filmmaker" },
                    { value: "visual_artist", emoji: "🎨", label: "Visual Artist" },
                    { value: "content_creator", emoji: "📹", label: "Content Creator" },
                    { value: "generic", emoji: "✨", label: "Something else" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setCreatorLayout(opt.value)}
                      className={`min-h-[44px] rounded-xl p-3 text-left border-2 transition-all flex items-center gap-2 ${
                        creatorLayout === opt.value
                          ? "border-primary bg-primary/5"
                          : "border-border bg-card hover:border-primary/30"
                      }`}
                    >
                      <span className="text-xl">{opt.emoji}</span>
                      <span className="text-xs font-medium text-foreground">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Total followers across all platforms? <span className="text-muted-foreground font-normal">Optional</span></label>
                <Select value={followerCount} onValueChange={setFollowerCount}>
                  <SelectTrigger><SelectValue placeholder="Select range" /></SelectTrigger>
                  <SelectContent>
                    {FOLLOWER_RANGES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Where is your primary audience?</label>
                <Select value={primaryPlatform} onValueChange={setPrimaryPlatform}>
                  <SelectTrigger><SelectValue placeholder="Select platform" /></SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Are you currently monetizing your content?</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "yes", emoji: "✅", label: "Yes — I'm earning" },
                    { value: "no", emoji: "🚀", label: "No — but ready" },
                    { value: "starting", emoji: "🌱", label: "Just starting" },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => { setIsMonetizing(opt.value); if (opt.value !== "yes") setMonthlyEarnings(""); }}
                      className={`rounded-xl p-3 text-center border-2 transition-all ${
                        isMonetizing === opt.value ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/30"
                      }`}
                    >
                      <span className="text-xl block mb-1">{opt.emoji}</span>
                      <span className="text-xs font-medium text-foreground">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {isMonetizing === "yes" && (
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Monthly content earnings?</label>
                  <Select value={monthlyEarnings} onValueChange={setMonthlyEarnings}>
                    <SelectTrigger><SelectValue placeholder="Select range" /></SelectTrigger>
                    <SelectContent>
                      {EARNING_RANGES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              </>)}
            </div>

            {!showOptionalProfile && (
              <button
                type="button"
                onClick={() => setShowOptionalProfile(true)}
                className="mb-4 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
              >
                Add layout, audience size, and earnings (optional)
              </button>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(1)} className="gap-1">
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
              <Button variant="hero" size="xl" className="flex-1" disabled={!creatorType} onClick={() => setStep(3)}>
                Continue <ArrowRight className="ml-1 w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* STEP 3: Qualifying Questions */}
        {step === 3 && (
          <motion.div key="qualifying" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.35 }} className="w-full max-w-md">
            <p className="text-xs text-muted-foreground text-center mb-1 uppercase tracking-wider">Step 3 of 3</p>
            <h1 className="text-2xl md:text-3xl font-bold text-center mb-2">One last thing</h1>
            <p className="text-muted-foreground text-center text-sm mb-6">Stage and one sentence. Submit sends your application. Selling stays locked until you’re approved.</p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Where are you right now? *
                </label>
                <div className="space-y-2 max-h-[55vh] sm:max-h-none overflow-y-auto pr-1 -mr-1">
                  {CREATOR_STAGES.map((s) => {
                    const selected = creatorStage === s.key;
                    const showError = attemptedSubmit && !creatorStage;
                    return (
                      <button
                        key={s.key}
                        type="button"
                        onClick={() => { setCreatorStage(s.key); setAttemptedSubmit(false); }}
                        aria-pressed={selected}
                        className={`w-full text-left flex items-start gap-2.5 sm:gap-3 rounded-xl border p-3 sm:p-4 transition-all ${
                          selected
                            ? "border-primary bg-primary/10 ring-1 ring-primary/40"
                            : showError
                              ? "border-destructive/60 bg-card hover:border-destructive"
                              : "border-border bg-card hover:border-primary/40 hover:bg-card/80"
                        }`}
                      >
                        <div className="text-xl sm:text-2xl shrink-0 leading-none mt-0.5">{s.emoji}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground leading-snug break-words">{s.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-snug break-words">{s.desc}</p>
                        </div>
                        {selected && (
                          <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        )}
                      </button>
                    );
                  })}
                </div>
                {attemptedSubmit && !creatorStage && (
                  <p className="text-xs text-destructive mt-2" role="alert" aria-live="polite">
                    Please select where you are right now to continue.
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">In one sentence, what do you create? *</label>
                <Textarea
                  value={oneSentence}
                  onChange={(e) => setOneSentence(e.target.value.slice(0, 120))}
                  placeholder='e.g. "I teach first-generation investors how to build wealth from zero."'
                  rows={2}
                  className="text-sm resize-none"
                  maxLength={120}
                />
                <p className="text-xs text-muted-foreground text-right mt-1">{oneSentence.length}/120</p>
              </div>

              {showOptionalQualifying && (<>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Biggest monetization challenges? <span className="text-muted-foreground font-normal">Optional</span></label>
                <div className="flex flex-wrap gap-2">
                  {CHALLENGES.map(c => {
                    const selected = challenges.includes(c);
                    return (
                      <button
                        key={c}
                        onClick={() => setChallenges(prev => selected ? prev.filter(x => x !== c) : [...prev, c])}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                          selected ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border hover:border-primary/50"
                        }`}
                      >
                        {selected && <Check className="w-3 h-3 inline mr-1" />}
                        {c}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">What would you use UPLY for first? <span className="text-muted-foreground font-normal">Optional</span></label>
                <div className="flex flex-wrap gap-2">
                  {USE_CASES.map(uc => (
                    <button
                      key={uc}
                      onClick={() => setFirstUseCase(uc)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        firstUseCase === uc ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border hover:border-primary/50"
                      }`}
                    >
                      {firstUseCase === uc && <Check className="w-3 h-3 inline mr-1" />}
                      {uc}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">How did you hear about UPLY? <span className="text-muted-foreground font-normal">Optional</span></label>
                <Select value={hearAbout} onValueChange={setHearAbout}>
                  <SelectTrigger><SelectValue placeholder="Select one" /></SelectTrigger>
                  <SelectContent>
                    {HEAR_ABOUT.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              </>)}
            </div>

            {!showOptionalQualifying && (
              <button
                type="button"
                onClick={() => setShowOptionalQualifying(true)}
                className="mb-4 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
              >
                Add challenges and how you heard (optional)
              </button>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(2)} className="gap-1">
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
              <Button
                variant="hero"
                size="xl"
                className="flex-1"
                disabled={!oneSentence.trim() || saving}
                onClick={() => {
                  if (!creatorStage) {
                    setAttemptedSubmit(true);
                    return;
                  }
                  finishOnboarding();
                }}
              >
                {saving ? "Submitting..." : "Submit application"} <ArrowRight className="ml-1 w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
