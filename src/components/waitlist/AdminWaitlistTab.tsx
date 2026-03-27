import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Users, Share2, Crown, Shield, Search, CheckCircle, Calendar } from "lucide-react";
import { toast } from "sonner";
import OriginBadge from "@/components/OriginBadge";

type StatusFilter = "all" | "beta" | "waitlist" | "approved" | "origin";

export default function AdminWaitlistTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState<"date" | "referrals" | "name">("date");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-waitlist-full"],
    queryFn: async () => {
      // Fetch profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, user_id, first_name, last_name, display_name, avatar_url, role_type, is_approved, beta_user, origin_member, onboarding_complete, created_at, referral_code, referred_by, referred_by_username")
        .eq("onboarding_complete", true)
        .order("created_at", { ascending: false })
        .limit(500) as any;

      if (!profiles) return { users: [], stats: { total: 0, beta: 0, approved: 0, waitlist: 0, origin: 0, totalReferrals: 0 } };

      // Fetch all waitlist entries for cross-referencing
      const { data: waitlistEntries } = await supabase
        .from("waitlist")
        .select("user_id, referred_by, referrer_display_name, referrer_username, referral_count")
        .limit(1000) as any;

      const waitlistMap = new Map<string, any>();
      (waitlistEntries || []).forEach((w: any) => {
        if (w.user_id) waitlistMap.set(w.user_id, w);
      });

      // Build a map of referral_code -> display_name for resolving referrers
      const refCodeToName = new Map<string, string>();
      (profiles as any[]).forEach((p: any) => {
        if (p.referral_code) refCodeToName.set(p.referral_code, p.display_name || p.first_name || "Unknown");
      });

      // Also map affiliate_links codes to user display names
      const { data: affiliateLinks } = await supabase
        .from("affiliate_links")
        .select("code, user_id")
        .limit(1000) as any;

      const affiliateCodeToUserId = new Map<string, string>();
      (affiliateLinks || []).forEach((al: any) => {
        affiliateCodeToUserId.set(al.code, al.user_id);
      });

      const profilesByUserId = new Map<string, any>();
      (profiles as any[]).forEach((p: any) => {
        profilesByUserId.set(p.user_id, p);
      });

      const enriched = await Promise.all(
        (profiles as any[]).map(async (p: any) => {
          const { count } = await supabase
            .from("referrals")
            .select("*", { count: "exact", head: true })
            .eq("referrer_id", p.user_id) as any;

          // Resolve who referred this user — check multiple sources
          let referredByName: string | null = null;

          // 1. Check waitlist entry
          const wl = waitlistMap.get(p.user_id);
          if (wl?.referred_by) {
            // Try resolving from referral_code -> profile name
            referredByName = refCodeToName.get(wl.referred_by) || null;

            // Try affiliate_links code -> user_id -> profile name
            if (!referredByName) {
              const affiliateUserId = affiliateCodeToUserId.get(wl.referred_by);
              if (affiliateUserId) {
                const affiliateProfile = profilesByUserId.get(affiliateUserId);
                referredByName = affiliateProfile?.display_name || affiliateProfile?.first_name || null;
              }
            }

            // Fall back to stored display name from waitlist
            if (!referredByName) {
              referredByName = wl.referrer_display_name || wl.referrer_username || null;
            }
          }

          // 2. Check profiles.referred_by
          if (!referredByName && p.referred_by) {
            referredByName = refCodeToName.get(p.referred_by) || null;
            if (!referredByName) {
              const affiliateUserId = affiliateCodeToUserId.get(p.referred_by);
              if (affiliateUserId) {
                const affiliateProfile = profilesByUserId.get(affiliateUserId);
                referredByName = affiliateProfile?.display_name || affiliateProfile?.first_name || null;
              }
            }
            if (!referredByName) {
              referredByName = p.referred_by_username || null;
            }
          }

          // 3. Check referrals table as last resort
          if (!referredByName) {
            const { data: refData } = await supabase
              .from("referrals")
              .select("referrer_id")
              .eq("referred_id", p.user_id)
              .maybeSingle() as any;

            if (refData?.referrer_id) {
              const referrerProfile = profilesByUserId.get(refData.referrer_id);
              referredByName = referrerProfile?.display_name || referrerProfile?.first_name || "Unknown";
            }
          }

          // Count invite codes used
          const { count: codesUsed } = await supabase
            .from("invite_codes")
            .select("*", { count: "exact", head: true })
            .eq("owner_id", p.user_id)
            .eq("is_used", true) as any;

          // Also get referral count from waitlist if available
          const waitlistRefCount = wl?.referral_count || 0;

          return {
            ...p,
            referral_count: (count || 0) + waitlistRefCount,
            referred_by_name: referredByName,
            invite_codes_used: codesUsed || 0,
          };
        })
      );

      const stats = {
        total: enriched.length,
        beta: enriched.filter((u: any) => u.beta_user).length,
        approved: enriched.filter((u: any) => u.is_approved && !u.beta_user && !u.origin_member).length,
        waitlist: enriched.filter((u: any) => !u.is_approved).length,
        origin: enriched.filter((u: any) => u.origin_member).length,
        totalReferrals: enriched.reduce((s: number, u: any) => s + u.referral_count, 0),
      };

      return { users: enriched, stats };
    },
  });

  const getStatus = (u: any): string => {
    if (u.origin_member) return "origin";
    if (u.beta_user) return "beta";
    if (u.is_approved) return "approved";
    return "waitlist";
  };

  const filteredUsers = (data?.users || [])
    .filter((u: any) => {
      if (statusFilter !== "all" && getStatus(u) !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const name = `${u.first_name || ""} ${u.last_name || ""} ${u.display_name || ""}`.toLowerCase();
        return name.includes(q);
      }
      return true;
    })
    .sort((a: any, b: any) => {
      if (sortBy === "referrals") return b.referral_count - a.referral_count;
      if (sortBy === "name") return (a.first_name || "").localeCompare(b.first_name || "");
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const updateUser = async (userId: string, updates: Record<string, any>) => {
    await supabase.from("profiles").update(updates as any).eq("user_id", userId);
    queryClient.invalidateQueries({ queryKey: ["admin-waitlist-full"] });
    toast.success("User updated");
  };

  const exportCSV = () => {
    if (!filteredUsers.length) return;
    const headers = ["Name", "Role", "Joined", "Referrals", "Status", "Referred By"];
    const rows = filteredUsers.map((u: any) => [
      `${u.first_name || ""} ${u.last_name || ""}`,
      u.role_type || "",
      new Date(u.created_at).toLocaleDateString(),
      u.referral_count,
      getStatus(u),
      u.referred_by_name || "",
    ]);
    const csv = [headers.join(","), ...rows.map((r: any) => r.map((c: any) => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "uply-users.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported");
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      beta: "bg-blue-500/10 text-blue-500 border-0",
      origin: "bg-purple-500/10 text-purple-500 border-0",
      approved: "bg-primary/10 text-primary border-0",
      waitlist: "bg-muted text-muted-foreground border-0",
    };
    return <Badge className={`text-[10px] ${styles[status] || ""}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
  };

  if (isLoading) return <div className="space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}</div>;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { label: "Total Signups", value: data?.stats.total, icon: Users },
          { label: "Beta Users", value: data?.stats.beta, icon: Shield },
          { label: "Approved", value: data?.stats.approved, icon: CheckCircle },
          { label: "Waitlist", value: data?.stats.waitlist, icon: Calendar },
          { label: "Origin", value: data?.stats.origin, icon: Crown },
          { label: "Total Referrals", value: data?.stats.totalReferrals, icon: Share2 },
        ].map((s) => (
          <Card key={s.label} className="bg-card border-border">
            <CardContent className="p-3 flex items-center gap-2">
              <s.icon className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
                <p className="text-lg font-bold">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
          <Input placeholder="Search by name..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-[130px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="beta">Beta</SelectItem>
            <SelectItem value="waitlist">Waitlist</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="origin">Origin</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
          <SelectTrigger className="w-[130px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="date">Date Joined</SelectItem>
            <SelectItem value="referrals">Referrals</SelectItem>
            <SelectItem value="name">Name</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5">
          <Download className="w-3.5 h-3.5" /> CSV
        </Button>
      </div>

      {/* User Table */}
      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-left text-xs">
                  <th className="py-2 px-3">Name</th>
                  <th className="py-2 px-3">Role</th>
                  <th className="py-2 px-3">Joined</th>
                  <th className="py-2 px-3 text-right">Referrals</th>
                  <th className="py-2 px-3">Referred By</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3">Invites</th>
                  <th className="py-2 px-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u: any) => {
                  const status = getStatus(u);
                  return (
                    <tr key={u.user_id} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          {u.avatar_url ? (
                            <img src={u.avatar_url} className="w-6 h-6 rounded-full object-cover" />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-muted" />
                          )}
                          <span className="font-medium">{u.first_name} {u.last_name}</span>
                          {u.origin_member && <OriginBadge size="sm" />}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-muted-foreground capitalize">{u.role_type || "–"}</td>
                      <td className="py-2 px-3 text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                      <td className="py-2 px-3 text-right font-semibold">{u.referral_count}</td>
                      <td className="py-2 px-3 text-muted-foreground">{u.referred_by_name || "–"}</td>
                      <td className="py-2 px-3">{statusBadge(status)}</td>
                      <td className="py-2 px-3 text-muted-foreground">{u.invite_codes_used}/5</td>
                      <td className="py-2 px-3">
                        <div className="flex gap-1">
                          {!u.is_approved && (
                            <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => updateUser(u.user_id, { is_approved: true })}>
                              Approve
                            </Button>
                          )}
                          {!u.origin_member && u.is_approved && (
                            <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => updateUser(u.user_id, { origin_member: true })}>
                              Origin
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
