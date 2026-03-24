import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

interface FeedEvent {
  id: string;
  icon: string;
  title: string;
  detail: string;
  time: string;
  link?: string;
}

export default function LiveActivityFeed({ className }: { className?: string }) {
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const eventIdRef = useRef(0);

  const addEvent = (e: Omit<FeedEvent, "id">) => {
    eventIdRef.current += 1;
    setEvents(prev => [{ ...e, id: `rt-${eventIdRef.current}` }, ...prev].slice(0, 100));
  };

  useEffect(() => {
    const channels = [
      supabase.channel("admin-feed-profiles")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "profiles" },
          (p) => addEvent({
            icon: "👤", title: `${p.new.display_name || "Someone"} joined UPLY`,
            detail: `@${p.new.username || "—"} · ${p.new.creator_type || "User"}`,
            time: p.new.created_at,
          }))
        .subscribe(),

      supabase.channel("admin-feed-spaces")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "creator_spaces" },
          (p) => addEvent({
            icon: "🎨", title: `${p.new.name} created`,
            detail: "New creator space", time: p.new.created_at,
          }))
        .subscribe(),

      supabase.channel("admin-feed-subs")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "member_subscriptions" },
          (p) => addEvent({
            icon: "💰", title: "New subscriber",
            detail: `Tier: ${p.new.tier_id || "—"}`, time: p.new.created_at,
          }))
        .subscribe(),

      supabase.channel("admin-feed-transactions")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "transactions" },
          (p) => addEvent({
            icon: "💸", title: `$${Number(p.new.amount || 0).toFixed(2)} transaction`,
            detail: `Platform: $${Number(p.new.platform_fee_amount || 0).toFixed(2)} · ${p.new.type || ""}`,
            time: p.new.created_at,
          }))
        .subscribe(),

      supabase.channel("admin-feed-waitlist")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "waitlist" },
          (p) => addEvent({
            icon: "📋", title: `${p.new.full_name || "Someone"} applied`,
            detail: `Position #${p.new.position || "—"}${p.new.referred_by ? " · Referred ✓" : " · Organic"}`,
            time: p.new.created_at,
          }))
        .subscribe(),

      supabase.channel("admin-feed-tips")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "tip_transactions" },
          (p) => addEvent({
            icon: "💝", title: `$${p.new.amount} tip`,
            detail: "During live stream", time: p.new.created_at,
          }))
        .subscribe(),

      supabase.channel("admin-feed-tickets")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "tickets" },
          (p) => addEvent({
            icon: "🎫", title: `Ticket sold: $${p.new.amount_paid}`,
            detail: `Creator earned $${p.new.creator_earnings}`, time: p.new.created_at,
          }))
        .subscribe(),

      supabase.channel("admin-feed-streams")
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "mux_live_streams" },
          (p) => {
            if (p.new.status === "active" && p.old?.status !== "active") {
              addEvent({
                icon: "🔴", title: `${p.new.title || "Untitled"} went live`,
                detail: "Creator is streaming", time: new Date().toISOString(),
              });
            }
          })
        .subscribe(),

      supabase.channel("admin-feed-webhook-fail")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "stripe_webhook_log" },
          (p) => {
            if (p.new.status === "failed") {
              addEvent({
                icon: "🚨", title: "Stripe webhook failed",
                detail: `${p.new.event_type || "Unknown"} — ${p.new.error_message || ""}`,
                time: p.new.created_at,
              });
            }
          })
        .subscribe(),
    ];

    return () => channels.forEach(c => supabase.removeChannel(c));
  }, []);

  return (
    <Card className={cn("bg-card border-border", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-75 animate-ping" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
          </span>
          Live Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="max-h-[500px] overflow-y-auto p-0">
        <AnimatePresence initial={false}>
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8 px-4">
              Waiting for activity...
            </p>
          ) : (
            events.map(e => (
              <motion.div
                key={e.id}
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="flex items-start gap-2.5 px-4 py-2.5 border-b border-border/50 last:border-0"
              >
                <span className="text-base shrink-0 mt-0.5">{e.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{e.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{e.detail}</p>
                  <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                    {formatDistanceToNow(new Date(e.time), { addSuffix: true })}
                  </p>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
