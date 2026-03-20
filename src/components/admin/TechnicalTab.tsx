import { AdminStatCard, AdminAlerts, fmtInt, pct } from "./AdminShared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminTechnical, DateRange } from "@/hooks/useAdminHealthData";
import { Shield, Radio, Video, Mail, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function TechnicalTab({ range }: { range: DateRange }) {
  const { data, isLoading } = useAdminTechnical(range);

  if (isLoading || !data) {
    return <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>;
  }

  const alerts = [];
  if (data.webhookSuccessRate < 95) alerts.push({ level: "critical" as const, message: `Stripe webhook success rate at ${data.webhookSuccessRate.toFixed(1)}% — below 95% threshold` });
  if (data.pendingRecordings > 5) alerts.push({ level: "warning" as const, message: `${data.pendingRecordings} stream recordings pending processing — possible Mux webhook issue` });
  if (data.failedEmails.length > 10) alerts.push({ level: "warning" as const, message: `${data.failedEmails.length} failed emails in recent period` });

  return (
    <div className="space-y-6">
      <AdminAlerts alerts={alerts} />

      {/* Stripe Health */}
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Stripe Health</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <AdminStatCard icon={Shield} label="Webhook Success Rate" value={pct(data.webhookSuccessRate)} size="lg" />
        <AdminStatCard icon={AlertTriangle} label="Failed Webhooks" value={fmtInt(data.webhookFailed.length)} />
        <AdminStatCard icon={CheckCircle} label="Active Connect Accounts" value={fmtInt(data.stripeActive)} />
        <AdminStatCard icon={XCircle} label="Pending Connect" value={fmtInt(data.stripePending)} />
      </div>

      {/* Mux Health */}
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Mux / Streaming Health</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <AdminStatCard icon={Radio} label="Active Streams Now" value={fmtInt(data.activeStreams)} size="lg" />
        <AdminStatCard icon={Video} label="Pending Recordings" value={fmtInt(data.pendingRecordings)} />
        <AdminStatCard icon={Video} label="Total Mux Assets" value={fmtInt(data.muxAssetCount)} />
        <AdminStatCard icon={Shield} label="Total Webhook Events" value={fmtInt(data.webhookTotal)} />
      </div>

      {/* Email Health */}
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Email Health</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <AdminStatCard icon={Mail} label="Total Emails Tracked" value={fmtInt(data.emailTotal)} />
        <AdminStatCard icon={AlertTriangle} label="Failed Emails" value={fmtInt(data.failedEmails.length)} />
      </div>

      {/* Failed Webhooks Table */}
      {data.webhookFailed.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-destructive">Recent Failed Webhooks</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-left">
                    <th className="py-2 px-2">Event Type</th>
                    <th className="py-2 px-2">Error</th>
                    <th className="py-2 px-2">Attempts</th>
                    <th className="py-2 px-2">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {data.webhookFailed.slice(0, 15).map((w: any, i: number) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="py-2 px-2"><Badge variant="outline" className="text-xs">{w.event_type}</Badge></td>
                      <td className="py-2 px-2 text-xs text-destructive max-w-[200px] truncate">{w.error_message || "—"}</td>
                      <td className="py-2 px-2 text-center">{w.attempts || 1}</td>
                      <td className="py-2 px-2 text-xs text-muted-foreground">{format(new Date(w.created_at), "MMM d, h:mm a")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Failed Emails Table */}
      {data.failedEmails.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-destructive">Failed Emails</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-left">
                    <th className="py-2 px-2">Recipient</th>
                    <th className="py-2 px-2">Template</th>
                    <th className="py-2 px-2">Error</th>
                    <th className="py-2 px-2">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {data.failedEmails.slice(0, 10).map((e: any, i: number) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="py-2 px-2 text-xs">{e.recipient_email}</td>
                      <td className="py-2 px-2"><Badge variant="outline" className="text-xs">{e.template_name}</Badge></td>
                      <td className="py-2 px-2 text-xs text-destructive max-w-[200px] truncate">{e.error_message || "—"}</td>
                      <td className="py-2 px-2 text-xs text-muted-foreground">{format(new Date(e.created_at), "MMM d, h:mm a")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Webhook Log */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Recent Webhook Events</CardTitle></CardHeader>
        <CardContent>
          {data.webhookLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No webhook events logged</p>
          ) : (
            <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b border-border text-muted-foreground text-left">
                    <th className="py-2 px-2">Type</th>
                    <th className="py-2 px-2">Status</th>
                    <th className="py-2 px-2">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {data.webhookLogs.slice(0, 30).map((w: any, i: number) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="py-2 px-2"><Badge variant="outline" className="text-xs">{w.event_type}</Badge></td>
                      <td className="py-2 px-2">
                        <Badge variant="outline" className={cn("text-xs border-0", w.status === "processed" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive")}>
                          {w.status}
                        </Badge>
                      </td>
                      <td className="py-2 px-2 text-xs text-muted-foreground">{format(new Date(w.created_at), "MMM d, h:mm a")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
