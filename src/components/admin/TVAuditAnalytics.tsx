import { useMemo, useState } from "react";
import { format, subDays, startOfDay } from "date-fns";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface Row {
  id: string;
  stream_id: string;
  featured_at: string;
  expires_at: string;
  dismissed_at: string | null;
  purchased_at: string | null;
  amount_cents?: number | null;
}

interface Props {
  rows: Row[];
  streamMeta?: Map<string, { title: string; channel: string }>;
}

const tooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
};

type Drill =
  | { type: "day"; dateKey: string; label: string }
  | { type: "stream"; streamId: string }
  | { type: "ttl"; range: string; min: number; max: number }
  | null;

export default function TVAuditAnalytics({ rows, streamMeta }: Props) {
  const labelFor = (id: string) => streamMeta?.get(id);
  const [windowDays, setWindowDays] = useState<30 | 90>(30);
  const [drill, setDrill] = useState<Drill>(null);

  const since = useMemo(
    () => startOfDay(subDays(new Date(), windowDays - 1)).getTime(),
    [windowDays],
  );

  const scoped = useMemo(
    () => rows.filter((r) => new Date(r.featured_at).getTime() >= since),
    [rows, since],
  );

  const dailySeries = useMemo(() => {
    const buckets = new Map<string, { dateKey: string; date: string; activated: number; dismissed: number; purchased: number }>();
    for (let i = windowDays - 1; i >= 0; i--) {
      const d = startOfDay(subDays(new Date(), i));
      const key = format(d, "yyyy-MM-dd");
      buckets.set(key, { dateKey: key, date: format(d, "MMM d"), activated: 0, dismissed: 0, purchased: 0 });
    }
    for (const r of scoped) {
      const k = format(startOfDay(new Date(r.featured_at)), "yyyy-MM-dd");
      const b = buckets.get(k);
      if (b) b.activated++;
      if (r.dismissed_at) {
        const dk = format(startOfDay(new Date(r.dismissed_at)), "yyyy-MM-dd");
        const db = buckets.get(dk);
        if (db) db.dismissed++;
      }
      if (r.purchased_at) {
        const pk = format(startOfDay(new Date(r.purchased_at)), "yyyy-MM-dd");
        const pb = buckets.get(pk);
        if (pb) pb.purchased++;
      }
    }
    return Array.from(buckets.values());
  }, [scoped, windowDays]);

  const rates = useMemo(() => {
    const total = scoped.length || 1;
    const dismissed = scoped.filter((r) => r.dismissed_at).length;
    const purchased = scoped.filter((r) => r.purchased_at).length;
    const expired = scoped.filter(
      (r) => !r.dismissed_at && !r.purchased_at && new Date(r.expires_at) < new Date(),
    ).length;
    return {
      total: scoped.length,
      activationPerDay: (scoped.length / windowDays).toFixed(1),
      dismissalRate: ((dismissed / total) * 100).toFixed(1),
      purchaseRate: ((purchased / total) * 100).toFixed(1),
      expiredRate: ((expired / total) * 100).toFixed(1),
    };
  }, [scoped, windowDays]);

  const byStream = useMemo(() => {
    const map = new Map<string, { streamId: string; stream: string; activated: number; active: number; dismissed: number; expired: number; purchased: number }>();
    for (const r of scoped) {
      const key = r.stream_id;
      const meta = labelFor(key);
      const fallback = key.slice(0, 8) + "…";
      const stream = meta ? (meta.title.length > 18 ? meta.title.slice(0, 16) + "…" : meta.title) : fallback;
      const e = map.get(key) || { streamId: key, stream, activated: 0, active: 0, dismissed: 0, expired: 0, purchased: 0 };
      e.activated++;
      if (r.purchased_at) e.purchased++;
      else if (r.dismissed_at) e.dismissed++;
      else if (new Date(r.expires_at) < new Date()) e.expired++;
      else e.active++;
      map.set(key, e);
    }
    return Array.from(map.values()).sort((a, b) => b.activated - a.activated).slice(0, 10);
  }, [scoped, streamMeta]);

  const ttlDist = useMemo(() => {
    const buckets = [
      { range: "<5m", min: 0, max: 5, count: 0 },
      { range: "5–15m", min: 5, max: 15, count: 0 },
      { range: "15–30m", min: 15, max: 30, count: 0 },
      { range: "30–60m", min: 30, max: 60, count: 0 },
      { range: ">60m", min: 60, max: Infinity, count: 0 },
    ];
    const now = Date.now();
    for (const r of scoped) {
      // Skip rows still active (not yet resolved by dismissal, purchase, or expiry)
      const isActive = !r.dismissed_at && !r.purchased_at && new Date(r.expires_at).getTime() > now;
      if (isActive) continue;
      const end = r.purchased_at
        ? new Date(r.purchased_at).getTime()
        : r.dismissed_at
        ? new Date(r.dismissed_at).getTime()
        : new Date(r.expires_at).getTime();
      const mins = Math.max(0, (end - new Date(r.featured_at).getTime()) / 60000);
      const b = buckets.find((x) => mins >= x.min && mins < x.max);
      if (b) b.count++;
    }
    return buckets;
  }, [scoped]);

  // Filter scoped rows according to current drill
  const drillRows = useMemo(() => {
    if (!drill) return [];
    if (drill.type === "day") {
      return scoped.filter((r) => {
        const fk = format(startOfDay(new Date(r.featured_at)), "yyyy-MM-dd") === drill.dateKey;
        const dk = r.dismissed_at && format(startOfDay(new Date(r.dismissed_at)), "yyyy-MM-dd") === drill.dateKey;
        const pk = r.purchased_at && format(startOfDay(new Date(r.purchased_at)), "yyyy-MM-dd") === drill.dateKey;
        return fk || dk || pk;
      });
    }
    if (drill.type === "stream") {
      return scoped.filter((r) => r.stream_id === drill.streamId);
    }
    // ttl
    return scoped.filter((r) => {
      const end = r.dismissed_at
        ? new Date(r.dismissed_at).getTime()
        : Math.min(new Date(r.expires_at).getTime(), Date.now());
      const mins = Math.max(0, (end - new Date(r.featured_at).getTime()) / 60000);
      return mins >= drill.min && mins < drill.max;
    });
  }, [drill, scoped]);

  // Per-stream aggregation for the drilldown table
  const drillByStream = useMemo(() => {
    const map = new Map<string, { streamId: string; activated: number; dismissed: number; expired: number; purchased: number; revenueCents: number }>();
    for (const r of drillRows) {
      const e = map.get(r.stream_id) || { streamId: r.stream_id, activated: 0, dismissed: 0, expired: 0, purchased: 0, revenueCents: 0 };
      e.activated++;
      if (r.purchased_at) {
        e.purchased++;
        e.revenueCents += r.amount_cents || 0;
      } else if (r.dismissed_at) e.dismissed++;
      else if (new Date(r.expires_at) < new Date()) e.expired++;
      map.set(r.stream_id, e);
    }
    return Array.from(map.values()).sort((a, b) => b.activated - a.activated);
  }, [drillRows]);

  const drillTitle = !drill
    ? ""
    : drill.type === "day"
    ? `Day · ${drill.label}`
    : drill.type === "stream"
    ? `Stream · ${labelFor(drill.streamId)?.title || drill.streamId.slice(0, 8) + "…"}`
    : `Time-to-resolution · ${drill.range}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold">Analytics</h2>
        <div className="flex gap-1">
          {[30, 90].map((d) => (
            <Button
              key={d}
              size="sm"
              variant={windowDays === d ? "default" : "outline"}
              onClick={() => setWindowDays(d as 30 | 90)}
              className="h-8"
            >
              Last {d}d
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Activations", value: rates.total },
          { label: "Avg / day", value: rates.activationPerDay },
          { label: "Dismissal rate", value: `${rates.dismissalRate}%` },
          { label: "Purchase rate", value: `${rates.purchaseRate}%` },
          { label: "Expired rate", value: `${rates.expiredRate}%` },
        ].map((s) => (
          <div key={s.label} className="p-3 rounded-xl border border-border bg-card">
            <div className="text-[11px] text-muted-foreground">{s.label}</div>
            <div className="text-xl font-bold mt-1">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-xs font-medium text-muted-foreground mb-3">
          Daily activations vs dismissals vs purchases <span className="text-[10px]">(click a day)</span>
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart
            data={dailySeries}
            onClick={(e: any) => {
              const p = e?.activePayload?.[0]?.payload;
              if (p?.dateKey) setDrill({ type: "day", dateKey: p.dateKey, label: p.date });
            }}
          >
            <defs>
              <linearGradient id="actArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3D7CFF" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#3D7CFF" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="disArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={28} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Area type="monotone" dataKey="activated" stroke="#3D7CFF" fill="url(#actArea)" strokeWidth={2} style={{ cursor: "pointer" }} />
            <Area type="monotone" dataKey="dismissed" stroke="hsl(var(--muted-foreground))" fill="url(#disArea)" strokeWidth={2} />
            <Area type="monotone" dataKey="purchased" stroke="#facc15" fill="transparent" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-xs font-medium text-muted-foreground mb-3">
            Top streams (by activations) <span className="text-[10px]">(click a bar)</span>
          </h3>
          {byStream.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">No data in this window.</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={byStream}
                layout="vertical"
                margin={{ left: 10 }}
                onClick={(e: any) => {
                  const p = e?.activePayload?.[0]?.payload;
                  if (p?.streamId) setDrill({ type: "stream", streamId: p.streamId });
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis dataKey="stream" type="category" width={70} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="purchased" stackId="a" fill="#facc15" style={{ cursor: "pointer" }} />
                <Bar dataKey="dismissed" stackId="a" fill="hsl(var(--muted-foreground))" style={{ cursor: "pointer" }} />
                <Bar dataKey="expired" stackId="a" fill="#f97316" style={{ cursor: "pointer" }} />
                <Bar dataKey="active" stackId="a" fill="#3D7CFF" style={{ cursor: "pointer" }} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-xs font-medium text-muted-foreground mb-3">
            Time-to-resolution distribution <span className="text-[10px]">(click a bucket)</span>
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={ttlDist}
              onClick={(e: any) => {
                const p = e?.activePayload?.[0]?.payload;
                if (p?.range) setDrill({ type: "ttl", range: p.range, min: p.min, max: p.max });
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="range" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={28} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" fill="#3D7CFF" radius={[6, 6, 0, 0]} style={{ cursor: "pointer" }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <Dialog open={!!drill} onOpenChange={(o) => !o && setDrill(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Drilldown — {drillTitle}</DialogTitle>
            <DialogDescription>
              Per-stream breakdown of {drillRows.length} TV feature{drillRows.length === 1 ? "" : "s"} in this slice.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase text-muted-foreground sticky top-0">
                <tr>
                  <th className="text-left p-2">Stream</th>
                  <th className="text-right p-2">Activations</th>
                  <th className="text-right p-2">Dismissals</th>
                  <th className="text-right p-2">Expirations</th>
                  <th className="text-right p-2">Purchases</th>
                  <th className="text-right p-2">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {drillByStream.length === 0 && (
                  <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No rows.</td></tr>
                )}
                {drillByStream.map((s) => {
                  const meta = labelFor(s.streamId);
                  return (
                  <tr key={s.streamId} className="border-t border-border hover:bg-muted/20">
                    <td className="p-2">
                      <button
                        onClick={() => setDrill({ type: "stream", streamId: s.streamId })}
                        className="text-left hover:text-primary underline-offset-2 hover:underline"
                      >
                        <div className="text-sm font-medium truncate max-w-[260px]">
                          {meta?.title || "Untitled stream"}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate max-w-[260px]">
                          {meta?.channel ? `${meta.channel} · ` : ""}
                          <span className="font-mono">{s.streamId.slice(0, 12)}…</span>
                        </div>
                      </button>
                    </td>
                    <td className="p-2 text-right">{s.activated}</td>
                    <td className="p-2 text-right text-muted-foreground">{s.dismissed}</td>
                    <td className="p-2 text-right text-orange-400">{s.expired}</td>
                    <td className="p-2 text-right text-yellow-400">{s.purchased}</td>
                    <td className="p-2 text-right">${(s.revenueCents / 100).toFixed(2)}</td>
                  </tr>
                  );
                })}
              </tbody>
              {drillByStream.length > 0 && (
                <tfoot className="bg-muted/20 text-xs">
                  <tr className="border-t border-border font-semibold">
                    <td className="p-2">Total</td>
                    <td className="p-2 text-right">{drillByStream.reduce((a, b) => a + b.activated, 0)}</td>
                    <td className="p-2 text-right">{drillByStream.reduce((a, b) => a + b.dismissed, 0)}</td>
                    <td className="p-2 text-right">{drillByStream.reduce((a, b) => a + b.expired, 0)}</td>
                    <td className="p-2 text-right">{drillByStream.reduce((a, b) => a + b.purchased, 0)}</td>
                    <td className="p-2 text-right">
                      ${(drillByStream.reduce((a, b) => a + b.revenueCents, 0) / 100).toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
