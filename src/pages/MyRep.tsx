import { motion } from "framer-motion";
import { Lock, MessageSquare, Phone, Calendar, Clock, Star, Users, TrendingUp, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApp, tierNames } from "@/context/AppContext";
import AppLayout from "@/components/layout/AppLayout";

const tierTargets = [
  { members: 100, mrr: 1000 },
  { members: 500, mrr: 5000 },
  { members: 2000, mrr: 20000 },
  { members: 10000, mrr: 100000 },
];

const mockMessages = [
  { from: "rep", text: "Hey! I reviewed your growth metrics this week. You're doing great on member acquisition. Let's focus on improving your conversion rate next.", time: "Yesterday" },
  { from: "creator", text: "Thanks Jordan! I was thinking about adding a free trial to my community. What do you think?", time: "Yesterday" },
  { from: "rep", text: "Love that idea. Free trials typically increase conversion by 40-60%. Let me put together a plan for you.", time: "Today" },
];

export default function MyRep() {
  const { profile } = useApp();
  const isLocked = profile.tier <= 2;
  const target = tierTargets[profile.tier - 1];
  const memberPct = Math.min((profile.members / target.members) * 100, 100);
  const mrrPct = Math.min((profile.mrr / target.mrr) * 100, 100);

  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        {isLocked ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-12">
            <div className="w-20 h-20 rounded-full bg-secondary/80 flex items-center justify-center mx-auto mb-6">
              <Lock className="w-10 h-10 text-muted-foreground" />
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold mb-3">Your dedicated growth rep is waiting.</h1>
            <p className="text-muted-foreground text-lg mb-10 max-w-md mx-auto">Reach 500 members or $5k MRR to unlock your personal success rep.</p>

            {/* Blurred preview */}
            <div className="glass-card p-6 mb-8 relative overflow-hidden">
              <div className="absolute inset-0 backdrop-blur-md bg-background/40 z-10 flex items-center justify-center">
                <span className="text-sm text-muted-foreground font-medium">Unlock at Tier 3 — Scaling</span>
              </div>
              <div className="flex items-center gap-4 opacity-50">
                <div className="w-16 h-16 rounded-full bg-secondary" />
                <div>
                  <div className="h-4 w-32 bg-secondary rounded mb-2" />
                  <div className="h-3 w-48 bg-secondary rounded" />
                </div>
              </div>
            </div>

            {/* Progress */}
            <div className="glass-card p-6 max-w-md mx-auto">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Your Progress</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Members</span>
                    <span className="font-semibold">{profile.members} / {target.members}</span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <motion.div className="h-full rounded-full bg-primary" initial={{ width: 0 }} animate={{ width: `${memberPct}%` }} transition={{ duration: 1 }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">MRR</span>
                    <span className="font-semibold">${profile.mrr.toLocaleString()} / ${target.mrr.toLocaleString()}</span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <motion.div className="h-full rounded-full bg-primary" initial={{ width: 0 }} animate={{ width: `${mrrPct}%` }} transition={{ duration: 1, delay: 0.1 }} />
                  </div>
                </div>
              </div>
            </div>

            <Button variant="hero" size="lg" className="mt-8">See What Unlocks at Tier 3</Button>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-2xl md:text-3xl font-bold mb-6">My Rep</h1>

            {/* Rep Profile */}
            <div className="glass-card p-6 mb-6">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center text-xl font-bold flex-shrink-0">JR</div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold">Jordan Rivera</h2>
                  <p className="text-sm text-muted-foreground">Senior Growth Strategist</p>
                  <p className="text-sm text-muted-foreground mt-2">Specializing in community-led growth and subscription businesses. 8 years helping creators scale past $10k MRR.</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {["Revenue Optimization", "Community Growth", "Pricing Strategy"].map((s) => (
                      <span key={s} className="text-xs px-3 py-1 rounded-full bg-primary/10 text-primary font-medium">{s}</span>
                    ))}
                  </div>
                  <div className="flex items-center gap-6 mt-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> 127 creators helped</span>
                    <span className="flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" /> +340% avg revenue increase</span>
                    <span className="flex items-center gap-1 text-primary"><Clock className="w-3.5 h-3.5" /> 2h avg response</span>
                  </div>
                  <div className="flex gap-3 mt-4">
                    <Button variant="default" size="sm"><Phone className="w-4 h-4 mr-1" /> Book a Call</Button>
                    <Button variant="outline" size="sm"><MessageSquare className="w-4 h-4 mr-1" /> Send Message</Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="glass-card p-6 mb-6">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Messages</h3>
              <div className="space-y-4">
                {mockMessages.map((m, i) => (
                  <div key={i} className={`flex ${m.from === "creator" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] p-3 rounded-xl text-sm ${m.from === "creator" ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
                      <p>{m.text}</p>
                      <p className={`text-[10px] mt-1 ${m.from === "creator" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>{m.time}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                <input placeholder="Type a message..." className="flex-1 bg-secondary rounded-lg px-4 py-2 text-sm outline-none placeholder:text-muted-foreground" />
                <Button size="sm">Send</Button>
              </div>
            </div>

            {/* Growth Plan */}
            <div className="glass-card p-6">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Shared Growth Plan</h3>
              <div className="space-y-3">
                {[
                  { milestone: "Launch free trial system", status: "done", note: "Completed — conversion up 45%" },
                  { milestone: "Optimize pricing page", status: "in-progress", note: "Jordan reviewing your current page" },
                  { milestone: "Create referral program", status: "upcoming", note: "Scheduled for next sprint" },
                ].map((m) => (
                  <div key={m.milestone} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${m.status === "done" ? "bg-primary" : m.status === "in-progress" ? "bg-warning" : "bg-muted-foreground"}`} />
                    <div>
                      <p className="text-sm font-medium">{m.milestone}</p>
                      <p className="text-xs text-muted-foreground">{m.note}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
}
