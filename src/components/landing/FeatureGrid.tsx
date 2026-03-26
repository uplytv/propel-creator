import { motion } from "framer-motion";
import { Radio, BookOpen, Calendar, MessageSquare, ShoppingBag, Users, TrendingUp, Zap } from "lucide-react";

const features = [
  { icon: Radio, title: "Go Live", desc: "Stream directly to your community. Tips, reactions, and live shopping built in.", color: "hsl(var(--destructive))" },
  { icon: BookOpen, title: "Courses", desc: "Build and sell courses with modules, lessons, and progress tracking.", color: "hsl(220 90% 56%)" },
  { icon: Calendar, title: "Events & Ticketing", desc: "Host paid virtual or in-person events with QR check-in.", color: "hsl(var(--warning))" },
  { icon: MessageSquare, title: "Paid DMs", desc: "Monetize your inbox. Fans pay to message you directly.", color: "hsl(258 90% 66%)" },
  { icon: ShoppingBag, title: "Live Shopping", desc: "Sell products mid-stream. Auctions, giveaways, and instant checkout.", color: "#EC4899" },
  { icon: Users, title: "Community", desc: "Posts, comments, leaderboards, and member tiers — all in your space.", color: "hsl(var(--primary))" },
  { icon: TrendingUp, title: "Analytics & ARIA", desc: "AI-powered growth insights and weekly performance reports.", color: "#06B6D4" },
  { icon: Zap, title: "Affiliate System", desc: "Let your members earn by referring new subscribers.", color: "#EAB308" },
  { icon: Users, title: "AI Creator Team", desc: "🤖 5 autonomous agents running your business 24/7.", color: "hsl(258 90% 66%)" },
];

export default function FeatureGrid() {
  return (
    <section className="py-16 md:py-24 relative">
      <div className="container relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
          className="text-center mb-12"
        >
          <h2 className="text-2xl md:text-4xl font-bold mb-3 font-heading">
            Everything you need. Nothing you don't.
          </h2>
          <p className="text-white/40 text-sm md:text-base max-w-lg mx-auto">
            One platform. Every revenue stream. No duct-taping 6 different tools together.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 max-w-4xl mx-auto">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06, duration: 0.5 }}
              whileHover={{ y: -4, transition: { duration: 0.25 } }}
              className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 md:p-5 group hover:border-white/[0.15] transition-colors"
            >
              <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: `${f.color}15` }}>
                <f.icon className="w-4.5 h-4.5" style={{ color: f.color }} />
              </div>
              <h3 className="font-bold text-white text-sm mb-1.5">{f.title}</h3>
              <p className="text-xs text-white/35 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
