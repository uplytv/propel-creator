import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Check, Copy, Twitter, Linkedin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import WaitlistLiveCounter from "./WaitlistLiveCounter";
import WaitlistLeaderboard from "./WaitlistLeaderboard";
import { buildReferralUrl, buildReferralUrlDisplay, getFirstName, getShareMessages } from "@/lib/referralUrls";

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

  const fullUrl = buildReferralUrl(referralCode, username);
  const displayUrl = buildReferralUrlDisplay(referralCode, username);
  const firstName = getFirstName(displayName);
  const messages = getShareMessages(firstName, fullUrl);

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
    toast.success("Invite link copied — share it with creators you know 🚀", { style: { color: "#00FF85" } });
    setTimeout(() => setLinkCopied(false), 2500);
  };

  const shareTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(messages.twitter)}`, "_blank");
  };

  const shareLinkedIn = () => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(fullUrl)}`, "_blank");
  };

  const shareInstagram = async () => {
    await navigator.clipboard.writeText(messages.instagram);
    toast.success("Caption copied — paste it in your Instagram bio or story", { style: { color: "#00FF85" } });
  };

  const shareTikTok = async () => {
    await navigator.clipboard.writeText(messages.instagram);
    toast.success("Caption copied — drop it in your TikTok bio", { style: { color: "#00FF85" } });
  };

  const shareSMS = () => {
    window.open(`sms:?body=${encodeURIComponent(messages.sms)}`, "_self");
  };

  return (
    <div className="max-w-2xl mx-auto px-4">
      {/* Live counter */}
      <div className="text-center mb-8">
        <WaitlistLiveCounter />
      </div>

      {/* Checkmark + headline */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-6"
      >
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 bg-primary">
          <Check className="w-8 h-8 text-primary-foreground" />
        </div>
        <h2 className="text-[24px] font-bold text-foreground mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Application Received ✓
        </h2>
        <p className="text-sm leading-relaxed max-w-md mx-auto text-muted-foreground">
          We review applications every Monday. If you're a fit for the Founding Creator class you'll hear from us directly.
        </p>
      </motion.div>

      {/* Referrer thank you card */}
      {referrerName && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-xl p-4 mb-6 bg-card"
          style={{ border: "1px solid hsl(var(--primary))" }}
        >
          <div className="flex items-center gap-3 mb-2">
            {referrerAvatar ? (
              <img src={referrerAvatar} alt={referrerName} className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                {referrerName[0]}
              </div>
            )}
            <p className="text-sm font-semibold text-foreground">{referrerName} referred you</p>
          </div>
          <p className="text-xs text-muted-foreground">You and {referrerFirstName} both moved up the waitlist</p>
          <p className="text-xs text-primary mt-1">{referrerFirstName} is now notified that you applied</p>
        </motion.div>
      )}

      {/* Position card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="rounded-2xl p-8 text-center mb-6 bg-card"
        style={{ border: "2px solid hsl(var(--primary))" }}
      >
        <p className="text-xs font-semibold tracking-widest uppercase mb-2 text-muted-foreground">YOUR CURRENT POSITION</p>
        <p className="text-[72px] font-extrabold leading-none mb-2 text-primary" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          #{position}
        </p>
        <p className="text-sm text-muted-foreground mb-1">out of {(totalApplicants || position).toLocaleString()} creators on the waitlist</p>
        <p className="text-sm text-foreground mt-3 font-medium">Refer creators to move up faster</p>
      </motion.div>

      {/* Movement explanation */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-3 gap-2 mb-6"
      >
        {[
          { refs: "+3 referrals", reward: "Jump 30 spots" },
          { refs: "+10 referrals", reward: "Jump to top 100" },
          { refs: "+25 referrals", reward: "Founding Creator 👑" },
        ].map((item) => (
          <div key={item.refs} className="rounded-xl p-3 text-center bg-card border border-border">
            <p className="text-xs font-semibold text-primary">{item.refs}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{item.reward}</p>
          </div>
        ))}
      </motion.div>

      {/* Referral link section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.5 }}
        className="mb-8"
      >
        {/* Referral link input */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 rounded-lg px-4 py-3 text-sm text-foreground truncate bg-card border border-border">
            {displayUrl}
          </div>
          <Button
            onClick={copyLink}
            className="shrink-0 gap-2 bg-primary text-primary-foreground"
          >
            <Copy className="w-4 h-4" />
            {linkCopied ? "Copied!" : "Copy"}
          </Button>
        </div>

        {/* Share buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <Button variant="outline" className="gap-2 text-xs" onClick={shareSMS}>
            💬 iMessage
          </Button>
          <Button variant="outline" className="gap-2 text-xs" onClick={shareTwitter}>
            <Twitter className="w-4 h-4" /> Twitter/X
          </Button>
          <Button variant="outline" className="gap-2 text-xs" onClick={shareLinkedIn}>
            <Linkedin className="w-4 h-4" /> LinkedIn
          </Button>
          <Button variant="outline" className="gap-2 text-xs" onClick={shareInstagram}>
            📷 Instagram
          </Button>
          <Button variant="outline" className="gap-2 text-xs" onClick={shareTikTok}>
            🎵 TikTok
          </Button>
        </div>
      </motion.div>

      {/* Leaderboard */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        <WaitlistLeaderboard currentEmail={email} />
      </motion.div>
    </div>
  );
}
