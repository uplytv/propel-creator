import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Copy, Check, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

interface PromoRow {
  id: string;
  code: string;
  event_id: string;
  eventTitle: string;
  link: string;
  tickets: number;
  cents: number;
  settledCents: number;
}

/**
 * Promoter-side view of the Event Promoter Kit: if this user has been added
 * as a promoter for any event, show their tracked links, attributed sales,
 * and commission already settled to their UPLY wallet. Self-hides when the
 * user promotes no events.
 */
export default function EventPromoCard() {
  const { user } = useAuth();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: rows } = useQuery({
    queryKey: ["my-event-promos", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<PromoRow[]> => {
      const { data: promoters } = await (supabase as any) // cast: awaiting types regen (event_promoters)
        .from("event_promoters")
        .select("id, code, event_id")
        .eq("promoter_user_id", user!.id);
      const list = (promoters ?? []) as Array<{ id: string; code: string; event_id: string }>;
      if (!list.length) return [];

      const eventIds = [...new Set(list.map((p) => p.event_id))];
      const { data: events } = await supabase
        .from("events")
        .select("id, title, slug")
        .in("id", eventIds);
      const eventById = Object.fromEntries(((events ?? []) as any[]).map((e) => [e.id, e]));

      const { data: sales } = await (supabase as any) // cast: awaiting types regen (event_promoter_sales)
        .from("event_promoter_sales")
        .select("promoter_id, amount_cents, tickets_count")
        .in("promoter_id", list.map((p) => p.id));
      const agg: Record<string, { tickets: number; cents: number }> = {};
      for (const s of (sales ?? []) as any[]) {
        const a = (agg[s.promoter_id] ??= { tickets: 0, cents: 0 });
        a.tickets += s.tickets_count ?? 0;
        a.cents += s.amount_cents ?? 0;
      }

      // Commission already settled to this promoter's UPLY wallet
      const { data: settlements } = await (supabase as any) // cast: awaiting types regen (promoter_settlements)
        .from("promoter_settlements")
        .select("promoter_id, amount_cents")
        .in("promoter_id", list.map((p) => p.id));
      const settledAgg: Record<string, number> = {};
      for (const s of (settlements ?? []) as any[]) {
        settledAgg[s.promoter_id] = (settledAgg[s.promoter_id] ?? 0) + (s.amount_cents ?? 0);
      }

      return list.map((p) => {
        const ev = eventById[p.event_id];
        return {
          id: p.id,
          code: p.code,
          event_id: p.event_id,
          eventTitle: ev?.title ?? "Event",
          link: `${window.location.origin}/events/${ev?.slug || p.event_id}?promo=${encodeURIComponent(p.code)}`,
          tickets: agg[p.id]?.tickets ?? 0,
          cents: agg[p.id]?.cents ?? 0,
          settledCents: settledAgg[p.id] ?? 0,
        };
      });
    },
  });

  if (!rows?.length) return null;

  const copy = async (row: PromoRow) => {
    try {
      await navigator.clipboard.writeText(row.link);
      setCopiedId(row.id);
      toast.success("Promo link copied");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("Couldn't copy link");
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5">
      <div className="flex items-center gap-2 mb-1">
        <Megaphone className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold">Event promo</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        You're promoting {rows.length === 1 ? "an event" : `${rows.length} events`}. UPLY tracks your attributed
        sales — commission the organizer settles lands in your UPLY wallet; otherwise they pay you directly.
      </p>
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.id} className="rounded-lg border border-border bg-secondary/30 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{row.eventTitle}</p>
                <p className="text-xs text-muted-foreground">
                  {row.tickets} ticket{row.tickets === 1 ? "" : "s"} · ${(row.cents / 100).toFixed(2)} attributed
                  {row.settledCents > 0 && (
                    <span className="text-primary"> · ${(row.settledCents / 100).toFixed(2)} settled to your wallet</span>
                  )}
                </p>
                <p className="text-[11px] font-mono text-muted-foreground truncate mt-1">{row.link}</p>
              </div>
              <Button variant="outline" size="sm" className="shrink-0 gap-1.5" onClick={() => copy(row)}>
                {copiedId === row.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                Copy
              </Button>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
