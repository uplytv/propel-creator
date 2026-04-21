import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, ArrowLeft, Camera, Check, X } from "lucide-react";
import { toast } from "sonner";
import { getAffiliateCookie, clearAffiliateCookie, getReferralData, clearReferralData } from "@/lib/affiliateCookies";
import logoImg from "@/assets/logo.png";
import MilestoneProgressPill from "@/components/onboarding/MilestoneProgressPill";

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
    key: "exploring",
    emoji: "🌱",
    title: "Just exploring",
    desc: "I'm new and figuring things out — no audience yet.",
  },
  {
    key: "building",
    emoji: "🛠️",
    title: "Building momentum",
    desc: "I post regularly and have a small but growing audience.",
  },
  {
    key: "earning",
    emoji: "💸",
    title: "Earning consistently",
    desc: "I make money from my work, but I want to scale.",
  },
  {
    key: "scaling",
    emoji: "🚀",
    title: "Scaling a business",
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
  const [step, setStep] = useState(0);

  // Step 1: Basics
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [socialHandle, setSocialHandle] = useState("");

  // Step 2: Creator Profile
  const [creatorType, setCreatorType] = useState("");
  const [followerCount, setFollowerCount] = useState("");
  const [primaryPlatform, setPrimaryPlatform] = useState("");
  const [isMonetizing, setIsMonetizing] = useState<string | null>(null);
  const [monthlyEarnings, setMonthlyEarnings] = useState("");

  // Step 3: Qualifying
  const [creatorStage, setCreatorStage] = useState<string>("");
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [oneSentence, setOneSentence] = useState("");
  const [challenges, setChallenges] = useState<string[]>([]);
  const [firstUseCase, setFirstUseCase] = useState("");
  const [hearAbout, setHearAbout] = useState("");

  // Photo & state
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [referralCode, setReferralCode] = useState("");
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

  useEffect(() => {
    if (step === 0) {
      const t = setTimeout(() => setStep(1), 1500);
      return () => clearTimeout(t);
    }
  }, [step]);

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
    setSaving(true);

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
      })
      .eq("user_id", user.id);

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

    if (isApproved) {
      navigate("/discover", { replace: true });
    } else {
      navigate("/waitlist?applied=true", { replace: true });
    }
  };

  const totalSteps = 4; // splash, basics, profile, qualifying
  const progressStep = step > 0 ? step : 0;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
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
            <img src={referrerAvatar} alt="" className="w-5 h-5 rounded-full object-cover" />
          ) : (
            <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] font-bold">
              {referrerName[0]}
            </div>
          )}
          <span className="text-foreground font-medium">{referrerName} invited you</span>
        </motion.div>
      )}

      {step > 0 && <MilestoneProgressPill onboardingStep={step} totalOnboardingSteps={3} />}

      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div
            key="splash"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center gap-3"
          >
            <img src={logoImg} alt="UPLY" className="w-24 h-24 object-contain" />
          </motion.div>
        )}

        {/* STEP 1: The Basics */}
        {step === 1 && (
          <motion.div key="basics" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.35 }} className="w-full max-w-md">
            <p className="text-xs text-muted-foreground text-center mb-1 uppercase tracking-wider">Step 1 of 3</p>
            <h1 className="text-2xl md:text-3xl font-bold text-center mb-2">The Basics</h1>
            <p className="text-muted-foreground text-center text-sm mb-2">Tell us a little about yourself.</p>
            <p className="text-xs text-primary text-center mb-6 font-medium">⚡ Takes less than 2 minutes</p>
            <div className="space-y-4 mb-4">
              <Input placeholder="Full name *" value={firstName} onChange={(e) => setFirstName(e.target.value)} autoFocus className="text-center text-lg py-6" />
              <Input placeholder="Email" value={user?.email || ""} disabled className="text-center text-sm py-4 opacity-60" />
              <Input placeholder="@yourhandle or youtube.com/c/yourchannel" value={socialHandle} onChange={(e) => setSocialHandle(e.target.value)} className="text-center text-sm py-4" />
            </div>

            {/* Photo upload */}
            <div className="flex flex-col items-center gap-3 mb-6">
              <button onClick={() => fileRef.current?.click()} className="w-20 h-20 rounded-full border-2 border-dashed border-border hover:border-primary transition-colors flex items-center justify-center overflow-hidden bg-card">
                {avatarUrl ? <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" /> : <Camera className="w-6 h-6 text-muted-foreground" />}
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
            <h1 className="text-2xl md:text-3xl font-bold text-center mb-2">Your Creator Profile</h1>
            <p className="text-muted-foreground text-center text-sm mb-1">Help us understand your audience.</p>
            <p className="text-xs text-primary text-center mb-6 font-medium">🎯 This helps us prioritize your application</p>

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

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Total followers across all platforms?</label>
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
            </div>

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
            <p className="text-xs text-muted-foreground text-center mb-1 uppercase tracking-wider">Step 3 of 3 — Almost there! 🏁</p>
            <h1 className="text-2xl md:text-3xl font-bold text-center mb-2">One Last Thing</h1>
            <p className="text-muted-foreground text-center text-sm mb-1">These help us match you with the right tools.</p>
            <p className="text-xs text-primary text-center mb-6 font-medium">✨ Detailed answers = faster approval</p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Where are you right now? *
                </label>
                <div className="space-y-2">
                  {CREATOR_STAGES.map((s) => {
                    const selected = creatorStage === s.key;
                    const showError = attemptedSubmit && !creatorStage;
                    return (
                      <button
                        key={s.key}
                        type="button"
                        onClick={() => { setCreatorStage(s.key); setAttemptedSubmit(false); }}
                        aria-pressed={selected}
                        className={`w-full text-left flex items-start gap-3 rounded-xl border p-4 transition-all ${
                          selected
                            ? "border-primary bg-primary/10 ring-1 ring-primary/40"
                            : showError
                              ? "border-destructive/60 bg-card hover:border-destructive"
                              : "border-border bg-card hover:border-primary/40 hover:bg-card/80"
                        }`}
                      >
                        <div className="text-2xl shrink-0">{s.emoji}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground">{s.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
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

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Biggest monetization challenges? (select all)</label>
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
                <label className="text-sm font-medium text-foreground mb-1.5 block">What would you use UPLY for first?</label>
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
                <label className="text-sm font-medium text-foreground mb-1.5 block">How did you hear about UPLY?</label>
                <Select value={hearAbout} onValueChange={setHearAbout}>
                  <SelectTrigger><SelectValue placeholder="Select one" /></SelectTrigger>
                  <SelectContent>
                    {HEAR_ABOUT.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

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
                {saving ? "Submitting..." : "Submit Application"} <ArrowRight className="ml-1 w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
