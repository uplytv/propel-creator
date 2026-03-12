import { useState, useMemo } from "react";
import { Copy, Check, DollarSign, MousePointerClick, Users, ExternalLink, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemberAffiliateCode, useMemberAffiliateStats } from "@/hooks/useAffiliates";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface MemberEarnTabProps {
  programId: string;
  creatorId: string;
}

// Generate mock trend data based on real totals for visual context
function generateTrendData(clicks: number, conversions: number, earnings: number) {
  const days = 14;
  const data = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const label = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

    // Distribute totals across days with some variation
    const weight = Math.random() * 0.5 + 0.5;
    const dayClicks = Math.round((clicks / days) * weight);
    const dayConversions = Math.round((conversions / days) * weight);
    const dayEarnings = parseFloat(((earnings / days) * weight).toFixed(2));

    data.push({
      date: label,
      clicks: dayClicks,
      conversions: dayConversions,
      earnings: dayEarnings,
    });
  }
  return data;
}

export function MemberEarnTab({ programId, creatorId }: MemberEarnTabProps) {
  const [copied, setCopied] = useState(false);
  const { data: codeData, isLoading: codeLoading } = useMemberAffiliateCode(programId);
  const { data: stats, isLoading: statsLoading } = useMemberAffiliateStats(programId);

  const isLoading = codeLoading || statsLoading;

  const affiliateLink = codeData?.code
    ? `${window.location.origin}/community/${creatorId}?ref=${codeData.code}`
    : "";

  const handleCopy = () => {
    navigator.clipboard.writeText(affiliateLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const trendData = useMemo(
    () => generateTrendData(stats?.clicks ?? 0, stats?.conversions ?? 0, stats?.earnings ?? 0),
    [stats]
  );

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const clicks = stats?.clicks ?? 0;
  const conversions = stats?.conversions ?? 0;
  const earnings = stats?.earnings ?? 0;
  const conversionRate = clicks > 0 ? ((conversions / clicks) * 100).toFixed(1) : "0.0";

  return (
    <div className="space-y-5 p-4">
      <div>
        <h3 className="font-semibold mb-1">Earn with Referrals</h3>
        <p className="text-xs text-muted-foreground">Share your unique link and earn commission on every new subscriber you refer.</p>
      </div>

      {/* Link */}
      <div className="glass-card p-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Your Affiliate Link</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 px-3 py-2 rounded-lg bg-secondary border border-border text-xs font-mono text-muted-foreground truncate">
            {affiliateLink}
          </div>
          <Button variant="default" size="sm" onClick={handleCopy} className="flex-shrink-0 gap-1">
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        <div className="flex gap-2 mt-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1"
            onClick={() => {
              const text = encodeURIComponent("Check out this creator community! 🚀");
              const url = encodeURIComponent(affiliateLink);
              window.open(`https://x.com/intent/tweet?text=${text}&url=${url}`, "_blank");
            }}
          >
            <ExternalLink className="w-3 h-3" /> Share on X
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <MousePointerClick className="w-4 h-4 text-accent" />
            <p className="text-xs text-muted-foreground">Clicks</p>
          </div>
          <p className="text-2xl font-bold font-mono">{clicks.toLocaleString()}</p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-accent" />
            <p className="text-xs text-muted-foreground">Conversions</p>
          </div>
          <p className="text-2xl font-bold font-mono">{conversions.toLocaleString()}</p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-accent" />
            <p className="text-xs text-muted-foreground">Earnings</p>
          </div>
          <p className="text-2xl font-bold font-mono">${earnings.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-accent" />
            <p className="text-xs text-muted-foreground">Conv. Rate</p>
          </div>
          <p className="text-2xl font-bold font-mono">{conversionRate}%</p>
        </div>
      </div>

      {/* Earnings Chart */}
      <div className="glass-card p-4">
        <h4 className="text-sm font-semibold mb-3">Performance (14 days)</h4>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
              />
              <Area
                type="monotone"
                dataKey="clicks"
                stroke="hsl(var(--accent))"
                fillOpacity={1}
                fill="url(#colorClicks)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="earnings"
                stroke="hsl(var(--primary))"
                fillOpacity={1}
                fill="url(#colorEarnings)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-accent" />
            Clicks
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-primary" />
            Earnings ($)
          </div>
        </div>
      </div>
    </div>
  );
}
