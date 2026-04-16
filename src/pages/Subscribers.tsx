import { useState, useMemo } from "react";
import { Users, Download, Search, Mail, TrendingUp, UserPlus, Radio, Ticket, Link2, Filter } from "lucide-react";
import SubscriberGrowthChart from "@/components/subscribers/SubscriberGrowthChart";
import AppLayout from "@/components/layout/AppLayout";
import BackNav from "@/components/BackNav";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSubscribers, useSubscriberStats, useExportSubscribersCSV } from "@/hooks/useSubscribers";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

const sourceConfig: Record<string, { label: string; icon: typeof Radio; color: string }> = {
  stream_join: { label: "Live Stream", icon: Radio, color: "bg-red-500/10 text-red-400" },
  rsvp: { label: "RSVP", icon: Ticket, color: "bg-blue-500/10 text-blue-400" },
  membership: { label: "Membership", icon: Users, color: "bg-purple-500/10 text-purple-400" },
  link: { label: "Link", icon: Link2, color: "bg-yellow-500/10 text-yellow-400" },
  manual: { label: "Manual", icon: UserPlus, color: "bg-muted text-muted-foreground" },
};

export default function Subscribers() {
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const { data: subscribers = [], isLoading } = useSubscribers({ source: sourceFilter, search });
  const { data: stats } = useSubscriberStats();
  const exportCSV = useExportSubscribersCSV();

  const activeSubscribers = useMemo(
    () => subscribers.filter(s => !s.unsubscribed),
    [subscribers]
  );

  return (
    <AppLayout>
      <SEOHead title="Subscribers | UPLY" description="Manage your email subscribers" />
      <div className="min-h-screen pb-24">
        <BackNav label="Subscribers" />

        {/* Stats Row */}
        <div className="px-4 py-3 grid grid-cols-3 gap-3">
          <div className="rounded-2xl p-4 border" style={{ background: "rgba(0,255,133,0.05)", borderColor: "rgba(0,255,133,0.15)" }}>
            <div className="text-2xl font-bold" style={{ color: "#00FF85" }}>{stats?.active ?? "—"}</div>
            <div className="text-xs text-muted-foreground">Active</div>
          </div>
          <div className="rounded-2xl p-4 border border-border bg-card">
            <div className="text-2xl font-bold text-foreground">{stats?.total ?? "—"}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
          <div className="rounded-2xl p-4 border border-border bg-card">
            <div className="text-2xl font-bold text-foreground">{stats?.unsubscribed ?? "—"}</div>
            <div className="text-xs text-muted-foreground">Unsub'd</div>
          </div>
        </div>

        {/* Source breakdown */}
        {stats?.bySource && Object.keys(stats.bySource).length > 0 && (
          <div className="px-4 pb-3 flex gap-2 flex-wrap">
            {Object.entries(stats.bySource).map(([src, count]) => {
              const cfg = sourceConfig[src] || sourceConfig.manual;
              return (
                <Badge key={src} variant="outline" className={`${cfg.color} text-[10px] px-2 py-0.5`}>
                  {cfg.label}: {count}
                </Badge>
              );
            })}
          </div>
        )}

        {/* Growth Chart */}
        <SubscriberGrowthChart subscribers={subscribers} />

        {/* Filters */}
        <div className="px-4 pb-3 flex gap-2">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search email or name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-10 rounded-xl text-sm"
            />
          </div>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-[130px] h-10 rounded-xl text-sm">
              <Filter className="w-3.5 h-3.5 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="stream_join">Live Stream</SelectItem>
              <SelectItem value="rsvp">RSVP</SelectItem>
              <SelectItem value="membership">Membership</SelectItem>
              <SelectItem value="link">Link</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Export */}
        <div className="px-4 pb-3">
          <Button variant="outline" size="sm" onClick={exportCSV} className="rounded-xl text-xs gap-1.5">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </Button>
        </div>

        {/* Subscriber List */}
        <div className="px-4 space-y-2">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)
          ) : activeSubscribers.length === 0 ? (
            <div className="text-center py-16">
              <Mail className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-sm font-medium text-muted-foreground">No subscribers yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Subscribers from streams, events, and links will appear here</p>
            </div>
          ) : (
            activeSubscribers.map(sub => {
              const cfg = sourceConfig[sub.source] || sourceConfig.manual;
              const Icon = cfg.icon;
              return (
                <div key={sub.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground">
                    {(sub.name || sub.email)[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground truncate">{sub.name || sub.email}</span>
                      <Badge variant="outline" className={`${cfg.color} text-[9px] px-1.5 py-0 shrink-0`}>
                        <Icon className="w-2.5 h-2.5 mr-0.5" />{cfg.label}
                      </Badge>
                    </div>
                    {sub.name && (
                      <p className="text-xs text-muted-foreground truncate">{sub.email}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-muted-foreground">{format(new Date(sub.created_at), "MMM d")}</p>
                    {sub.total_purchases > 0 && (
                      <p className="text-[10px] font-medium" style={{ color: "#00FF85" }}>{sub.total_purchases} purchases</p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </AppLayout>
  );
}
