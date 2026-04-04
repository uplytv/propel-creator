import { motion } from "framer-motion";
import { Users, Eye, ShoppingCart, UserMinus, Sparkles, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";

interface AudienceTemplatesProps {
  metaConnected: boolean;
  googleConnected: boolean;
}

const templates = [
  {
    id: "lookalike",
    title: "Lookalike from Members",
    description: "Find new people similar to your best-performing community members.",
    icon: Users,
    platform: "both" as const,
    estimatedReach: "120K – 350K",
  },
  {
    id: "stream-viewers",
    title: "Retarget Stream Viewers",
    description: "Re-engage people who watched your live streams but haven't joined yet.",
    icon: Eye,
    platform: "both" as const,
    estimatedReach: "8K – 25K",
  },
  {
    id: "page-visitors",
    title: "Retarget Page Visitors",
    description: "Bring back visitors who browsed your community or product pages.",
    icon: ShoppingCart,
    platform: "both" as const,
    estimatedReach: "15K – 50K",
  },
  {
    id: "abandoned-checkout",
    title: "Retarget Abandoned Checkout",
    description: "Win back users who started checkout but didn't complete their purchase.",
    icon: UserMinus,
    platform: "both" as const,
    estimatedReach: "2K – 8K",
  },
];

export default function AudienceTemplates({ metaConnected, googleConnected }: AudienceTemplatesProps) {
  const anyConnected = metaConnected || googleConnected;
  const [activating, setActivating] = useState<string | null>(null);
  const [activated, setActivated] = useState<Set<string>>(new Set());

  const handleActivate = (id: string) => {
    setActivating(id);
    setTimeout(() => {
      setActivating(null);
      setActivated((prev) => new Set(prev).add(id));
      toast.success("Audience created ✨", { description: "Your audience template is now building." });
    }, 1500);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold">Pre-built Audience Templates</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        One-click audience creation powered by your pixel data. Audiences sync to both Meta and Google when connected.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {templates.map((t, i) => {
          const isActivated = activated.has(t.id);
          const isActivating = activating === t.id;

          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 + i * 0.06 }}
              className={`glass-card p-5 transition-all ${!anyConnected ? "opacity-50" : ""}`}
            >
              <div className="flex items-start gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  isActivated ? "bg-primary/15" : "bg-secondary"
                }`}>
                  <t.icon className={`w-5 h-5 ${isActivated ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold">{t.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{t.description}</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">
                  Est. reach: <span className="font-semibold text-foreground">{t.estimatedReach}</span>
                </span>
                {!anyConnected ? (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Lock className="w-3 h-3" /> Connect an account
                  </span>
                ) : isActivated ? (
                  <span className="text-xs font-semibold text-primary flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    Building…
                  </span>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isActivating}
                    onClick={() => handleActivate(t.id)}
                    className="text-xs h-8"
                  >
                    {isActivating ? "Creating…" : "Activate"}
                  </Button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
