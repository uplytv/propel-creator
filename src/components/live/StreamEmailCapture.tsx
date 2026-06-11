import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, X, Bell, Loader2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  creatorId: string;
  creatorName: string;
  streamId: string;
}

export default function StreamEmailCapture({ creatorId, creatorName, streamId }: Props) {
  const [visible, setVisible] = useState(true);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  if (!visible || done) return null;

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
          source: "stream_join",
          metadata: { stream_id: streamId },
        },
        { onConflict: "creator_id,email" }
      );
      setDone(true);
      toast.success("You'll be notified when they go live!");
    } catch {
      toast.error("Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="absolute bottom-24 left-3 right-3 z-30"
      >
        <div
          className="rounded-2xl p-4 backdrop-blur-xl border"
          style={{
            background: "rgba(10,10,10,0.9)",
            borderColor: "rgba(255,255,255,0.1)",
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(61, 124, 255,0.15)" }}>
                <Bell className="w-4 h-4" style={{ color: "#3D7CFF" }} />
              </div>
              <span className="text-xs font-semibold text-white">Never miss a stream</span>
            </div>
            <button onClick={() => setVisible(false)} className="text-white/30 hover:text-white/60">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[11px] text-white/50 mb-3">
            Get notified when <span className="text-white/80 font-medium">{creatorName}</span> goes live
          </p>
          <form onSubmit={handleSubmit} className="space-y-2">
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-white/20"
            />
            <input
              type="text"
              placeholder="Your name (optional)"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-white/20"
            />
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
              style={{ background: "#3D7CFF", color: "#0A0A0A" }}
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              Subscribe
            </button>
          </form>
          <p className="text-[10px] text-white/30 mt-2 text-center">
            You're subscribing to {creatorName}'s list on UPLY. Unsubscribe anytime.
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
