import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Copy, Twitter, Linkedin, LogOut, ExternalLink, MessageCircle, Trophy, Flame, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import WaitlistLiveCounter from "./WaitlistLiveCounter";
import WaitlistLeaderboard from "./WaitlistLeaderboard";
import LiveSignupTicker from "./LiveSignupTicker";
import { buildReferralUrl, buildReferralUrlDisplay, getFirstName, getShareMessages } from "@/lib/referralUrls";
import { clearAffiliateCookie } from "@/lib/affiliateCookies";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";

interface Props {
  position: number;
  referralCode: string;
  referralCount: number;
  email: string;
  displayName?: string;
  username?: string | null;
  totalApplicants?: number;
}

export default function PostApplicationScreen({ position, referralCode, referralCount, email, displayName, username, totalApplicants }: Props) {
  const [linkCopied, setLinkCopied] = useState(false);
  const [referrerName, setReferrerName] = useState<string | null>(null);
  const [referrerAvatar, setReferrerAvatar] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const fullUrl = buildReferralUrl(referralCode, username);
  const displayUrl = buildReferralUrlDisplay(referralCode, username);
  const firstName = getFirstName(displayName);
  const messages = getShareMessages(firstName, fullUrl);
  const total = totalApplicants || position;
  const topPercent = total > 0 ? Math.max(1, Math.round((position / total) * 100)) : 100;
  const progressFill = total > 0 ? Math.max(5, 100 - ((position / total) * 100)) : 50;

  useEffect(() => {
    const storedName = sessionStorage.getItem("referrer_name");
    const storedAvatar = sessionStorage.getItem("referrer_avatar");
    if (storedName) setReferrerName(storedName);
    if (storedAvatar) setReferrerAvatar(storedAvatar);
  }, []);

  const referrerFirstName = referrerName ? referrerName.split(" ")[0] : null;

  const copyLink = async () => {
    await navigator.clipboard.writeText(fullUrl);
    setLinkCopied(true);
    toast.success("Invite link copied ✓");
    setTimeout(() => setLinkCopied(false), 2500);
  };

  const shareTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(messages.twitter)}`, "_blank");
  };

  const shareLinkedIn = () => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(fullUrl)}`, "_blank");
  };

  const shareInstagram = async () => {
    await navigator.clipboard.writeText(fullUrl);
    toast.success("Link copied — paste in your Instagram bio or story");
  };

  const shareTikTok = async () => {
    await navigator.clipboard.writeText(fullUrl);
    toast.success("Link copied — drop it in your TikTok bio");
  };

  const shareSMS = () => {
    window.open(`sms:?body=${encodeURIComponent(messages.sms)}`, "_self");
  };

  const handleStartOver = () => {
    clearAffiliateCookie("uply_waitlist_ref");
    clearAffiliateCookie("uply_referrer_username");
    clearAffiliateCookie("uply_referrer_name");
    try {
      localStorage.removeItem("uply_referrer_avatar");
      localStorage.removeItem("uply_waitlist_ref");
      localStorage.removeItem("uply_referrer_username");
      localStorage.removeItem("uply_referrer_name");
    } catch {}
    sessionStorage.clear();
    navigate("/auth?mode=signup", { replace: true });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/", { replace: true });
  };

  return (
    <div className="max-w-2xl mx-auto px-4 pb-16">
      {/* Confetti burst on mount */}
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        {Array.from({ length: 24 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full"
            style={{
              left: `${40 + Math.random() * 20}%`,
              top: "40%",
              background: ["hsl(var(--primary))", "hsl(var(--warning))", "#FF6B6B", "hsl(258 90% 66%)", "#00D4FF"][i % 5],
            }}
            initial={{ opacity: 1, scale: 1 }}
            animate={{
              x: (Math.random() - 0.5) * 300,
              y: Math.random() * -400 + 100,
              opacity: 0,
              scale: 0,
              rotate: Math.random() * 720,
            }}
            transition={{ duration: 1.5, delay: 0.2 + i * 0.03, ease: "easeOut" }}
          />
        ))}
      </div>

      {/* Live counter + ticker */}
      <div className="text-center mb-6 space-y-3">
        <WaitlistLiveCounter />
        <div className="flex justify-center">
          <LiveSignupTicker />
        </div>
      </div>

      {/* Checkmark + headline */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="text-center mb-6"
      >
        <motion.div 
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 bg-primary"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Check className="w-8 h-8 text-primary-foreground" />
        </motion.div>
        <h2 className="text-[28px] font-extrabold text-foreground mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          You're on the list. 🎉
        </h2>
        <p className="text-sm text-muted-foreground">Your application is in. Selling unlocks when you’re approved.</p>
      </motion.div>

      <div className="rounded-xl border border-border bg-card p-5 mb-5 text-left">
        <h3 className="text-sm font-bold text-foreground">What happens next</h3>
        <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li><span className="font-semibold text-foreground">1. We review the application.</span> An invite code or Founders access skips the line.</li>
          <li><span className="font-semibold text-foreground">2. Approval opens your dashboard.</span> The first job there is a paid offer: membership, tickets, pay-per-view, or tips.</li>
          <li><span className="font-semibold text-foreground">3. You keep 95%.</span> Connect Stripe, set the price, then share the link.</li>
        </ol>
      </div>

      {/* Referrer card */}
      {referrerName && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-[10px] p-4 mb-5"
          style={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--primary))" }}
        >
          <div className="flex items-center gap-3 mb-2">
            {referrerAvatar ? (
              <img src={referrerAvatar} alt={referrerName} className="w-9 h-9 rounded-full object-cover" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                {referrerName[0]}
              </div>
            )}
            <p className="text-sm font-semibold text-foreground">{referrerName} personally invited you</p>
          </div>
          {total > position && (
            <p className="text-xs text-muted-foreground">You were added ahead of {total - position} people who applied organically</p>
          )}
          <p className="text-xs text-primary mt-1 flex items-center gap-1">
            <Check className="w-3 h-3" /> {referrerFirstName} has been notified you applied
          </p>
        </motion.div>
      )}

      {/* Position card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="rounded-[14px] p-8 text-center mb-4"
        style={{ background: "hsl(var(--background))", border: "2px solid hsl(var(--primary))" }}
      >
        <p className="text-[11px] font-semibold tracking-[0.1em] uppercase mb-2 text-muted-foreground">YOUR WAITLIST POSITION</p>
        <p className="text-[80px] font-extrabold leading-none mb-2 text-primary" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          #{position || "—"}
        </p>
        <p className="text-sm text-muted-foreground mb-1">out of {total.toLocaleString()} creators who have applied</p>
        <p className="text-[13px] text-foreground mt-3 font-medium">Every creator you refer moves you up 10 spots</p>
      </motion.div>

      {/* Progress bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mb-6"
      >
        <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressFill}%` }}
            transition={{ delay: 0.5, duration: 0.8 }}
          />
        </div>
        <p className="text-xs text-primary mt-1 text-right font-medium">Top {topPercent}%</p>
      </motion.div>

      {/* Milestone cards */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="grid grid-cols-3 gap-2 mb-6"
      >
        {[
          { emoji: "🥉", refs: 3, reward: "Move up 30 spots", border: "border-border" },
          { emoji: "🥈", refs: 10, reward: "Top 100 guaranteed", border: "border-border" },
          { emoji: "🥇", refs: 25, reward: "Founding Creator 👑\nFounding Rate Lock — 95% payout for life", border: "border-yellow-500/50" },
        ].map((item) => (
          <div
            key={item.refs}
            className={`rounded-xl p-3 text-center bg-card border ${item.border}`}
          >
            <span className="text-lg">{item.emoji}</span>
            <p className="text-xs font-semibold text-primary mt-1">{item.refs} Referrals</p>
            <p className="text-[10px] text-muted-foreground mt-1 whitespace-pre-line">{item.reward}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{Math.min(referralCount, item.refs)}/{item.refs} referred</p>
          </div>
        ))}
      </motion.div>

      {/* Urgency timer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.37 }}
        className="mb-6 text-center"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border">
          <Flame className="w-4 h-4 text-orange-400" />
          <span className="text-xs text-muted-foreground">
            <span className="text-foreground font-semibold">Pro tip:</span> Creators who share within 1 hour move up 2x faster
          </span>
        </div>
      </motion.div>

      {/* Referral link section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mb-6"
      >
        <p className="text-sm font-semibold text-foreground mb-3">Share your personal invite link:</p>
        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 rounded-lg px-4 py-3 text-sm text-foreground truncate bg-card border border-border">
            {displayUrl}
          </div>
          <Button onClick={copyLink} className="shrink-0 gap-2 bg-primary text-primary-foreground">
            <Copy className="w-4 h-4" />
            {linkCopied ? "Copied!" : "Copy"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mb-4">When someone applies using your link you both move up the waitlist.</p>

        {/* Share buttons grid */}
        <div className="grid grid-cols-3 sm:grid-cols-3 gap-2">
          {[
            { label: "iMessage", emoji: "📱", action: shareSMS },
            { label: "Twitter/X", emoji: "🐦", action: shareTwitter },
            { label: "LinkedIn", emoji: "💼", action: shareLinkedIn },
            { label: "Instagram", emoji: "📸", action: shareInstagram },
            { label: "TikTok", emoji: "🎵", action: shareTikTok },
            { label: "Copy Link", emoji: "🔗", action: copyLink },
          ].map(btn => (
            <button
              key={btn.label}
              onClick={btn.action}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors"
            >
              <span className="text-lg">{btn.emoji}</span>
              <span className="text-[11px] text-muted-foreground">{btn.label}</span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Leaderboard */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mb-8"
      >
        <WaitlistLeaderboard currentEmail={email} />
      </motion.div>

      {/* ── NAVIGATION FOOTER ── */}
      <div className="border-t border-border pt-6 space-y-4">
        {/* Log in */}
        <div className="flex items-center justify-between">
          <p className="text-[13px] text-muted-foreground">Already have a UPLY account?</p>
          <button onClick={() => navigate("/auth")} className="text-[13px] text-primary font-medium hover:underline">
            Log In →
          </button>
        </div>

        {/* Start over */}
        <div className="flex items-center justify-between">
          <p className="text-[13px] text-muted-foreground">Applied with the wrong email?</p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="text-[13px] text-muted-foreground hover:text-foreground hover:underline">
                Start over
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Start a new application?</AlertDialogTitle>
                <AlertDialogDescription>
                  Your current application will remain — you can apply with a different email.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleStartOver}>Confirm</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>


        {/* Sign out */}
        {user && (
          <button
            onClick={handleSignOut}
            className="w-full text-center text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 pt-2"
          >
            <LogOut className="w-3 h-3" /> Sign out
          </button>
        )}
      </div>
    </div>
  );
}
