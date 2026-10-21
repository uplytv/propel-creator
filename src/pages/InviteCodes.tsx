import { useState } from "react";
import { motion } from "framer-motion";
import { Copy, Check, Gift, Twitter, MessageCircle, ExternalLink, Crown, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import AppLayout from "@/components/layout/AppLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useInviteCodes, getInviteUrl } from "@/hooks/useInviteCodes";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";

export default function InviteCodes() {
  const { profile } = useApp();
  const { data: inviteData, isLoading } = useInviteCodes();
  const [copied, setCopied] = useState<string | null>(null);
  const navigate = useNavigate();

  if (!isLoading && !profile.isApproved) {
    navigate("/waitlist", { replace: true });
    return null;
  }

  const codes = inviteData?.codes || [];
  const remaining = inviteData?.remaining || 0;
  const used = inviteData?.used || 0;

  const copyCode = async (code: string) => {
    await navigator.clipboard.writeText(getInviteUrl(code));
    setCopied(code);
    toast.success("Beta invite link copied , share it wisely 🎯");
    setTimeout(() => setCopied(null), 2500);
  };

  const shareTwitter = (code: string) => {
    const text = `I just got beta access to UPLY , the creator platform with Free, Pro and Studio plans.\n\nUsing one of my invites to let you skip the waitlist:\n${getInviteUrl(code)}\n\n@uplyTV`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank");
  };

  const shareSMS = (code: string) => {
    const text = `Hey , I'm on UPLY beta. It offers community, courses and events and it's invite-only. Using one of my invites to get you in ahead of the waitlist: ${getInviteUrl(code)}`;
    window.open(`sms:?body=${encodeURIComponent(text)}`, "_self");
  };

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto px-6 py-8 pb-24">

        {/* Beta status */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center gap-4 p-5 rounded-xl border border-primary/20 bg-primary/5">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Crown className="w-6 h-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <h1 className="text-lg font-bold text-foreground">Beta Access Active</h1>
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              </div>
              <p className="text-sm text-muted-foreground">You're in the founding class of UPLY</p>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {[
            { label: "Invites remaining", value: isLoading ? null : remaining, color: "text-primary" },
            { label: "People let in", value: isLoading ? null : used, color: "text-foreground" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-4 text-center">
              {s.value === null
                ? <Skeleton className="h-8 w-12 mx-auto mb-1" />
                : <p className={`text-3xl font-extrabold ${s.color}`}>{s.value}</p>
              }
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* What this is */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-6">
          <div className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border">
            <Sparkles className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-foreground">
                Your invites bypass the waitlist completely
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Thousands of creators are waiting. Anyone you invite gets in immediately , no queue.{" "}
                Use them for creators you actually want to build with.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Invite cards */}
        <p className="text-sm font-semibold text-foreground mb-3">Your Beta Invites</p>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : codes.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No invite codes found.</p>
            <p className="text-xs text-muted-foreground mt-1">Contact support if you think this is an error.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {codes.map((code, i) => (
              <motion.div
                key={code.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`rounded-xl border p-4 ${
                  code.is_used ? "bg-card/50 border-border" : "bg-card border-primary/20"
                }`}
              >
                {code.is_used ? (
                  <div className="flex items-center gap-3">
                    <Avatar className="w-9 h-9">
                      <AvatarImage src={code.used_by_avatar || undefined} alt={code.used_by_name || "User"} />
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {code.used_by_name?.[0]?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{code.used_by_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Joined via your invite
                        {code.used_at
                          ? ` · ${new Date(code.used_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Check className="w-3.5 h-3.5" /> Used
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Invite {i + 1} of 5
                        </p>
                        <p className="text-sm font-mono font-bold text-foreground mt-0.5">
                          {code.code}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyCode(code.code)}
                        className="gap-1.5 text-xs h-8 shrink-0 border-primary/30 text-primary hover:bg-primary/10"
                        aria-label="Copy invite link"
                      >
                        {copied === code.code
                          ? <><Check className="w-3 h-3" /> Copied!</>
                          : <><Copy className="w-3 h-3" /> Copy Link</>
                        }
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => shareTwitter(code.code)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary border border-border text-xs font-medium text-foreground hover:bg-muted transition-all"
                        aria-label="Share on Twitter"
                      >
                        <Twitter className="w-3 h-3" /> Twitter/X
                      </button>
                      <button
                        onClick={() => shareSMS(code.code)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary border border-border text-xs font-medium text-foreground hover:bg-muted transition-all"
                        aria-label="Share via iMessage"
                      >
                        <MessageCircle className="w-3 h-3" /> iMessage
                      </button>
                      <button
                        onClick={() => window.open(getInviteUrl(code.code), "_blank")}
                        className="ml-auto p-1.5 rounded-lg bg-secondary border border-border text-muted-foreground hover:text-foreground transition-all"
                        aria-label="Preview invite page"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}

        {!isLoading && remaining === 0 && used > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center mt-8">
            <p className="text-lg font-bold text-foreground">All 5 invites used 🎉</p>
            <p className="text-sm text-muted-foreground mt-1">You've helped build UPLY's founding class.</p>
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
}
