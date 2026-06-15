import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ShieldCheck, Tv, RefreshCw } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import TVAuditAnalytics from "@/components/admin/TVAuditAnalytics";

interface Row {
  id: string;
  stream_id: string;
  product_id: string;
  creator_id: string;
  checkout_token: string;
  featured_at: string;
  expires_at: string;
  dismissed_at: string | null;
  qr_scanned_at: string | null;
  purchased_at: string | null;
  amount_cents: number | null;
}

function statusOf(r: Row): { label: string; cls: string } {
  if (r.purchased_at) return { label: "Purchased", cls: "bg-primary/20 text-primary" };
  if (r.dismissed_at) return { label: "Dismissed", cls: "bg-muted text-muted-foreground" };
  if (new Date(r.expires_at) < new Date()) return { label: "Expired", cls: "bg-yellow-500/20 text-yellow-400" };
  return { label: "Active", cls: "bg-[#3D7CFF]/20 text-[#3D7CFF]" };
}

export default function AdminTVAudit() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-tv-features"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tv_product_features")
        .select("id, stream_id, product_id, creator_id, checkout_token, featured_at, expires_at, dismissed_at, qr_scanned_at, purchased_at, amount_cents")
        .order("featured_at", { ascending: false })
        .limit(2000);
      if (error) throw error;
      return (data || []) as Row[];
    },
  });

  const streamIds = useMemo(
    () => Array.from(new Set((data || []).map((r) => r.stream_id))),
    [data],
  );

  const { data: streamMeta } = useQuery({
    queryKey: ["admin-tv-stream-meta", [...streamIds].sort().join(",")],
    enabled: streamIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mux_live_streams")
        .select("id, title, user_id")
        .in("id", streamIds);
      if (error) throw error;
      const userIds = Array.from(new Set((data || []).map((s: any) => s.user_id).filter(Boolean)));
      const profileMap = new Map<string, { display_name: string | null; username: string | null }>();
      if (userIds.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, display_name, username")
          .in("user_id", userIds);
        (profs || []).forEach((p: any) =>
          profileMap.set(p.user_id, { display_name: p.display_name, username: p.username }),
        );
      }
      const map = new Map<string, { title: string; channel: string }>();
      (data || []).forEach((s: any) => {
        const p = s.user_id ? profileMap.get(s.user_id) : null;
        map.set(s.id, {
          title: s.title || "Untitled stream",
          channel: p?.display_name || (p?.username ? "@" + p.username : "Unknown"),
        });
      });
      return map;
    },
  });


  // Realtime: refresh when changes occur
  useEffect(() => {
    const channel = supabase
      .channel("admin-tv-features-audit")
      .on("postgres_changes", { event: "*", schema: "public", table: "tv_product_features" }, () => refetch())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refetch]);

  const rows = useMemo(() => {
    let r = data || [];
    if (statusFilter !== "all") r = r.filter((x) => statusOf(x).label.toLowerCase() === statusFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      r = r.filter((x) =>
        x.stream_id.toLowerCase().includes(q) ||
        x.product_id.toLowerCase().includes(q) ||
        x.creator_id.toLowerCase().includes(q) ||
        x.checkout_token.toLowerCase().includes(q),
      );
    }
    return r;
  }, [data, statusFilter, search]);

  const stats = useMemo(() => {
    const all = data || [];
    return {
      total: all.length,
      active: all.filter((r) => !r.dismissed_at && !r.purchased_at && new Date(r.expires_at) > new Date()).length,
      scanned: all.filter((r) => r.qr_scanned_at).length,
      purchased: all.filter((r) => r.purchased_at).length,
    };
  }, [data]);

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#3D7CFF]/15 flex items-center justify-center">
              <Tv className="w-5 h-5 text-[#3D7CFF]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                TV Feature Audit <ShieldCheck className="w-5 h-5 text-[#3D7CFF]" />
              </h1>
              <p className="text-sm text-muted-foreground">
                Every product feature on UPLY TV — created, dismissed, scanned, and purchased.
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total", value: stats.total },
            { label: "Active now", value: stats.active },
            { label: "QR scanned", value: stats.scanned },
            { label: "Purchased", value: stats.purchased },
          ].map((s) => (
            <div key={s.label} className="p-4 rounded-xl border border-border bg-card">
              <div className="text-xs text-muted-foreground">{s.label}</div>
              <div className="text-2xl font-bold mt-1">{s.value}</div>
            </div>
          ))}
        </div>

        <TVAuditAnalytics rows={(data || []) as any} streamMeta={streamMeta} />

        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search stream / product / creator / token…"
            className="max-w-sm"
            style={{ fontSize: 16 }}
          />
          <div className="flex gap-1 flex-wrap">
            {["all", "active", "dismissed", "expired", "purchased"].map((s) => (
              <Button
                key={s}
                size="sm"
                variant={statusFilter === s ? "default" : "outline"}
                onClick={() => setStatusFilter(s)}
                className="capitalize h-8"
              >
                {s}
              </Button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Featured at</th>
                  <th className="text-left p-3">Stream</th>
                  <th className="text-left p-3">Product</th>
                  <th className="text-left p-3">Creator</th>
                  <th className="text-left p-3">Token</th>
                  <th className="text-left p-3">Scanned</th>
                  <th className="text-left p-3">Purchased</th>
                  <th className="text-left p-3">Dismissed</th>
                  <th className="text-left p-3">Expires</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-t border-border">
                    <td colSpan={10} className="p-3"><Skeleton className="h-5 w-full" /></td>
                  </tr>
                ))}
                {!isLoading && rows.length === 0 && (
                  <tr><td colSpan={10} className="p-8 text-center text-muted-foreground">No TV features found.</td></tr>
                )}
                {rows.map((r) => {
                  const s = statusOf(r);
                  return (
                    <tr key={r.id} className="border-t border-border hover:bg-muted/20">
                      <td className="p-3"><Badge variant="outline" className={`${s.cls} border-0 text-xs`}>{s.label}</Badge></td>
                      <td className="p-3 whitespace-nowrap">{format(new Date(r.featured_at), "MMM d, HH:mm:ss")}</td>
                      <td className="p-3 font-mono text-xs">{r.stream_id.slice(0, 8)}…</td>
                      <td className="p-3 font-mono text-xs">{r.product_id.slice(0, 8)}…</td>
                      <td className="p-3 font-mono text-xs">{r.creator_id.slice(0, 8)}…</td>
                      <td className="p-3 font-mono text-xs">{r.checkout_token.slice(0, 12)}…</td>
                      <td className="p-3 whitespace-nowrap text-muted-foreground">{r.qr_scanned_at ? format(new Date(r.qr_scanned_at), "MMM d HH:mm") : "—"}</td>
                      <td className="p-3 whitespace-nowrap text-muted-foreground">
                        {r.purchased_at ? `${format(new Date(r.purchased_at), "MMM d HH:mm")} · $${((r.amount_cents || 0) / 100).toFixed(2)}` : "—"}
                      </td>
                      <td className="p-3 whitespace-nowrap text-muted-foreground">{r.dismissed_at ? format(new Date(r.dismissed_at), "MMM d HH:mm") : "—"}</td>
                      <td className="p-3 whitespace-nowrap text-muted-foreground">{format(new Date(r.expires_at), "MMM d HH:mm")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
