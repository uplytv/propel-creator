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

interface Row {
  id: string;
  stream_id: string;
  featured_at: string;
  expires_at: string;
  dismissed_at: string | null;
  purchased_at: string | null;
}

interface Props {
  rows: Row[];
}

const tooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
};

export default function TVAuditAnalytics({ rows }: Props) {
  const [windowDays, setWindowDays] = useState<30 | 90>(30);

  const since = useMemo(
    () => startOfDay(subDays(new Date(), windowDays - 1)).getTime(),
    [windowDays],
  );

  const scoped = useMemo(
    () => rows.filter((r) => new Date(r.featured_at).getTime() >= since),
    [rows, since],
  );

  // Daily activation / dismissal series
  const dailySeries = useMemo(() => {
    const buckets = new Map<string, { date: string; activated: number; dismissed: number; purchased: number }>();
    for (let i = windowDays - 1; i >= 0; i--) {
      const d = startOfDay(subDays(new Date(), i));
      const key = format(d, "yyyy-MM-dd");
      buckets.set(key, { date: format(d, windowDays > 30 ? "MMM d" : "MMM d"), activated: 0, dismissed: 0, purchased: 0 });
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

  // Rate metrics
  const rates = useMemo(() => {
    const total = scoped.length || 1;
    const dismissed = scoped.filter((r) => r.dismissed_at).length;
    const purchased = scoped.filter((r) => r.purchased_at).length;
    const expired = scoped.filter(
      (r) => !r.dismissed_at && !r.purchased_at && new Date(r.expires_at) < new Date(),
    ).length;
    const active = scoped.filter(
      (r) => !r.dismissed_at && !r.purchased_at && new Date(r.expires_at) >= new Date(),
    ).length;
    return {
      total: scoped.length,
      activationPerDay: (scoped.length / windowDays).toFixed(1),
      dismissalRate: ((dismissed / total) * 100).toFixed(1),
      purchaseRate: ((purchased / total) * 100).toFixed(1),
      expiredRate: ((expired / total) * 100).toFixed(1),
      active,
    };
  }, [scoped, windowDays]);

  // Top streams by activation
  const byStream = useMemo(() => {
    const map = new Map<string, { stream: string; activated: number; dismissed: number; expired: number; purchased: number }>();
    for (const r of scoped) {
      const key = r.stream_id;
      const e = map.get(key) || { stream: key.slice(0, 8) + "…", activated: 0, dismissed: 0, expired: 0, purchased: 0 };
      e.activated++;
      if (r.purchased_at) e.purchased++;
      else if (r.dismissed_at) e.dismissed++;
      else if (new Date(r.expires_at) < new Date()) e.expired++;
      map.set(key, e);
    }
    return Array.from(map.values()).sort((a, b) => b.activated - a.activated).slice(0, 10);
  }, [scoped]);

  // Expiration TTL distribution (minutes between featured_at and expires_at OR dismissed_at)
  const ttlDist = useMemo(() => {
    const buckets = [
      { range: "<5m", min: 0, max: 5, count: 0 },
      { range: "5–15m", min: 5, max: 15, count: 0 },
      { range: "15–30m", min: 15, max: 30, count: 0 },
      { range: "30–60m", min: 30, max: 60, count: 0 },
      { range: ">60m", min: 60, max: Infinity, count: 0 },
    ];
    for (const r of scoped) {
      const end = r.dismissed_at
        ? new Date(r.dismissed_at).getTime()
        : Math.min(new Date(r.expires_at).getTime(), Date.now());
      const mins = Math.max(0, (end - new Date(r.featured_at).getTime()) / 60000);
      const b = buckets.find((x) => mins >= x.min && mins < x.max);
      if (b) b.count++;
    }
    return buckets;
  }, [scoped]);

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
          Daily activations vs dismissals vs purchases
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={dailySeries}>
            <defs>
              <linearGradient id="actArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00FF85" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#00FF85" stopOpacity={0} />
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
            <Area type="monotone" dataKey="activated" stroke="#00FF85" fill="url(#actArea)" strokeWidth={2} />
            <Area type="monotone" dataKey="dismissed" stroke="hsl(var(--muted-foreground))" fill="url(#disArea)" strokeWidth={2} />
            <Area type="monotone" dataKey="purchased" stroke="#facc15" fill="transparent" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-xs font-medium text-muted-foreground mb-3">Top streams (by activations)</h3>
          {byStream.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">No data in this window.</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={byStream} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis dataKey="stream" type="category" width={70} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="purchased" stackId="a" fill="#facc15" />
                <Bar dataKey="dismissed" stackId="a" fill="hsl(var(--muted-foreground))" />
                <Bar dataKey="expired" stackId="a" fill="#f97316" />
                <Bar dataKey="activated" stackId="a" fill="#00FF85" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-xs font-medium text-muted-foreground mb-3">Time-to-resolution distribution</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={ttlDist}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="range" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={28} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" fill="#00FF85" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
