import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Search } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const EXPECTED_FEE_PCT = 5;

export default function AdminEventFees() {
  const [search, setSearch] = useState("");
  const [onlyMismatches, setOnlyMismatches] = useState(false);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["admin-event-fees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, title, status, platform_fee_pct, created_at, creator_id")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
  });

  const { filtered, mismatchCount } = useMemo(() => {
    const q = search.trim().toLowerCase();
    const mismatches = events.filter(
      (e: any) => Number(e.platform_fee_pct) !== EXPECTED_FEE_PCT,
    );
    const base = onlyMismatches ? mismatches : events;
    const filtered = q
      ? base.filter((e: any) =>
          (e.title || "").toLowerCase().includes(q) ||
          (e.id || "").toLowerCase().includes(q),
        )
      : base;
    return { filtered, mismatchCount: mismatches.length };
  }, [events, search, onlyMismatches]);

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-6 max-w-6xl mobile-safe-content">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Event Platform Fees</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Expected default: <span className="text-primary font-medium">{EXPECTED_FEE_PCT}%</span>.
            Any event with a different value is flagged.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4">
            <div className="text-xs text-muted-foreground">Total events</div>
            <div className="text-2xl font-bold mt-1">{events.length}</div>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4">
            <div className="text-xs text-muted-foreground">At default ({EXPECTED_FEE_PCT}%)</div>
            <div className="text-2xl font-bold mt-1 text-primary">
              {events.length - mismatchCount}
            </div>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4">
            <div className="text-xs text-muted-foreground">Mismatches</div>
            <div className="text-2xl font-bold mt-1 text-destructive">{mismatchCount}</div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by title or event ID"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-11"
            />
          </div>
          <button
            onClick={() => setOnlyMismatches((v) => !v)}
            className={`h-11 px-4 rounded-md border text-sm font-medium transition-colors ${
              onlyMismatches
                ? "bg-destructive/15 border-destructive/40 text-destructive"
                : "bg-white/[0.03] border-white/10 text-muted-foreground hover:text-foreground"
            }`}
          >
            {onlyMismatches ? "Showing mismatches only" : "Show mismatches only"}
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-muted-foreground py-12 text-sm">
            No events match the current filters.
          </div>
        ) : (
          <div className="rounded-xl border border-white/5 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-white/[0.03] text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Event</th>
                  <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Status</th>
                  <th className="text-right px-4 py-3 font-medium">Fee %</th>
                  <th className="text-right px-4 py-3 font-medium">Check</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e: any) => {
                  const fee = Number(e.platform_fee_pct);
                  const ok = fee === EXPECTED_FEE_PCT;
                  return (
                    <tr key={e.id} className="border-t border-white/5">
                      <td className="px-4 py-3">
                        <div className="font-medium truncate max-w-[260px]">
                          {e.title || "Untitled"}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono truncate max-w-[260px]">
                          {e.id}
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <Badge variant="outline" className="text-xs border-white/10">
                          {e.status || "—"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {Number.isFinite(fee) ? `${fee}%` : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {ok ? (
                          <span className="inline-flex items-center gap-1 text-primary text-xs">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Default
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-destructive text-xs">
                            <AlertTriangle className="h-3.5 w-3.5" /> Mismatch
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
