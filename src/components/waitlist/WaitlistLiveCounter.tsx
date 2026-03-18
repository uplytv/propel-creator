import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

export default function WaitlistLiveCounter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const fetchCount = async () => {
      const { count: total } = await supabase
        .from("waitlist" as any)
        .select("*", { count: "exact", head: true });
      if (total !== null) setCount(total);
    };
    fetchCount();

    const channel = supabase
      .channel("waitlist-count")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "waitlist" },
        () => setCount((c) => c + 1)
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.3, duration: 0.5 }}
      className="inline-flex items-center gap-2.5 bg-card border border-border/60 rounded-full px-5 py-2.5 shadow-sm"
    >
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
      </span>
      <span className="text-sm font-semibold text-foreground">{count.toLocaleString()}</span>
      <span className="text-sm text-muted-foreground">creators have applied</span>
    </motion.div>
  );
}
