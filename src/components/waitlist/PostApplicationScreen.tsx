import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Copy, Twitter, Linkedin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import WaitlistLiveCounter from "./WaitlistLiveCounter";
import WaitlistLeaderboard from "./WaitlistLeaderboard";

interface Props {
  position: number;
  referralCode: string;
  referralCount: number;
  email: string;
}

export default function PostApplicationScreen({ position, referralCode, referralCount, email }: Props) {
  const [linkCopied, setLinkCopied] = useState(false);
  const referralUrl = `uply.tv/join/${referralCode}`;
  const fullUrl = `https://${referralUrl}`;

  const copyLink = async () => {
    await navigator.clipboard.writeText(fullUrl);
    setLinkCopied(true);
    toast.success("Referral link copied ✓", { style: { color: "#00FF85" } });
    setTimeout(() => setLinkCopied(false), 2500);
  };

  const shareTwitter = () => {
    const text = `I just applied to UPLY — the creator platform that replaces everything else. Use my link to apply and we'll both move up the waitlist → ${fullUrl}`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank");
  };

  const shareLinkedIn = () => {
    const text = `Excited to be on the waitlist for UPLY — a new creator monetization platform combining live streaming, community, and courses in one place. Apply here → ${fullUrl}`;
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(fullUrl)}&summary=${encodeURIComponent(text)}`, "_blank");
  };

  const shareInstagram = async () => {
    await navigator.clipboard.writeText(fullUrl);
    toast.success("Link copied — paste it in your Instagram bio or story", { style: { color: "#00FF85" } });
  };

  const shareTikTok = async () => {
    await navigator.clipboard.writeText(fullUrl);
    toast.success("Link copied — drop it in your TikTok bio", { style: { color: "#00FF85" } });
  };

  const tiers = [
    { emoji: "✅", label: "1 Referral", reward: "Confirms your spot on the waitlist", border: "#1E1E1E" },
    { emoji: "🚀", label: "3 Referrals", reward: "Guaranteed early access — skip the queue", border: "#00FF85" },
    { emoji: "💰", label: "Most Referrals", reward: "Win $1,000 cash prize", border: "#FFD700" },
  ];

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
        className="text-center mb-8"
      >
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: "#00FF85" }}>
          <Check className="w-8 h-8" style={{ color: "#0A0A0A" }} />
        </div>
        <h2 className="text-[28px] font-bold text-white mb-3">Application Received.</h2>
        <p className="text-sm leading-relaxed max-w-md mx-auto" style={{ color: "#888" }}>
          We review applications every Monday. If you're a fit for the Founding Creator class you'll hear from us directly.
        </p>
      </motion.div>

      {/* Position card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="rounded-2xl p-8 text-center mb-8"
        style={{ background: "#111111", border: "2px solid #00FF85" }}
      >
        <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: "#888" }}>You're currently</p>
        <p className="text-[64px] font-bold leading-none mb-2" style={{ color: "#00FF85" }}>
          #{position}
        </p>
        <p className="text-sm mb-4" style={{ color: "#888" }}>on the waitlist</p>
        <p className="text-xs" style={{ color: "#888" }}>Move up 10 spots for every creator you refer.</p>
      </motion.div>

      {/* Referral section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.5 }}
        className="mb-8"
      >
        <h3 className="text-xl font-bold text-white mb-5">Skip the line. Refer creators.</h3>

        {/* Tier cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          {tiers.map((tier) => (
            <div
              key={tier.label}
              className="rounded-xl p-5 text-center"
              style={{ background: "#111111", border: `1.5px solid ${tier.border}` }}
            >
              <p className="text-2xl mb-2">{tier.emoji}</p>
              <p className="text-sm font-semibold text-white mb-1">{tier.label}</p>
              <p className="text-xs" style={{ color: "#888" }}>{tier.reward}</p>
            </div>
          ))}
        </div>

        {/* Referral progress */}
        <p className="text-sm mb-6" style={{ color: referralCount > 0 ? "#00FF85" : "#888" }}>
          {referralCount > 0
            ? `You've referred ${referralCount} creator${referralCount > 1 ? "s" : ""} so far`
            : "You haven't referred anyone yet"}
        </p>

        {/* Referral link input */}
        <div className="flex items-center gap-2 mb-5">
          <div
            className="flex-1 rounded-lg px-4 py-3 text-sm text-white truncate"
            style={{ background: "#111111", border: "1px solid #1E1E1E" }}
          >
            {referralUrl}
          </div>
          <Button
            onClick={copyLink}
            className="shrink-0 gap-2"
            style={{ background: "#00FF85", color: "#0A0A0A" }}
          >
            <Copy className="w-4 h-4" />
            {linkCopied ? "Copied!" : "Copy Link"}
          </Button>
        </div>

        {/* Share buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Button variant="outline" className="gap-2 text-xs" onClick={shareTwitter}>
            <Twitter className="w-4 h-4" /> Twitter/X
          </Button>
          <Button variant="outline" className="gap-2 text-xs" onClick={shareInstagram}>
            📷 Instagram
          </Button>
          <Button variant="outline" className="gap-2 text-xs" onClick={shareLinkedIn}>
            <Linkedin className="w-4 h-4" /> LinkedIn
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
