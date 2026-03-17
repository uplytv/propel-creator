import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck, Search, UserCog, Crown, BarChart3 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import BackNav from "@/components/BackNav";

export default function AdminUsers() {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-all-users"],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, bio, tier_name, total_revenue, members, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;

      // Fetch roles
      const userIds = (profiles || []).map((p: any) => p.user_id);
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds);

      const roleMap: Record<string, string[]> = {};
      (roles || []).forEach((r: any) => {
        if (!roleMap[r.user_id]) roleMap[r.user_id] = [];
        roleMap[r.user_id].push(r.role);
      });

      return (profiles || []).map((p: any) => ({
        ...p,
        roles: roleMap[p.user_id] || [],
      }));
    },
  });

  const filtered = users.filter((u: any) =>
    (u.display_name || "").toLowerCase().includes(search.toLowerCase())
  );

  const toggleRole = async (userId: string, role: string, hasRole: boolean) => {
    if (hasRole) {
      await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role as any);
      toast({ title: `Removed ${role} role` });
    } else {
      await supabase.from("user_roles").insert({ user_id: userId, role: role as any });
      toast({ title: `Added ${role} role` });
    }
    queryClient.invalidateQueries({ queryKey: ["admin-all-users"] });
  };


  // Onboarding funnel data
  const { data: funnelData = [] } = useQuery({
    queryKey: ["admin-onboarding-funnel"],
    queryFn: async () => {
      const steps = ["category_selected", "creator_type_selected", "stage_selected", "profile_created"];
      const { data, error } = await supabase
        .from("onboarding_events" as any)
        .select("step");
      if (error) throw error;
      const counts: Record<string, number> = {};
      steps.forEach(s => counts[s] = 0);
      (data || []).forEach((e: any) => {
        if (counts[e.step] !== undefined) counts[e.step]++;
      });
      return steps.map(s => ({ step: s, count: counts[s], label: s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) }));
    },
  });

  const maxFunnel = Math.max(...funnelData.map((d: any) => d.count), 1);

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 space-y-6">
        <BackNav />
        <div className="flex items-center gap-3">
          <UserCog className="w-7 h-7 text-accent-green" />
          <h1 className="text-2xl font-bold">User Management</h1>
        </div>

        {/* Onboarding Funnel Card */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <BarChart3 className="w-4 h-4" /> Onboarding Funnel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {funnelData.map((d: any, i: number) => (
                <div key={d.step} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-36 shrink-0">{d.label}</span>
                  <div className="flex-1 h-6 rounded-md bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-md bg-primary/80 flex items-center px-2"
                      style={{ width: `${Math.max((d.count / maxFunnel) * 100, 4)}%` }}
                    >
                      <span className="text-[10px] font-bold text-primary-foreground">{d.count}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {isLoading ? (
          <div className="space-y-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
        ) : (
          <Card className="bg-card border-border">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground text-left">
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4">Tier</th>
                      <th className="py-3 px-4 text-right">Revenue</th>
                      <th className="py-3 px-4">Members</th>
                      <th className="py-3 px-4">Roles</th>
                      <th className="py-3 px-4">Joined</th>
                      <th className="py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((u: any) => (
                      <tr key={u.user_id} className="border-b border-border/50 hover:bg-muted/20">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                              {(u.display_name || "?")[0].toUpperCase()}
                            </div>
                            <span className="font-medium">{u.display_name || "Anonymous"}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="text-xs">{u.tier_name}</Badge>
                        </td>
                        <td className="py-3 px-4 text-right">${Number(u.total_revenue || 0).toFixed(0)}</td>
                        <td className="py-3 px-4">{u.members}</td>
                        <td className="py-3 px-4">
                          <div className="flex gap-1">
                            {u.roles.includes("admin") && (
                              <Badge className="bg-accent-green/20 text-accent-green border-0 text-xs">
                                <Crown className="w-3 h-3 mr-1" /> Admin
                              </Badge>
                            )}
                            {u.roles.includes("moderator") && (
                              <Badge className="bg-blue-500/20 text-blue-400 border-0 text-xs">Mod</Badge>
                            )}
                            {u.roles.length === 0 && (
                              <span className="text-xs text-muted-foreground">User</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground text-xs">
                          {format(new Date(u.created_at), "MMM d, yyyy")}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant={u.roles.includes("moderator") ? "secondary" : "outline"}
                              className="h-7 text-xs"
                              onClick={() => toggleRole(u.user_id, "moderator", u.roles.includes("moderator"))}
                            >
                              {u.roles.includes("moderator") ? "- Mod" : "+ Mod"}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filtered.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">No users found</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
