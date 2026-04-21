import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Rocket, MousePointerClick, Percent, Download, HelpCircle } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  useBoostToastEvents,
  useBoostRoutesList,
  type BoostStateFilter,
  type BoostRangeKey,
} from "@/hooks/useBoostToastEvents";

const RANGES: { label: string; value: BoostRangeKey }[] = [
  { label: "24h", value: "24h" },
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" },
  { label: "90d", value: "90d" },
];

function formatBucket(iso: string, range: BoostRangeKey) {
  const d = new Date(iso);
  if (range === "24h") {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Rocket;
  label: string;
  value: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-semibold">{value}</p>
        </div>
      </div>
    </Card>
  );
}

export default function BoostToastTab() {
  const [range, setRange] = useState<BoostRangeKey>("7d");
  const [state, setState] = useState<BoostStateFilter>("all");
  const [route, setRoute] = useState<string>("all");
  const [sampleOpen, setSampleOpen] = useState(false);
  const [csvSampleOpen, setCsvSampleOpen] = useState(false);
  const [csvSampleGeneratedAt, setCsvSampleGeneratedAt] = useState<string>("");

  const routesQuery = useBoostRoutesList(range);
  const eventsQuery = useBoostToastEvents({ range, state, route });

  const chartData = useMemo(
    () =>
      (eventsQuery.data?.series ?? []).map((b) => ({
        ...b,
        label: formatBucket(b.bucket, range),
      })),
    [eventsQuery.data, range],
  );

  const totals = eventsQuery.data?.totals;
  const routes = eventsQuery.data?.routes ?? [];

  const handleExportCsv = () => {
    const series = eventsQuery.data?.series ?? [];
    const rows: string[] = [];
    const escape = (v: string | number) => {
      const s = String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };

    rows.push("# Boost toast analytics export");
    rows.push(
      `# range=${range} state=${state} route=${route} generated_at=${new Date().toISOString()}`,
    );
    rows.push("");
    rows.push(
      "section,range_filter,boost_state_filter,route_filter,bucket_or_route,shown,clicked,ctr",
    );

    for (const b of series) {
      const ctr = b.shown > 0 ? b.clicked / b.shown : 0;
      rows.push(
        ["timeseries", range, state, route, b.bucket, b.shown, b.clicked, ctr.toFixed(4)]
          .map(escape)
          .join(","),
      );
    }
    for (const r of routes) {
      rows.push(
        ["route", range, state, route, r.route, r.shown, r.clicked, r.ctr.toFixed(4)]
          .map(escape)
          .join(","),
      );
    }
    if (totals) {
      rows.push(
        ["total", range, state, route, "all", totals.shown, totals.clicked, totals.ctr.toFixed(4)]
          .map(escape)
          .join(","),
      );
    }

    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `boost-toast-analytics_${range}_${state}_${route.replace(/[^a-z0-9]+/gi, "-")}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const buildSampleCsv = () => {
    const escape = (v: string | number) => {
      const s = String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines: string[] = [];
    lines.push("# Boost toast analytics export (sample)");
    lines.push(
      `# range=${range} state=${state} route=${route} generated_at=${new Date().toISOString()}`,
    );
    lines.push("");
    lines.push(
      "section,range_filter,boost_state_filter,route_filter,bucket_or_route,shown,clicked,ctr",
    );
    for (const b of (eventsQuery.data?.series ?? []).slice(0, 3)) {
      const ctr = b.shown > 0 ? b.clicked / b.shown : 0;
      lines.push(
        ["timeseries", range, state, route, b.bucket, b.shown, b.clicked, ctr.toFixed(4)]
          .map(escape)
          .join(","),
      );
    }
    for (const r of routes.slice(0, 3)) {
      lines.push(
        ["route", range, state, route, r.route, r.shown, r.clicked, r.ctr.toFixed(4)]
          .map(escape)
          .join(","),
      );
    }
    if (totals) {
      lines.push(
        ["total", range, state, route, "all", totals.shown, totals.clicked, totals.ctr.toFixed(4)]
          .map(escape)
          .join(","),
      );
    }
    return lines.join("\n");
  };

  const handleDownloadSampleCsv = () => {
    const blob = new Blob([buildSampleCsv()], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `boost-toast-analytics_sample_${range}_${state}_${route.replace(/[^a-z0-9]+/gi, "-")}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const buildSampleJson = () => ({
    generated_at: new Date().toISOString(),
    filters: { range, boost_state: state, route },
    totals: totals
      ? { shown: totals.shown, clicked: totals.clicked, ctr: totals.ctr }
      : { shown: 0, clicked: 0, ctr: 0 },
    timeseries: ((eventsQuery.data?.series ?? []).slice(0, 3)).map((b) => ({
      bucket: b.bucket,
      shown: b.shown,
      clicked: b.clicked,
      ctr: b.shown > 0 ? Number((b.clicked / b.shown).toFixed(4)) : 0,
    })),
    routes: routes.slice(0, 3).map((r) => ({
      route: r.route,
      shown: r.shown,
      clicked: r.clicked,
      ctr: Number(r.ctr.toFixed(4)),
    })),
  });

  const handleDownloadSampleJson = () => {
    const blob = new Blob([JSON.stringify(buildSampleJson(), null, 2)], {
      type: "application/json;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `boost-toast-analytics_sample_${range}_${state}_${route.replace(/[^a-z0-9]+/gi, "-")}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportJson = () => {
    const series = eventsQuery.data?.series ?? [];
    const payload = {
      generated_at: new Date().toISOString(),
      filters: {
        range,
        boost_state: state,
        route,
      },
      totals: totals
        ? { shown: totals.shown, clicked: totals.clicked, ctr: totals.ctr }
        : null,
      timeseries: series.map((b) => ({
        bucket: b.bucket,
        shown: b.shown,
        clicked: b.clicked,
        ctr: b.shown > 0 ? b.clicked / b.shown : 0,
      })),
      routes: routes.map((r) => ({
        route: r.route,
        shown: r.shown,
        clicked: r.clicked,
        ctr: r.ctr,
      })),
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `boost-toast-analytics_${range}_${state}_${route.replace(/[^a-z0-9]+/gi, "-")}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  const canExport =
    !eventsQuery.isLoading &&
    ((eventsQuery.data?.series?.length ?? 0) > 0 || routes.length > 0);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-1 flex-wrap">
            {RANGES.map((r) => (
              <Button
                key={r.value}
                size="sm"
                variant={range === r.value ? "default" : "ghost"}
                className="h-7 text-xs"
                onClick={() => setRange(r.value)}
              >
                {r.label}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={state} onValueChange={(v) => setState(v as BoostStateFilter)}>
              <SelectTrigger className="h-8 w-[140px] text-xs">
                <SelectValue placeholder="Boost state" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All states</SelectItem>
                <SelectItem value="ending">Ending</SelectItem>
                <SelectItem value="ended">Ended</SelectItem>
              </SelectContent>
            </Select>
            <Select value={route} onValueChange={setRoute}>
              <SelectTrigger className="h-8 w-[220px] text-xs">
                <SelectValue placeholder="Route" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="all">All routes</SelectItem>
                {(routesQuery.data ?? []).map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <TooltipProvider delayDuration={150}>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                disabled={!canExport}
                onClick={handleExportCsv}
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Export CSV
              </Button>
              <UITooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground"
                    aria-label="CSV columns help"
                  >
                    <HelpCircle className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" align="end" className="max-w-xs text-xs">
                  <p className="font-semibold mb-1">CSV columns</p>
                  <ul className="space-y-1">
                    <li><span className="font-mono">section</span> — row type: <span className="font-mono">timeseries</span>, <span className="font-mono">route</span>, or <span className="font-mono">total</span>.</li>
                    <li><span className="font-mono">range_filter</span> — selected time window (e.g. 7d).</li>
                    <li><span className="font-mono">boost_state_filter</span> — boost state filter (all/ending/ended).</li>
                    <li><span className="font-mono">route_filter</span> — route filter applied at export.</li>
                    <li><span className="font-mono">bucket_or_route</span> — time bucket (ISO) for timeseries, route path for route rows, or "all" for totals.</li>
                    <li><span className="font-mono">shown</span> — count of <span className="font-mono">boost_toast_shown</span> events.</li>
                    <li><span className="font-mono">clicked</span> — count of <span className="font-mono">boost_toast_action_clicked</span> events.</li>
                    <li><span className="font-mono">ctr</span> — clicked ÷ shown (0–1, 4 decimals).</li>
                  </ul>
                </TooltipContent>
              </UITooltip>
              <button
                type="button"
                onClick={() => setCsvSampleOpen(true)}
                className="text-xs text-primary hover:underline self-center"
              >
                View sample
              </button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                disabled={!canExport}
                onClick={handleExportJson}
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Export JSON
              </Button>
              <UITooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground"
                    aria-label="JSON structure help"
                  >
                    <HelpCircle className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" align="end" className="max-w-xs text-xs">
                  <p className="font-semibold mb-1">JSON structure</p>
                  <ul className="space-y-1">
                    <li><span className="font-mono">generated_at</span> — ISO timestamp of the export.</li>
                    <li><span className="font-mono">filters</span> — active <span className="font-mono">range</span>, <span className="font-mono">boost_state</span>, and <span className="font-mono">route</span>.</li>
                    <li><span className="font-mono">totals</span> — aggregate <span className="font-mono">shown</span>, <span className="font-mono">clicked</span>, <span className="font-mono">ctr</span> across the range.</li>
                    <li><span className="font-mono">timeseries</span> — array of buckets with <span className="font-mono">bucket</span> (ISO), <span className="font-mono">shown</span>, <span className="font-mono">clicked</span>, <span className="font-mono">ctr</span>.</li>
                    <li><span className="font-mono">routes</span> — per-route breakdown with <span className="font-mono">route</span>, <span className="font-mono">shown</span>, <span className="font-mono">clicked</span>, <span className="font-mono">ctr</span>.</li>
                  </ul>
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
            <button
              type="button"
              onClick={() => setSampleOpen(true)}
              className="text-xs text-primary hover:underline self-center"
            >
              View sample
            </button>
          </div>
        </div>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {eventsQuery.isLoading || !totals ? (
          <>
            <Skeleton className="h-[72px]" />
            <Skeleton className="h-[72px]" />
            <Skeleton className="h-[72px]" />
          </>
        ) : (
          <>
            <StatCard icon={Rocket} label="Toasts shown" value={totals.shown.toLocaleString()} />
            <StatCard
              icon={MousePointerClick}
              label="Action clicks"
              value={totals.clicked.toLocaleString()}
            />
            <StatCard
              icon={Percent}
              label="Click-through rate"
              value={`${(totals.ctr * 100).toFixed(1)}%`}
            />
          </>
        )}
      </div>

      {/* Time series */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Events over time</h3>
          <p className="text-xs text-muted-foreground">
            shown vs. action clicked
          </p>
        </div>
        {eventsQuery.isLoading ? (
          <Skeleton className="h-[280px]" />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey="shown"
                name="Shown"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="clicked"
                name="Clicked"
                stroke="hsl(var(--accent-foreground))"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Route breakdown */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-3">Top routes</h3>
        {eventsQuery.isLoading ? (
          <Skeleton className="h-[160px]" />
        ) : routes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No boost toast events match the current filters.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-border">
                  <th className="py-2 pr-3 font-medium">Route</th>
                  <th className="py-2 pr-3 font-medium text-right">Shown</th>
                  <th className="py-2 pr-3 font-medium text-right">Clicked</th>
                  <th className="py-2 font-medium text-right">CTR</th>
                </tr>
              </thead>
              <tbody>
                {routes.slice(0, 15).map((r) => (
                  <tr key={r.route} className="border-b border-border/40 last:border-0">
                    <td className="py-2 pr-3 font-mono text-xs truncate max-w-[260px]">
                      {r.route}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {r.shown.toLocaleString()}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {r.clicked.toLocaleString()}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {(r.ctr * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Dialog open={sampleOpen} onOpenChange={setSampleOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Example Export JSON</DialogTitle>
            <DialogDescription>
              Sample payload using the current filters (range={range}, state={state}, route={route}).
              Up to 3 timeseries buckets and 3 routes are shown for brevity.
            </DialogDescription>
          </DialogHeader>
          <pre className="max-h-[60vh] overflow-auto rounded-md border border-border bg-muted/40 p-3 text-xs font-mono leading-relaxed">
{JSON.stringify(buildSampleJson(), null, 2)}
          </pre>
          <div className="flex justify-end">
            <Button size="sm" variant="outline" onClick={handleDownloadSampleJson}>
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Download sample JSON
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={csvSampleOpen} onOpenChange={setCsvSampleOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Example Export CSV</DialogTitle>
            <DialogDescription>
              Sample rows using the current filters (range={range}, state={state}, route={route}).
              Up to 3 timeseries rows and 3 route rows are shown for brevity.
            </DialogDescription>
          </DialogHeader>
          <pre className="max-h-[60vh] overflow-auto rounded-md border border-border bg-muted/40 p-3 text-xs font-mono leading-relaxed whitespace-pre">
{buildSampleCsv()}
          </pre>
          <div className="flex justify-end">
            <Button size="sm" variant="outline" onClick={handleDownloadSampleCsv}>
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Download sample CSV
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
