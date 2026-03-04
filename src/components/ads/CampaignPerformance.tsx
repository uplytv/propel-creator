import { useState, useEffect, useRef } from "react";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import {
  TrendingUp, TrendingDown, Eye, MousePointerClick, ShoppingCart,
  DollarSign, BarChart3, Pause, Play, MoreHorizontal, ArrowUpRight, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import type { CampaignRow } from "@/hooks/useCampaigns";

/* ─────── types ─────── */
export interface Campaign {
  id: string;
  name: string;
  platform: "meta" | "google";
  status: "active" | "paused" | "completed";
  objective: string;
  dailyBudget: number;
  totalBudget: number;
  spent: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cpc: number;
  cpa: number;
  roas: number;
  startDate: string;
  endDate: string;
  trend: "up" | "down" | "flat";
  sparkline: { day: string; imp: number; clicks: number; conv: number }[];
  isNew?: boolean;
}

/* ─────── seed data ─────── */
const seedCampaigns: Campaign[] = [
  {
    id: "c1",
    name: "Stream: Weekly Q&A Boost",
    platform: "meta",
    status: "active",
    objective: "Lead Generation",
    dailyBudget: 25,
    totalBudget: 175,
    spent: 112.40,
    impressions: 18420,
    clicks: 743,
    conversions: 38,
    ctr: 4.03,
    cpc: 0.15,
    cpa: 2.96,
    roas: 4.2,
    startDate: "Feb 26",
    endDate: "Mar 4",
    trend: "up",
    sparkline: [
      { day: "Mon", imp: 2100, clicks: 82, conv: 3 },
      { day: "Tue", imp: 2400, clicks: 96, conv: 5 },
      { day: "Wed", imp: 2650, clicks: 108, conv: 6 },
      { day: "Thu", imp: 2800, clicks: 115, conv: 5 },
      { day: "Fri", imp: 3100, clicks: 128, conv: 7 },
      { day: "Sat", imp: 2700, clicks: 110, conv: 6 },
      { day: "Sun", imp: 2670, clicks: 104, conv: 6 },
    ],
  },
  {
    id: "c2",
    name: "Course Launch — Retarget",
    platform: "google",
    status: "active",
    objective: "Conversions",
    dailyBudget: 50,
    totalBudget: 700,
    spent: 389.20,
    impressions: 42150,
    clicks: 1284,
    conversions: 67,
    ctr: 3.05,
    cpc: 0.30,
    cpa: 5.81,
    roas: 6.8,
    startDate: "Feb 20",
    endDate: "Mar 6",
    trend: "up",
    sparkline: [
      { day: "Mon", imp: 5200, clicks: 158, conv: 7 },
      { day: "Tue", imp: 5800, clicks: 176, conv: 9 },
      { day: "Wed", imp: 6100, clicks: 190, conv: 10 },
      { day: "Thu", imp: 6400, clicks: 195, conv: 9 },
      { day: "Fri", imp: 6800, clicks: 210, conv: 11 },
      { day: "Sat", imp: 6000, clicks: 182, conv: 10 },
      { day: "Sun", imp: 5850, clicks: 173, conv: 11 },
    ],
  },
  {
    id: "c3",
    name: "Brand Awareness — Lookalike",
    platform: "meta",
    status: "paused",
    objective: "Brand Awareness",
    dailyBudget: 10,
    totalBudget: 140,
    spent: 62.10,
    impressions: 31200,
    clicks: 412,
    conversions: 8,
    ctr: 1.32,
    cpc: 0.15,
    cpa: 7.76,
    roas: 1.4,
    startDate: "Feb 18",
    endDate: "Mar 3",
    trend: "down",
    sparkline: [
      { day: "Mon", imp: 5100, clicks: 68, conv: 2 },
      { day: "Tue", imp: 4800, clicks: 62, conv: 1 },
      { day: "Wed", imp: 4600, clicks: 60, conv: 1 },
      { day: "Thu", imp: 4500, clicks: 58, conv: 1 },
      { day: "Fri", imp: 4400, clicks: 56, conv: 1 },
      { day: "Sat", imp: 4100, clicks: 55, conv: 1 },
      { day: "Sun", imp: 3700, clicks: 53, conv: 1 },
    ],
  },
];

/* ─────── helper to convert db row to display ─────── */
function rowToCampaign(row: CampaignRow): Campaign {
  const created = new Date(row.created_at);
  const endDate = new Date(created);
  endDate.setDate(created.getDate() + row.duration);
  const fmtDate = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const isRecent = Date.now() - created.getTime() < 60_000 * 5; // 5 min

  return {
    id: row.id,
    name: `Boost: ${row.stream_title}`,
    platform: row.platform as "meta" | "google",
    status: row.status as "active" | "paused" | "completed",
    objective: row.objective_label,
    dailyBudget: Number(row.daily_budget),
    totalBudget: Number(row.total_budget),
    spent: Number(row.spent),
    impressions: row.impressions,
    clicks: row.clicks,
    conversions: row.conversions,
    ctr: Number(row.ctr),
    cpc: Number(row.cpc),
    cpa: Number(row.cpa),
    roas: Number(row.roas),
    startDate: fmtDate(created),
    endDate: fmtDate(endDate),
    trend: row.impressions > 0 ? "up" : "flat",
    sparkline: [],
    isNew: isRecent,
  };
}

/* ─────── helpers ─────── */
function fmt(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return n.toLocaleString();
}

/* ─────── component ─────── */
interface CampaignPerformanceProps {
  campaigns?: CampaignRow[];
  onUpdateStatus?: (params: { id: string; status: string }) => void;
}

export default function CampaignPerformance({ campaigns = [], onUpdateStatus }: CampaignPerformanceProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const dbCampaigns = campaigns.map(rowToCampaign);
  const allCampaigns = [...dbCampaigns, ...seedCampaigns];

  // Track which campaigns have already triggered notifications
  const notifiedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    allCampaigns.forEach((c) => {
      const pct = c.totalBudget > 0 ? (c.spent / c.totalBudget) * 100 : 0;

      // Completed notification
      if ((c.status === "completed" || pct >= 100) && !notifiedRef.current.has(`${c.id}-done`)) {
        notifiedRef.current.add(`${c.id}-done`);
        toast({
          title: "🏁 Campaign Completed",
          description: `"${c.name}" has finished — $${c.spent.toFixed(0)} spent of $${c.totalBudget.toFixed(0)} budget.`,
        });
      }
      // 75% warning notification
      else if (pct >= 75 && !notifiedRef.current.has(`${c.id}-75`)) {
        notifiedRef.current.add(`${c.id}-75`);
        toast({
          title: "⚠️ Budget Alert",
          description: `"${c.name}" has used ${pct.toFixed(0)}% of its $${c.totalBudget.toFixed(0)} budget.`,
          variant: "destructive",
        });
      }
    });
  }, [allCampaigns]);

  const activeCampaigns = allCampaigns.filter((c) => c.status === "active");
  const totalSpent = allCampaigns.reduce((s, c) => s + c.spent, 0);
  const totalImpressions = allCampaigns.reduce((s, c) => s + c.impressions, 0);
  const totalClicks = allCampaigns.reduce((s, c) => s + c.clicks, 0);
  const totalConversions = allCampaigns.reduce((s, c) => s + c.conversions, 0);

  const summaryCards = [
    { label: "Total Spend", value: `$${totalSpent.toFixed(0)}`, icon: DollarSign, color: "text-primary" },
    { label: "Impressions", value: fmt(totalImpressions), icon: Eye, color: "text-blue-400" },
    { label: "Clicks", value: fmt(totalClicks), icon: MousePointerClick, color: "text-amber-400" },
    { label: "Conversions", value: totalConversions.toString(), icon: ShoppingCart, color: "text-emerald-400" },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
      {/* Section header */}
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold">Campaign Performance</h2>
        <span className="ml-auto text-xs text-muted-foreground">{activeCampaigns.length} active · {allCampaigns.length} total</span>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {summaryCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.05 }}
            className="glass-card p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <card.icon className={`w-4 h-4 ${card.color}`} />
              <span className="text-xs text-muted-foreground">{card.label}</span>
            </div>
            <p className="text-xl font-bold">{card.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Campaign list */}
      <div className="space-y-3">
        {allCampaigns.map((campaign, i) => (
          <motion.div
            key={campaign.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.05 }}
            className={`glass-card overflow-hidden ${campaign.isNew ? "ring-2 ring-primary/40" : ""}`}
          >
            {/* Campaign row */}
            <button
              onClick={() => setExpandedId(expandedId === campaign.id ? null : campaign.id)}
              className="w-full p-4 flex items-center gap-4 text-left hover:bg-secondary/20 transition-colors"
            >
              {/* Platform icon */}
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                campaign.platform === "meta" ? "bg-[hsl(214,89%,52%)]/10" : "bg-[hsl(4,90%,58%)]/10"
              }`}>
                <span className="text-lg">{campaign.platform === "meta" ? "📘" : "🔍"}</span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold truncate">{campaign.name}</span>
                  <StatusPill status={campaign.status} />
                  {campaign.isNew && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold uppercase tracking-wider">
                      <Sparkles className="w-3 h-3" /> New
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{campaign.objective} · {campaign.startDate} – {campaign.endDate}</p>
                {/* Budget progress bar */}
                <BudgetProgressBar spent={campaign.spent} total={campaign.totalBudget} status={campaign.status} />
              </div>

              {/* Key metrics — desktop */}
              <div className="hidden md:flex items-center gap-6">
                <MetricCell label="Spent" value={`$${campaign.spent.toFixed(0)}`} />
                <MetricCell label="Impressions" value={fmt(campaign.impressions)} />
                <MetricCell label="Clicks" value={fmt(campaign.clicks)} />
                <MetricCell label="Conv." value={campaign.conversions.toString()} />
                {campaign.trend !== "flat" && (
                  <div className="flex items-center gap-1">
                    {campaign.trend === "up" ? (
                      <TrendingUp className="w-4 h-4 text-primary" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-destructive" />
                    )}
                  </div>
                )}
              </div>

              <ArrowUpRight className={`w-4 h-4 text-muted-foreground transition-transform ${expandedId === campaign.id ? "rotate-90" : ""}`} />
            </button>

            {/* Expanded detail */}
            {expandedId === campaign.id && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t border-border"
              >
                <div className="p-4 space-y-4">
                  {/* Mobile metrics */}
                  <div className="grid grid-cols-2 gap-3 md:hidden">
                    <MiniStat label="Spent" value={`$${campaign.spent.toFixed(0)}`} />
                    <MiniStat label="Impressions" value={fmt(campaign.impressions)} />
                    <MiniStat label="Clicks" value={fmt(campaign.clicks)} />
                    <MiniStat label="Conversions" value={campaign.conversions.toString()} />
                  </div>

                  {/* Detailed metrics row */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <MiniStat label="CTR" value={`${campaign.ctr}%`} />
                    <MiniStat label="CPC" value={`$${campaign.cpc.toFixed(2)}`} />
                    <MiniStat label="CPA" value={`$${campaign.cpa.toFixed(2)}`} />
                    <MiniStat label="ROAS" value={`${campaign.roas}x`} highlight />
                  </div>

                  {/* Chart or "just launched" message */}
                  {campaign.sparkline.length > 0 ? (
                    <div className="h-48 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={campaign.sparkline}>
                          <defs>
                            <linearGradient id={`grad-${campaign.id}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                          <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                          <Tooltip
                            contentStyle={{
                              background: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "0.75rem",
                              fontSize: "12px",
                            }}
                          />
                          <Area type="monotone" dataKey="imp" name="Impressions" stroke="hsl(var(--primary))" fill={`url(#grad-${campaign.id})`} strokeWidth={2} />
                          <Area type="monotone" dataKey="clicks" name="Clicks" stroke="hsl(var(--accent-foreground))" fill="none" strokeWidth={1.5} strokeDasharray="4 4" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-32 flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-secondary/10">
                      <Sparkles className="w-6 h-6 text-primary mb-2" />
                      <p className="text-sm font-semibold">Just Launched</p>
                      <p className="text-xs text-muted-foreground">Performance data will appear as your campaign runs.</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    {!campaign.id.startsWith("c") && onUpdateStatus && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1.5"
                        onClick={() =>
                          onUpdateStatus({
                            id: campaign.id,
                            status: campaign.status === "active" ? "paused" : "active",
                          })
                        }
                      >
                        {campaign.status === "active" ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        {campaign.status === "active" ? "Pause" : "Resume"}
                      </Button>
                    )}
                    {campaign.id.startsWith("c") && (
                      <Button variant="outline" size="sm" className="flex items-center gap-1.5">
                        {campaign.status === "active" ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        {campaign.status === "active" ? "Pause" : "Resume"}
                      </Button>
                    )}
                    <Button variant="outline" size="sm" className="flex items-center gap-1.5">
                      <MoreHorizontal className="w-3.5 h-3.5" /> Details
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

/* ─────── sub-components ─────── */

function StatusPill({ status }: { status: Campaign["status"] }) {
  const styles = {
    active: "bg-primary/10 text-primary",
    paused: "bg-warning/10 text-warning",
    completed: "bg-secondary text-muted-foreground",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${styles[status]}`}>
      {status}
    </span>
  );
}

function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-right min-w-[60px]">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}

function MiniStat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`p-3 rounded-xl border ${highlight ? "border-primary/30 bg-primary/5" : "border-border bg-secondary/20"}`}>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">{label}</p>
      <p className={`text-sm font-bold ${highlight ? "text-primary" : ""}`}>{value}</p>
    </div>
  );
}

function BudgetProgressBar({ spent, total, status }: { spent: number; total: number; status: string }) {
  const pct = total > 0 ? Math.min((spent / total) * 100, 100) : 0;
  const isComplete = status === "completed" || pct >= 100;
  const isWarning = pct >= 75 && !isComplete;

  return (
    <div className="mt-1.5 flex items-center gap-2 w-full max-w-[260px]">
      <div className="flex-1 h-1.5 rounded-full bg-secondary/50 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${
            isComplete
              ? "bg-muted-foreground"
              : isWarning
              ? "bg-[hsl(var(--warning,38_92%_50%))]"
              : "bg-primary"
          }`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
      <span className={`text-[10px] font-semibold tabular-nums whitespace-nowrap ${
        isComplete ? "text-muted-foreground" : isWarning ? "text-[hsl(38,92%,50%)]" : "text-primary"
      }`}>
        {pct.toFixed(0)}%
      </span>
    </div>
  );
}
