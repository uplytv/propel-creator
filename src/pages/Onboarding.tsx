import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Camera, Check, X, Upload } from "lucide-react";
import { toast } from "sonner";
import { getAffiliateCookie, clearAffiliateCookie } from "@/lib/affiliateCookies";

const INTEREST_TAGS = ["Fitness", "Finance", "Music", "Gaming", "Tech", "Lifestyle", "Education", "Business", "Art", "Cooking", "Travel", "Health"];

const slideVariants = {
  enter: { opacity: 0, x: 40 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -40 },
};

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0); // 0=splash, 1=name, 2=role, 3=photo, 4=interests, 5=confirmation
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [roleType, setRoleType] = useState<"creator" | "member" | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [interests, setInterests] = useState<string[]>([]);
  const [referralCode, setReferralCode] = useState("");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Check if already onboarded
  useEffect(() => {
    if (!user) return;
    const check = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("onboarding_complete, referral_code")
        .eq("user_id", user.id)
        .single();
      if ((data as any)?.onboarding_complete) {
        navigate("/waitlist", { replace: true });
      }
      if ((data as any)?.referral_code) {
        setReferralCode((data as any).referral_code);
      }
    };
    check();
  }, [user]);

  // Auto-advance splash
  useEffect(() => {
    if (step === 0) {
      const t = setTimeout(() => setStep(1), 1500);
      return () => clearTimeout(t);
    }
  }, [step]);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Photo must be under 5MB");
      return;
    }
    setAvatarFile(file);
    setAvatarUrl(URL.createObjectURL(file));
  };

  const uploadPhoto = async (): Promise<string | null> => {
    if (!avatarFile || !user) return null;
    const ext = avatarFile.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, avatarFile, { upsert: true });
    if (error) {
      console.error("Avatar upload error:", error);
      return null;
    }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    return urlData.publicUrl;
  };

  const finishOnboarding = async () => {
    if (!user) return;
    setSaving(true);

    let uploadedUrl = avatarUrl;
    if (avatarFile) {
      uploadedUrl = await uploadPhoto();
    }

    // Process referral
    const refCode = getAffiliateCookie("uply_waitlist_ref");
    let referrerId: string | null = null;
    if (refCode) {
      const { data: referrer } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("referral_code", refCode)
        .maybeSingle();
      if (referrer && (referrer as any).user_id !== user.id) {
        referrerId = (referrer as any).user_id;
        // Log referral
        await supabase.from("referrals" as any).insert({
          referrer_id: referrerId,
          referred_id: user.id,
        });
      }
      clearAffiliateCookie("uply_waitlist_ref");
    }

    // Check if they used an invite code
    const inviteCode = getAffiliateCookie("uply_invite_code");
    let isApproved = false;
    if (inviteCode) {
      const { data: invite } = await supabase
        .from("invite_codes" as any)
        .select("id, is_used, owner_id")
        .eq("code", inviteCode)
        .eq("is_used", false)
        .maybeSingle() as any;
      if (invite) {
        await supabase
          .from("invite_codes" as any)
          .update({ is_used: true, used_by: user.id, used_at: new Date().toISOString() })
          .eq("id", invite.id);
        isApproved = true;
        // Also log as referral from invite code owner
        if (invite.owner_id !== user.id) {
          await supabase.from("referrals" as any).insert({
            referrer_id: invite.owner_id,
            referred_id: user.id,
          });
        }
      }
      clearAffiliateCookie("uply_invite_code");
    }

    await supabase
      .from("profiles")
      .update({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        display_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
        role_type: roleType,
        interests: roleType === "creator" ? interests : [],
        avatar_url: uploadedUrl,
        onboarding_complete: true,
        is_approved: isApproved,
        creator_type: roleType === "creator" ? "Content Creator" : null,
      } as any)
      .eq("user_id", user.id);

    setSaving(false);
    setStep(5);
  };

  const canProceedFromInterests = roleType === "member" || interests.length >= 1;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Progress bar */}
      {step > 0 && step < 5 && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-secondary">
          <motion.div
            className="h-full bg-primary"
            animate={{ width: `${(step / 5) * 100}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* Step 0: Splash */}
        {step === 0 && (
          <motion.div
            key="splash"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center gap-3"
          >
            <div className="w-24 h-24 rounded-2xl bg-primary flex items-center justify-center">
              <span className="text-5xl font-black text-primary-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>U</span>
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>UPLY</span>
          </motion.div>
        )}

        {/* Step 1: Name */}
        {step === 1 && (
          <motion.div key="name" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.35 }} className="w-full max-w-md">
            <h1 className="text-2xl md:text-3xl font-bold text-center mb-2">What's your name?</h1>
            <p className="text-muted-foreground text-center text-sm mb-8">So we know what to call you.</p>
            <div className="space-y-4 mb-8">
              <Input
                placeholder="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoFocus
                className="text-center text-lg py-6"
              />
              <Input
                placeholder="Last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="text-center text-lg py-6"
              />
            </div>
            <Button
              variant="hero"
              size="xl"
              className="w-full"
              disabled={!firstName.trim() || !lastName.trim()}
              onClick={() => setStep(2)}
            >
              Continue <ArrowRight className="ml-1 w-4 h-4" />
            </Button>
          </motion.div>
        )}

        {/* Step 2: Role */}
        {step === 2 && (
          <motion.div key="role" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.35 }} className="w-full max-w-md">
            <h1 className="text-2xl md:text-3xl font-bold text-center mb-2">I'm joining as a...</h1>
            <p className="text-muted-foreground text-center text-sm mb-8">You can always change this later.</p>
            <div className="grid grid-cols-2 gap-4 mb-8">
              {[
                { key: "creator" as const, emoji: "🎙️", label: "Creator", desc: "I create content and build a community" },
                { key: "member" as const, emoji: "👥", label: "Member", desc: "I follow creators and join communities" },
              ].map((r) => (
                <button
                  key={r.key}
                  onClick={() => setRoleType(r.key)}
                  className={`rounded-xl p-6 text-center border-2 transition-all duration-200 ${
                    roleType === r.key
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:border-primary/30"
                  }`}
                >
                  <span className="text-4xl block mb-3">{r.emoji}</span>
                  <span className="text-base font-semibold block text-foreground">{r.label}</span>
                  <span className="text-xs text-muted-foreground block mt-1">{r.desc}</span>
                </button>
              ))}
            </div>
            <Button
              variant="hero"
              size="xl"
              className="w-full"
              disabled={!roleType}
              onClick={() => setStep(3)}
            >
              Continue <ArrowRight className="ml-1 w-4 h-4" />
            </Button>
          </motion.div>
        )}

        {/* Step 3: Photo */}
        {step === 3 && (
          <motion.div key="photo" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.35 }} className="w-full max-w-md text-center">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">Add a photo</h1>
            <p className="text-muted-foreground text-sm mb-8">Help people recognize you.</p>

            <div className="flex flex-col items-center gap-4 mb-8">
              <button
                onClick={() => fileRef.current?.click()}
                className="w-28 h-28 rounded-full border-2 border-dashed border-border hover:border-primary transition-colors flex items-center justify-center overflow-hidden bg-card"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-8 h-8 text-muted-foreground" />
                )}
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
              {avatarUrl && (
                <button onClick={() => { setAvatarUrl(null); setAvatarFile(null); }} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                  <X className="w-3 h-3" /> Remove
                </button>
              )}
            </div>

            <div className="space-y-3">
              <Button
                variant="hero"
                size="xl"
                className="w-full"
                onClick={() => roleType === "creator" ? setStep(4) : finishOnboarding()}
                disabled={saving}
              >
                {saving ? "Saving..." : "Continue"} <ArrowRight className="ml-1 w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={() => roleType === "creator" ? setStep(4) : finishOnboarding()}
                disabled={saving}
              >
                Skip for now
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 4: Interests (Creator only) */}
        {step === 4 && (
          <motion.div key="interests" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.35 }} className="w-full max-w-md">
            <h1 className="text-2xl md:text-3xl font-bold text-center mb-2">What do you create?</h1>
            <p className="text-muted-foreground text-center text-sm mb-8">Select at least one topic.</p>
            <div className="flex flex-wrap gap-2 justify-center mb-8">
              {INTEREST_TAGS.map((tag) => {
                const selected = interests.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() =>
                      setInterests((prev) =>
                        selected ? prev.filter((t) => t !== tag) : [...prev, tag]
                      )
                    }
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition-all duration-200 ${
                      selected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-foreground border-border hover:border-primary/50"
                    }`}
                  >
                    {selected && <Check className="w-3 h-3 inline mr-1" />}
                    {tag}
                  </button>
                );
              })}
            </div>
            <Button
              variant="hero"
              size="xl"
              className="w-full"
              disabled={!canProceedFromInterests || saving}
              onClick={finishOnboarding}
            >
              {saving ? "Setting up..." : "Continue"} <ArrowRight className="ml-1 w-4 h-4" />
            </Button>
          </motion.div>
        )}

        {/* Step 5: Confirmation */}
        {step === 5 && (
          <motion.div key="done" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.35 }} className="w-full max-w-md text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="w-16 h-16 rounded-full bg-primary flex items-center justify-center mx-auto mb-6"
            >
              <Check className="w-8 h-8 text-primary-foreground" />
            </motion.div>
            <h1 className="text-2xl md:text-3xl font-bold mb-3">You're on the list 🎉</h1>
            <p className="text-muted-foreground text-sm mb-2">We're reviewing applications and letting people in waves.</p>
            <p className="text-primary text-sm font-semibold mb-8">Share your link to move up.</p>

            {referralCode && (
              <div className="mb-6">
                <div className="flex items-center gap-2">
                  <div className="flex-1 rounded-lg px-4 py-3 text-sm text-foreground truncate bg-card border border-border">
                    uply.tv/join/{referralCode}
                  </div>
                  <Button
                    onClick={async () => {
                      await navigator.clipboard.writeText(`https://uply.tv/join/${referralCode}`);
                      toast.success("Copied!");
                    }}
                    className="shrink-0 bg-primary text-primary-foreground"
                  >
                    Copy
                  </Button>
                </div>
              </div>
            )}

            <Button
              variant="hero"
              size="xl"
              className="w-full"
              onClick={() => navigate("/waitlist", { replace: true })}
            >
              View My Waitlist Status <ArrowRight className="ml-1 w-4 h-4" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
