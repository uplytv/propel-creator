import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Settings, Shield, Rocket, Globe, Bell, Send } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import BackNav from "@/components/BackNav";
import { useAdminNotifConfig } from "@/hooks/useAdminNotifications";
import CriticalAlertBanner from "@/components/admin/CriticalAlertBanner";

const EVENT_DESCRIPTIONS: Record<string, { label: string; description: string }> = {
  admin_new_user: { label: "New User Signup", description: "When a new user creates an account" },
  admin_new_creator: { label: "New Creator Space", description: "When a creator launches their community" },
  admin_new_subscription: { label: "New Paid Member", description: "When someone subscribes to a creator" },
  admin_subscription_canceled: { label: "Subscription Canceled", description: "When a member cancels" },
  admin_new_transaction: { label: "New Transaction", description: "When revenue flows through the platform" },
  admin_new_waitlist: { label: "New Waitlist Application", description: "When someone applies to the waitlist" },
  admin_stream_started: { label: "Stream Started", description: "When a creator goes live" },
  admin_stripe_failure: { label: "Stripe Webhook Failure", description: "When a payment webhook fails" },
  admin_stripe_verified: { label: "Creator Stripe Verified", description: "When a creator completes Stripe onboarding" },
  admin_new_tip: { label: "New Tip", description: "When a viewer sends a tip" },
  admin_ticket_sold: { label: "Ticket Sold", description: "When an event ticket is purchased" },
  admin_dns_failure: { label: "DNS Failure", description: "When email delivery DNS fails" },
  admin_payment_rate_low: { label: "Low Payment Rate", description: "When payment success drops below 90%" },
};

const BATCH_OPTIONS = [
  { label: "Instant", value: "0" },
  { label: "1 min", value: "60" },
  { label: "2 min", value: "120" },
  { label: "5 min", value: "300" },
  { label: "15 min", value: "900" },
];

export default function AdminSettings() {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const { configs, isLoading: configLoading, updateConfig } = useAdminNotifConfig();

  const { data: launchConfig, isLoading } = useQuery({
    queryKey: ["launch-config"],
    queryFn: async () => {
      const { data } = await supabase.from("launch_config").select("*").limit(1).single();
      return data;
    },
  });

  const toggleLaunch = async () => {
    if (!launchConfig) return;
    setSaving(true);
    const { error } = await supabase
      .from("launch_config")
      .update({ is_launched: !launchConfig.is_launched })
      .eq("id", launchConfig.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: launchConfig.is_launched ? "Platform set to pre-launch" : "Platform launched!" });
      queryClient.invalidateQueries({ queryKey: ["launch-config"] });
    }
    setSaving(false);
  };

  const { data: platformStats } = useQuery({
    queryKey: ["admin-platform-stats"],
    queryFn: async () => {
      const [{ count: totalWaitlist }, { count: totalUsers }] = await Promise.all([
        supabase.from("waitlist").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
      ]);
      return { totalWaitlist: totalWaitlist || 0, totalUsers: totalUsers || 0 };
    },
  });

  const handleSendTest = async (eventType: string) => {
    const desc = EVENT_DESCRIPTIONS[eventType];
    await supabase.rpc("insert_admin_notification" as any, {
      p_user_id: (await supabase.auth.getUser()).data.user?.id,
      p_type: eventType,
      p_title: `🧪 Test: ${desc?.label || eventType}`,
      p_message: `This is a test notification for ${desc?.label || eventType}`,
      p_link: "/admin/settings",
    });
    toast({ title: "Test notification sent!" });
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 space-y-6">
        <CriticalAlertBanner />
        <BackNav />
        <div className="flex items-center gap-3">
          <Settings className="w-7 h-7 text-accent-green" />
          <h1 className="text-2xl font-bold">Platform Settings</h1>
        </div>

        {isLoading ? (
          <div className="space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full" />)}</div>
        ) : (
          <div className="space-y-6">
            {/* Launch Control */}
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Rocket className="w-5 h-5 text-accent-green" />
                  <CardTitle className="text-base">Launch Control</CardTitle>
                </div>
                <CardDescription>Toggle between pre-launch (waitlist mode) and fully launched.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Platform Status</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      {launchConfig?.is_launched ? "Platform is live" : "Pre-launch mode — waitlist only."}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{launchConfig?.is_launched ? "Launched" : "Pre-launch"}</span>
                    <Switch checked={launchConfig?.is_launched || false} onCheckedChange={toggleLaunch} disabled={saving} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3 rounded-lg bg-muted/30 text-center">
                    <p className="text-xl font-bold">{platformStats?.totalWaitlist}</p>
                    <p className="text-xs text-muted-foreground">Waitlist Signups</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30 text-center">
                    <p className="text-xl font-bold">{platformStats?.totalUsers}</p>
                    <p className="text-xs text-muted-foreground">Registered Users</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notification Preferences */}
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-primary" />
                  <CardTitle className="text-base">Notification Preferences</CardTitle>
                </div>
                <CardDescription>Configure how you receive admin alerts for each event type.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1">
                {/* Table header */}
                <div className="grid grid-cols-[1fr_60px_60px_60px_80px_100px_60px] gap-2 text-[10px] text-muted-foreground uppercase tracking-wider pb-2 border-b border-border">
                  <span>Event</span>
                  <span className="text-center">In-App</span>
                  <span className="text-center">Email</span>
                  <span className="text-center">Push</span>
                  <span className="text-center">Min $</span>
                  <span className="text-center">Batch</span>
                  <span className="text-center">Test</span>
                </div>

                {Object.entries(EVENT_DESCRIPTIONS).map(([eventType, { label, description }]) => {
                  const config = configs.find(c => c.event_type === eventType);
                  return (
                    <div key={eventType} className="grid grid-cols-[1fr_60px_60px_60px_80px_100px_60px] gap-2 items-center py-2 border-b border-border/30">
                      <div>
                        <p className="text-sm font-medium">{label}</p>
                        <p className="text-[11px] text-muted-foreground">{description}</p>
                      </div>
                      <div className="flex justify-center">
                        <Switch
                          checked={config?.in_app_enabled ?? true}
                          onCheckedChange={(v) => updateConfig({ event_type: eventType, field: "in_app_enabled", value: v })}
                          className="scale-75"
                        />
                      </div>
                      <div className="flex justify-center">
                        <Switch
                          checked={config?.email_enabled ?? false}
                          onCheckedChange={(v) => updateConfig({ event_type: eventType, field: "email_enabled", value: v })}
                          className="scale-75"
                        />
                      </div>
                      <div className="flex justify-center">
                        <Switch
                          checked={config?.push_enabled ?? false}
                          onCheckedChange={(v) => updateConfig({ event_type: eventType, field: "push_enabled", value: v })}
                          className="scale-75"
                        />
                      </div>
                      <div className="flex justify-center">
                        <Input
                          type="number"
                          className="h-7 w-16 text-xs bg-background text-center"
                          value={config?.min_amount ?? 0}
                          onChange={(e) => updateConfig({ event_type: eventType, field: "min_amount", value: Number(e.target.value) })}
                        />
                      </div>
                      <div className="flex justify-center">
                        <Select
                          value={String(config?.batch_window_seconds ?? 0)}
                          onValueChange={(v) => updateConfig({ event_type: eventType, field: "batch_window_seconds", value: Number(v) })}
                        >
                          <SelectTrigger className="h-7 text-xs w-20 bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {BATCH_OPTIONS.map(o => (
                              <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex justify-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs gap-1 text-primary"
                          onClick={() => handleSendTest(eventType)}
                        >
                          <Send className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Security */}
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  <CardTitle className="text-base">Security & Access</CardTitle>
                </div>
                <CardDescription>Role-based access control overview.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Admin access is controlled via the <code className="text-xs bg-muted px-1 rounded">user_roles</code> table.
                </p>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>• <strong>Admin</strong> — Full platform access, payout approvals, user management</p>
                  <p>• <strong>Moderator</strong> — Content moderation, community management</p>
                  <p>• <strong>User</strong> — Default role for all creators</p>
                </div>
              </CardContent>
            </Card>

            {/* Platform Info */}
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-primary" />
                  <CardTitle className="text-base">Platform Info</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <div className="flex justify-between"><span>Total Waitlist Applicants</span><span className="font-medium text-foreground">{launchConfig?.total_applicants || 0}</span></div>
                <div className="flex justify-between"><span>Platform Fee (Subscriptions)</span><span className="font-medium text-foreground">3%</span></div>
                <div className="flex justify-between"><span>Platform Fee (Marketplace)</span><span className="font-medium text-foreground">10%</span></div>
                <div className="flex justify-between"><span>Platform Fee (Tips)</span><span className="font-medium text-foreground">5%</span></div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
