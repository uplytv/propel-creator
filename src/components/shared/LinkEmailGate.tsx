import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Loader2, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  creatorId: string;
  creatorName: string;
  source?: string;
  onComplete: () => void;
}

export default function LinkEmailGate({ creatorId, creatorName, source = "link", onComplete }: Props) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    try {
      await supabase.from("subscribers").upsert(
        {
          creator_id: creatorId,
          email: email.trim().toLowerCase(),
          name: name.trim() || null,
          source,
          metadata: { captured_at: new Date().toISOString() },
        },
        { onConflict: "creator_id,email" }
      );
      onComplete();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-50 bg-background/95 flex items-center justify-center px-4"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 space-y-4"
        >
          <div className="text-center">
            <div
              className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center"
              style={{ background: "rgba(61, 124, 255,0.1)" }}
            >
              <Mail className="w-6 h-6" style={{ color: "#3D7CFF" }} />
            </div>
            <h2 className="text-lg font-bold text-foreground">Enter your email to continue</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Join <span className="font-medium text-foreground">{creatorName}</span>'s list on UPLY
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2.5 rounded-xl text-sm bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
            />
            <input
              type="text"
              placeholder="Your name (optional)"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
            />
            <button
              type="submit"
              disabled={submitting || !email.trim()}
              className="w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              style={{ background: "#3D7CFF", color: "#0A0A0A" }}
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              Continue
            </button>
          </form>

          <p className="text-[10px] text-muted-foreground text-center">
            You're subscribing to {creatorName}'s list on UPLY. Unsubscribe anytime.
          </p>

          <button
            onClick={onComplete}
            className="w-full text-center text-xs text-muted-foreground/60 hover:text-muted-foreground underline"
          >
            Skip for now
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
