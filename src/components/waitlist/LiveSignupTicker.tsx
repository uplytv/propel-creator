import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

interface RecentSignup {
  name: string;
  time: string;
}

export default function LiveSignupTicker() {
  const [signups, setSignups] = useState<RecentSignup[]>([]);
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    const fetchRecent = async () => {
      const { data } = await supabase
        .from("waitlist" as any)
        .select("full_name, created_at")
        .order("created_at", { ascending: false })
        .limit(10) as any;

      if (data) {
        setSignups(
          data.map((d: any) => {
            const name = d.full_name || "A creator";
            const firstName = name.split(" ")[0];
            const lastInitial = name.split(" ")[1]?.[0] ? ` ${name.split(" ")[1][0]}.` : "";
            const mins = Math.max(1, Math.round((Date.now() - new Date(d.created_at).getTime()) / 60000));
            const time = mins < 60 ? `${mins}m ago` : mins < 1440 ? `${Math.round(mins / 60)}h ago` : `${Math.round(mins / 1440)}d ago`;
            return { name: `${firstName}${lastInitial}`, time };
          })
        );
      }
    };
    fetchRecent();

    // Rotate every 3 seconds
    const interval = setInterval(() => {
      setVisible((v) => v + 1);
    }, 3000);

    // Realtime: add new signups to the front
    const channel = supabase
      .channel("ticker-signups")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "waitlist" }, (payload: any) => {
        const name = payload.new?.full_name || "A creator";
        const firstName = name.split(" ")[0];
        const lastInitial = name.split(" ")[1]?.[0] ? ` ${name.split(" ")[1][0]}.` : "";
        setSignups((prev) => [{ name: `${firstName}${lastInitial}`, time: "just now" }, ...prev.slice(0, 9)]);
      })
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  if (signups.length === 0) return null;

  const current = signups[visible % signups.length];

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/80 border border-border/40 backdrop-blur-sm">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
      </span>
      <AnimatePresence mode="wait">
        <motion.span
          key={visible}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="text-xs text-muted-foreground"
        >
          <span className="font-semibold text-foreground">{current?.name}</span>{" "}
          applied {current?.time}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}
