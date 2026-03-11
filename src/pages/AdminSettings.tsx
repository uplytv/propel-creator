import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Settings, Shield, Rocket, Globe } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import BackNav from "@/components/BackNav";

export default function AdminSettings() {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

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

  // Platform stats summary
  const { data: platformStats } = useQuery({
    queryKey: ["admin-platform-stats"],
    queryFn: async () => {
      const [
        { count: totalWaitlist },
        { count: totalUsers },
      ] = await Promise.all([
        supabase.from("waitlist").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
      ]);
      return { totalWaitlist: totalWaitlist || 0, totalUsers: totalUsers || 0 };
    },
  });

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 md:px-8 py-8 space-y-6">
        <BackNav />
        <div className="flex items-center gap-3">
          <Settings className="w-7 h-7 text-accent-green" />
          <h1 className="text-2xl font-bold">Platform Settings</h1>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Launch Control */}
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Rocket className="w-5 h-5 text-accent-green" />
                  <CardTitle className="text-base">Launch Control</CardTitle>
                </div>
                <CardDescription>
                  Toggle between pre-launch (waitlist mode) and fully launched.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Platform Status</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      {launchConfig?.is_launched
                        ? "Platform is live — users can sign up and access all features."
                        : "Pre-launch mode — only waitlist signups are allowed."}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {launchConfig?.is_launched ? "Launched" : "Pre-launch"}
                    </span>
                    <Switch
                      checked={launchConfig?.is_launched || false}
                      onCheckedChange={toggleLaunch}
                      disabled={saving}
                    />
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
                  Assign roles from the <strong>User Management</strong> page.
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
                <div className="flex justify-between">
                  <span>Total Waitlist Applicants</span>
                  <span className="font-medium text-foreground">{launchConfig?.total_applicants || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Platform Fee (Subscriptions)</span>
                  <span className="font-medium text-foreground">3%</span>
                </div>
                <div className="flex justify-between">
                  <span>Platform Fee (Marketplace)</span>
                  <span className="font-medium text-foreground">10%</span>
                </div>
                <div className="flex justify-between">
                  <span>Platform Fee (Tips)</span>
                  <span className="font-medium text-foreground">5%</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
