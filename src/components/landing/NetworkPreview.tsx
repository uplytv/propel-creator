import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface Stats {
  streams: number;
  creators: number;
  channels: number;
}

export default function NetworkPreview() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    Promise.all([
      supabase.from("mux_live_streams").select("id", { count: "exact", head: true }),
      supabase.from("profiles").select("id", { count: "exact", head: true }).not("creator_type", "is", null),
      supabase.from("uply_channels").select("id", { count: "exact", head: true }).eq("is_active", true),
    ]).then(([streams, creators, channels]) => {
      setStats({
        streams: Math.max(streams.count || 0, 1),
        creators: Math.max(creators.count || 0, 10),
        channels: Math.max(channels.count || 0, 4),
      });
    });
  }, []);

  const statCards = [
    { value: stats?.streams, label: "streams", sub: "and counting" },
    { value: stats?.creators, label: "creators", sub: "building on UPLY" },
    { value: stats?.channels, label: "channels", sub: "and growing" },
  ];

  const features = [
    { icon: "🔴", title: "Live Programming", desc: "Creators publish weekly schedules. Members build viewing habits. Appointment television owned by creators." },
    { icon: "📡", title: "Your Own Channel", desc: "UPLY Fitness. UPLY Finance. UPLY Gaming. Get discovered by people who love your niche. Your channel. Your audience. Your income." },
    { icon: "🏆", title: "Network Events", desc: "UPLY Games at 5M — $10K cash plus Rolex. UPLY Awards at 10M — supercar of your choice. The prizes that make headlines." },
  ];

  return (
    <section className="py-12 border-t border-border border-b" style={{ background: "hsl(var(--background))" }}>
      <div className="container max-w-2xl mx-auto text-center space-y-8 px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
          <h2 className="text-[28px] font-extrabold text-foreground font-heading mb-2">UPLY is a Network</h2>
          <p className="text-[15px] text-muted-foreground max-w-[400px] mx-auto leading-relaxed">
            Every creator is a channel. Every stream is programming. You keep 95% of everything.
          </p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {statCards.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="rounded-lg border border-border p-4 text-center"
              style={{ background: "hsl(var(--card))" }}
            >
              {stats ? (
                <>
                  <p className="text-2xl font-bold text-primary font-heading">{s.value}</p>
                  <p className="text-[12px] text-muted-foreground">{s.sub}</p>
                </>
              ) : (
                <div className="h-10 rounded" style={{
                  background: "linear-gradient(90deg, hsl(var(--muted)) 0%, hsl(var(--muted)/0.5) 50%, hsl(var(--muted)) 100%)",
                  backgroundSize: "200% 100%",
                  animation: "shimmer 1.5s linear infinite",
                }} />
              )}
            </motion.div>
          ))}
        </div>

        {/* Features */}
        <div className="space-y-0">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              className="py-5 text-left"
              style={{ borderTop: i > 0 ? "1px solid hsl(var(--border))" : "none" }}
            >
              <p className="text-sm font-bold text-foreground font-heading mb-1">{f.icon} {f.title}</p>
              <p className="text-[13px] text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>

        <Button
          className="w-full h-12 bg-primary text-primary-foreground font-bold text-base"
          onClick={() => document.getElementById("waitlist")?.scrollIntoView({ behavior: "smooth" })}
        >
          Apply for Early Access
        </Button>
      </div>
    </section>
  );
}
