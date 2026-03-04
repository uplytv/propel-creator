import { motion } from "framer-motion";
import { Brain, Users, User, Box, Check, ArrowRight, Zap, Shield, TrendingUp, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const features = [
  { icon: Brain, title: "AI Growth Partner", desc: "Your always-on strategist that learns your business and delivers personalized growth plans." },
  { icon: User, title: "Tiered Human Support", desc: "As you grow, unlock a dedicated success rep invested in your results." },
  { icon: Users, title: "Built-in Community", desc: "Premium community tools designed for engagement and retention." },
  { icon: Box, title: "Sell Anything Digital", desc: "Courses, memberships, coaching, downloads — all in one place." },
];

const tiers = [
  { name: "Starter", range: "0–100 members", features: ["AI Growth Partner", "Community tools", "Basic analytics", "Email support"], glow: false },
  { name: "Rising", range: "100–500 members", features: ["Everything in Starter", "Advanced analytics", "Priority AI insights", "Template library"], glow: false },
  { name: "Scaling", range: "500–2K members", features: ["Everything in Rising", "Dedicated success rep", "Custom growth plan", "Revenue optimization"], glow: true },
  { name: "Elite", range: "2K+ members", features: ["Everything in Scaling", "Executive strategy calls", "Co-marketing opportunities", "Direct Slack channel"], glow: true },
];

const pricing = [
  { name: "Free", price: "0", period: "forever", fee: "5% transaction fee", features: ["AI Growth Partner", "Community tools", "Up to 100 members", "Basic analytics"] },
  { name: "Pro", price: "49", period: "/month", fee: "2% transaction fee", features: ["Everything in Free", "Unlimited members", "Advanced analytics", "Priority support"], popular: true },
  { name: "Scale", price: "99", period: "/month", fee: "0% transaction fee", features: ["Everything in Pro", "Dedicated success rep", "Custom integrations", "White-label options"] },
];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.5 } } };

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          <span className="text-xl font-bold tracking-tight text-foreground">PLATFORM</span>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#tiers" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Tiers</a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/onboarding")}>Log in</Button>
            <Button variant="default" size="sm" onClick={() => navigate("/onboarding")}>Start Free</Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 md:pt-44 md:pb-32">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="max-w-3xl mx-auto text-center"
          >
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6">
              The only creator platform that{" "}
              <span className="text-gradient">grows with you.</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-xl mx-auto">
              AI gets you started. Our team helps you scale.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="hero" size="xl" onClick={() => navigate("/onboarding")}>
                Start Free <ArrowRight className="ml-1" />
              </Button>
              <Button variant="hero-outline" size="xl" onClick={() => {
                document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
              }}>
                See How It Works
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Feature Cards */}
      <section id="features" className="pb-20 md:pb-32">
        <div className="container">
          <div className="flex gap-4 overflow-x-auto pb-4 md:grid md:grid-cols-4 md:overflow-visible scrollbar-none">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="glass-card-hover p-6 min-w-[260px] md:min-w-0"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-bold text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-12 border-y border-border/50">
        <div className="container">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center text-muted-foreground text-lg"
          >
            Join <span className="text-foreground font-bold">10,000+</span> creators already growing on <span className="text-foreground font-bold">PLATFORM</span>
          </motion.p>
        </div>
      </section>

      {/* Tier Preview */}
      <section id="tiers" className="py-20 md:py-32">
        <div className="container">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Grow your way. We'll grow with you.</h2>
            <p className="text-muted-foreground text-lg">Every tier unlocks more support, more tools, more investment in your success.</p>
          </motion.div>
          <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {tiers.map((t, i) => (
              <motion.div
                key={t.name}
                variants={item}
                className={`glass-card p-6 ${t.glow ? "glow-border animate-pulse-glow" : ""}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Star className={`w-4 h-4 ${t.glow ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Tier {i + 1}</span>
                </div>
                <h3 className="text-xl font-bold mb-1">{t.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{t.range}</p>
                <ul className="space-y-2">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">{f}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 md:py-32">
        <div className="container">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple, transparent pricing</h2>
            <p className="text-muted-foreground text-lg">Start free. Upgrade when you're ready.</p>
          </motion.div>
          <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {pricing.map((p) => (
              <motion.div
                key={p.name}
                variants={item}
                className={`glass-card p-8 relative ${p.popular ? "glow-border" : ""}`}
              >
                {p.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                )}
                <h3 className="text-lg font-bold mb-2">{p.name}</h3>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-4xl font-extrabold">${p.price}</span>
                  <span className="text-muted-foreground text-sm">{p.period}</span>
                </div>
                <p className="text-sm text-primary font-medium mb-6">{p.fee}</p>
                <ul className="space-y-3 mb-8">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">{f}</span>
                    </li>
                  ))}
                </ul>
                <Button variant={p.popular ? "hero" : "outline"} className="w-full" onClick={() => navigate("/onboarding")}>
                  Get Started
                </Button>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-12">
        <div className="container">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
              <span className="text-xl font-bold">PLATFORM</span>
              <p className="text-sm text-muted-foreground mt-1">Built for creators who are serious about growth.</p>
            </div>
            <div className="flex gap-8 text-sm text-muted-foreground">
              <a href="#features" className="hover:text-foreground transition-colors">Features</a>
              <a href="#tiers" className="hover:text-foreground transition-colors">Tiers</a>
              <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
