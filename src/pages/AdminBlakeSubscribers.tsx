import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useMemo, useState } from "react";
import { Users, DollarSign, AlertTriangle, CheckCircle2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Row {
  id: string;
  user_id: string | null;
  email: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

const STATUS_STYLES: Record<string, string> = {
  active: "bg-primary/20 text-primary border-primary/40",
  trialing: "bg-blue-500/20 text-blue-400 border-blue-500/40",
  past_due: "bg-warning/20 text-warning border-warning/40",
  canceled: "bg-muted text-muted-foreground border-border",
  incomplete: "bg-warning/20 text-warning border-warning/40",
  incomplete_expired: "bg-destructive/20 text-destructive border-destructive/40",
  unpaid: "bg-destructive/20 text-destructive border-destructive/40",
  inactive: "bg-muted text-muted-foreground border-border",
};

const PRICE_MONTHLY = 97;

export default function AdminBlakeSubscribers() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-blake-subscribers"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("blake_subscribers")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Row[];
    },
  });

  const stats = useMemo(() => {
    const rows = data || [];
    const active = rows.filter((r) => r.status === "active");
    const canceling = active.filter((r) => r.cancel_at_period_end).length;
    const pastDue = rows.filter((r) => ["past_due", "unpaid", "incomplete"].includes(r.status)).length;
    const canceled = rows.filter((r) => r.status === "canceled").length;
    const soon = active.filter((r) => {
      if (!r.current_period_end) return false;
      const days = (new Date(r.current_period_end).getTime() - Date.now()) / 86400000;
      return days >= 0 && days <= 7;
    }).length;
    return {
      total: rows.length,
      active: active.length,
      canceling,
      pastDue,
      canceled,
      renewingSoon: soon,
      mrr: active.length * PRICE_MONTHLY,
    };
  }, [data]);

  const filtered = useMemo(() => {
    let rows = data || [];
    if (statusFilter !== "all") rows = rows.filter((r) => r.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.email.toLowerCase().includes(q) ||
          r.stripe_customer_id?.toLowerCase().includes(q) ||
          r.stripe_subscription_id?.toLowerCase().includes(q),
      );
    }
    return rows;
  }, [data, search, statusFilter]);

  const exportCsv = () => {
    const rows = filtered;
    const headers = ["email", "status", "cancel_at_period_end", "current_period_end", "stripe_customer_id", "stripe_subscription_id", "created_at"];
    const csv = [
      headers.join(","),
      ...rows.map((r) =>
        [
          r.email,
          r.status,
          r.cancel_at_period_end,
          r.current_period_end || "",
          r.stripe_customer_id || "",
          r.stripe_subscription_id || "",
          r.created_at,
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(","),
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `blake-subscribers-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const statuses = useMemo(() => {
    const set = new Set<string>();
    (data || []).forEach((r) => set.add(r.status));
    return Array.from(set).sort();
  }, [data]);

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-heading font-bold">Blake Blueprint Subscribers</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Live Stripe subscription status synced via webhook. ${PRICE_MONTHLY}/mo tier.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              {isFetching ? "Refreshing…" : "Refresh"}
            </Button>
            <Button size="sm" onClick={exportCsv} disabled={!filtered.length}>
              <Download className="w-4 h-4 mr-1.5" /> CSV
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <StatCard icon={Users} label="Total" value={stats.total} />
          <StatCard icon={CheckCircle2} label="Active" value={stats.active} tone="primary" />
          <StatCard icon={DollarSign} label="MRR" value={`$${stats.mrr.toLocaleString()}`} tone="primary" />
          <StatCard icon={AlertTriangle} label="Past Due" value={stats.pastDue} tone={stats.pastDue > 0 ? "warning" : undefined} />
          <StatCard icon={AlertTriangle} label="Canceling" value={stats.canceling} tone={stats.canceling > 0 ? "warning" : undefined} />
          <StatCard icon={CheckCircle2} label="Renewing ≤7d" value={stats.renewingSoon} />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="Search by email or Stripe ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
          <div className="flex flex-wrap gap-1.5">
            <FilterChip active={statusFilter === "all"} onClick={() => setStatusFilter("all")}>
              All
            </FilterChip>
            {statuses.map((s) => (
              <FilterChip key={s} active={statusFilter === s} onClick={() => setStatusFilter(s)}>
                {s}
              </FilterChip>
            ))}
          </div>
        </div>

        {/* Table */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">
              {isLoading ? "Loading…" : `${filtered.length} subscriber${filtered.length === 1 ? "" : "s"}`}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center text-sm text-muted-foreground">
                No subscribers found. Once someone completes checkout, they'll appear here.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-medium">Email</th>
                      <th className="text-left px-4 py-2.5 font-medium">Status</th>
                      <th className="text-left px-4 py-2.5 font-medium">Renewal / Ends</th>
                      <th className="text-left px-4 py-2.5 font-medium">Stripe Customer</th>
                      <th className="text-left px-4 py-2.5 font-medium">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r) => (
                      <tr key={r.id} className="border-t border-border hover:bg-muted/20">
                        <td className="px-4 py-3">
                          <div className="font-medium">{r.email}</div>
                          {!r.user_id && (
                            <div className="text-xs text-muted-foreground">no linked account yet</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={STATUS_STYLES[r.status] || "bg-muted text-muted-foreground border-border"}
                          >
                            {r.status}
                          </Badge>
                          {r.cancel_at_period_end && r.status === "active" && (
                            <Badge variant="outline" className="ml-2 bg-warning/20 text-warning border-warning/40">
                              canceling
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {r.current_period_end
                            ? new Date(r.current_period_end).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "—"}
                        </td>
                        <td className="px-4 py-3">
                          {r.stripe_customer_id ? (
                            <a
                              href={`https://dashboard.stripe.com/customers/${r.stripe_customer_id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary hover:underline font-mono text-xs"
                            >
                              {r.stripe_customer_id}
                            </a>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(r.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  tone?: "primary" | "warning";
}) {
  const toneCls =
    tone === "primary" ? "text-primary" : tone === "warning" ? "text-warning" : "text-foreground";
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-1.5">
          <Icon className="w-3.5 h-3.5" />
          {label}
        </div>
        <div className={`text-2xl font-heading font-bold ${toneCls}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs border transition ${
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-card text-muted-foreground border-border hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
