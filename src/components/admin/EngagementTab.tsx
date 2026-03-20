import { AdminStatCard, fmtInt, pct, fmt } from "./AdminShared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminEngagement, DateRange } from "@/hooks/useAdminHealthData";
import { Heart, MessageSquare, DollarSign, Mail, Send, Link2, Target } from "lucide-react";

export default function EngagementTab({ range }: { range: DateRange }) {
  const { data, isLoading } = useAdminEngagement(range);

  if (isLoading || !data) {
    return <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>;
  }

  const unsubRate = data.emailsSent > 0 ? (data.unsubscribes / data.emailsSent) * 100 : 0;

  return (
    <div className="space-y-6">
      {data.emailDeliveryRate < 95 && (
        <div className="px-4 py-2.5 rounded-lg border bg-destructive/10 border-destructive/30 text-destructive text-sm">
          🔴 Email delivery rate at {data.emailDeliveryRate.toFixed(1)}% — below 95% threshold, deliverability issue detected
        </div>
      )}
      {unsubRate > 0.5 && (
        <div className="px-4 py-2.5 rounded-lg border bg-warning/10 border-warning/30 text-warning text-sm">
          🟡 Email unsubscribe rate at {unsubRate.toFixed(2)}% — above 0.5% warning threshold
        </div>
      )}

      {/* Live Engagement */}
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Live Engagement</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <AdminStatCard icon={Heart} label="Reactions Sent" value={fmtInt(data.reactions)} />
        <AdminStatCard icon={MessageSquare} label="Chat Messages" value={fmtInt(data.chatMsgs)} />
        <AdminStatCard icon={DollarSign} label="Tips Sent" value={fmtInt(data.tips)} />
        <AdminStatCard icon={DollarSign} label="Total Tip Amount" value={fmt(data.totalTipAmount)} />
      </div>

      {/* Email Engagement */}
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Email Engagement</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <AdminStatCard icon={Mail} label="Emails Sent" value={fmtInt(data.emailsSent)} />
        <AdminStatCard icon={Mail} label="Delivery Rate" value={pct(data.emailDeliveryRate)} />
        <AdminStatCard icon={Send} label="Blasts Sent" value={fmtInt(data.blastsSent)} />
        <AdminStatCard icon={Send} label="Avg Blast Recipients" value={data.avgBlastRecipients.toFixed(0)} />
      </div>

      {/* Affiliate Engagement */}
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Affiliate Program</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <AdminStatCard icon={Link2} label="Referral Links" value={fmtInt(data.affiliateLinks)} />
        <AdminStatCard icon={Target} label="Total Clicks" value={fmtInt(data.totalClicks)} />
        <AdminStatCard icon={Target} label="Conversions" value={fmtInt(data.totalAffConversions)} />
        <AdminStatCard icon={DollarSign} label="Commission Paid" value={fmt(data.commissionPaid)} />
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Affiliate Conversion Rate</span>
            <span className="font-heading font-bold">{pct(data.affiliateRate)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
