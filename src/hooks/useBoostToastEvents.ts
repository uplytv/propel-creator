import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type BoostStateFilter = "all" | "ending" | "ended";
export type BoostRangeKey = "24h" | "7d" | "30d" | "90d";

export interface BoostEventRow {
  created_at: string;
  event_name: "boost_toast_shown" | "boost_toast_action_clicked" | "boost_toast_dismissed";
  boost_state: "ending" | "ended";
  route: string | null;
}

export interface BoostBucket {
  bucket: string; // ISO truncated
  shown: number;
  clicked: number;
}

export interface RouteAggregate {
  route: string;
  shown: number;
  clicked: number;
  ctr: number;
}

const RANGE_HOURS: Record<BoostRangeKey, number> = {
  "24h": 24,
  "7d": 24 * 7,
  "30d": 24 * 30,
  "90d": 24 * 90,
};

function bucketLabel(date: Date, range: BoostRangeKey) {
  if (range === "24h") {
    const d = new Date(date);
    d.setMinutes(0, 0, 0);
    return d.toISOString();
  }
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

function emptyBuckets(range: BoostRangeKey): BoostBucket[] {
  const out: BoostBucket[] = [];
  const now = new Date();
  if (range === "24h") {
    const start = new Date(now);
    start.setMinutes(0, 0, 0);
    for (let i = 23; i >= 0; i--) {
      const d = new Date(start.getTime() - i * 60 * 60 * 1000);
      out.push({ bucket: d.toISOString(), shown: 0, clicked: 0 });
    }
  } else {
    const days = RANGE_HOURS[range] / 24;
    const start = new Date(now);
    start.setUTCHours(0, 0, 0, 0);
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(start.getTime() - i * 24 * 60 * 60 * 1000);
      out.push({ bucket: d.toISOString(), shown: 0, clicked: 0 });
    }
  }
  return out;
}

export function useBoostToastEvents(args: {
  range: BoostRangeKey;
  state: BoostStateFilter;
  route: string | "all";
}) {
  const { range, state, route } = args;

  return useQuery({
    queryKey: ["boost-toast-events", range, state, route],
    queryFn: async () => {
      const sinceIso = new Date(
        Date.now() - RANGE_HOURS[range] * 60 * 60 * 1000,
      ).toISOString();

      let q = supabase
        .from("boost_toast_events")
        .select("created_at, event_name, boost_state, route")
        .in("event_name", ["boost_toast_shown", "boost_toast_action_clicked"])
        .gte("created_at", sinceIso)
        .order("created_at", { ascending: true })
        .limit(50000);

      if (state !== "all") q = q.eq("boost_state", state);
      if (route !== "all") q = q.eq("route", route);

      const { data, error } = await q;
      if (error) throw error;

      const rows = (data ?? []) as BoostEventRow[];

      // Time series
      const map = new Map<string, BoostBucket>();
      for (const b of emptyBuckets(range)) map.set(b.bucket, b);

      for (const r of rows) {
        const key = bucketLabel(new Date(r.created_at), range);
        const b = map.get(key) ?? { bucket: key, shown: 0, clicked: 0 };
        if (r.event_name === "boost_toast_shown") b.shown += 1;
        else if (r.event_name === "boost_toast_action_clicked") b.clicked += 1;
        map.set(key, b);
      }
      const series = Array.from(map.values()).sort((a, b) =>
        a.bucket.localeCompare(b.bucket),
      );

      // Route aggregates (top 10 by shown)
      const routeMap = new Map<string, RouteAggregate>();
      for (const r of rows) {
        const key = r.route ?? "(unknown)";
        const cur =
          routeMap.get(key) ?? { route: key, shown: 0, clicked: 0, ctr: 0 };
        if (r.event_name === "boost_toast_shown") cur.shown += 1;
        else if (r.event_name === "boost_toast_action_clicked") cur.clicked += 1;
        routeMap.set(key, cur);
      }
      const routes = Array.from(routeMap.values())
        .map((r) => ({
          ...r,
          ctr: r.shown > 0 ? r.clicked / r.shown : 0,
        }))
        .sort((a, b) => b.shown - a.shown);

      const totals = {
        shown: rows.filter((r) => r.event_name === "boost_toast_shown").length,
        clicked: rows.filter(
          (r) => r.event_name === "boost_toast_action_clicked",
        ).length,
      };
      const ctr = totals.shown > 0 ? totals.clicked / totals.shown : 0;

      return { series, routes, totals: { ...totals, ctr } };
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

export function useBoostRoutesList(range: BoostRangeKey) {
  return useQuery({
    queryKey: ["boost-toast-routes", range],
    queryFn: async () => {
      const sinceIso = new Date(
        Date.now() - RANGE_HOURS[range] * 60 * 60 * 1000,
      ).toISOString();
      const { data, error } = await supabase
        .from("boost_toast_events")
        .select("route")
        .gte("created_at", sinceIso)
        .not("route", "is", null)
        .limit(50000);
      if (error) throw error;
      const set = new Set<string>();
      for (const r of (data ?? []) as { route: string | null }[]) {
        if (r.route) set.add(r.route);
      }
      return Array.from(set).sort();
    },
    staleTime: 60_000,
  });
}
