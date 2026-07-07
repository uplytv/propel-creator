import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  UserCog, Search, Crown, Shield, CheckCircle, XCircle, Users,
  Link2, BarChart3, Loader2
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import BackNav from "@/components/BackNav";
import OriginBadge from "@/components/OriginBadge";
import { Sentry } from "@/lib/sentry";

type StatusFilter = "all" | "pending" | "approved" | "revoked" | "beta" | "origin";

interface UserRow {
  user_id: string;
  display_name: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  is_approved: boolean;
  beta_user: boolean;
  origin_member: boolean;
  onboarding_complete: boolean;
  referral_code: string | null;
  role_type: string;
  created_at: string;
  referral_count: number;
  referred_by_name: string | null;
  roles: string[];
  invite_codes_count?: number;
}

export default function AdminUsers() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmAction, setConfirmAction] = useState<{ type: string; label: string; ids: string[] } | null>(null);
  const [acting, setActing] = useState(false);
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users-full"],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("user_id, display_name, first_name, last_name, avatar_url, is_approved, beta_user, origin_member, onboarding_complete, referral_code, role_type, created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;

      const userIds = (profiles || []).map((p: any) => p.user_id);

      const [{ data: roles }, { data: referrals }, { data: inviteCounts }] = await Promise.all([
        supabase.from("user_roles").select("user_id, role").in("user_id", userIds),
        supabase.from("referrals").select("referrer_id, referred_id") as any,
        supabase.from("invite_codes").select("owner_id").in("owner_id", userIds),
      ]);

      const inviteCountMap: Record<string, number> = {};
      ((inviteCounts || []) as any[]).forEach((ic: any) => {
        inviteCountMap[ic.owner_id] = (inviteCountMap[ic.owner_id] || 0) + 1;
      });

      const roleMap: Record<string, string[]> = {};
      (roles || []).forEach((r: any) => {
        if (!roleMap[r.user_id]) roleMap[r.user_id] = [];
        roleMap[r.user_id].push(r.role);
      });

      // Count referrals per user
      const refCountMap: Record<string, number> = {};
      const refByMap: Record<string, string> = {};
      (referrals || []).forEach((r: any) => {
        refCountMap[r.referrer_id] = (refCountMap[r.referrer_id] || 0) + 1;
        refByMap[r.referred_id] = r.referrer_id;
      });

      // Map referred_by to names
      const nameMap: Record<string, string> = {};
      (profiles || []).forEach((p: any) => {
        nameMap[p.user_id] = p.display_name || `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Unknown";
      });

      return (profiles || []).map((p: any) => ({
        ...p,
        roles: roleMap[p.user_id] || [],
        referral_count: refCountMap[p.user_id] || 0,
        referred_by_name: refByMap[p.user_id] ? nameMap[refByMap[p.user_id]] || null : null,
        invite_codes_count: inviteCountMap[p.user_id] || 0,
      })) as UserRow[];
    },
  });

  const getStatus = (u: UserRow) => {
    if (u.origin_member) return "origin";
    if (u.beta_user) return "beta";
    if (u.is_approved) return "approved";
    return "pending";
  };

  const filtered = useMemo(() => {
    let list = users;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(u =>
        (u.display_name || "").toLowerCase().includes(q) ||
        (u.first_name || "").toLowerCase().includes(q) ||
        (u.last_name || "").toLowerCase().includes(q) ||
        (u.referral_code || "").toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") {
      list = list.filter(u => getStatus(u) === statusFilter);
    }
    return list;
  }, [users, search, statusFilter]);

  const stats = useMemo(() => ({
    total: users.length,
    pending: users.filter(u => !u.is_approved && !u.beta_user).length,
    approved: users.filter(u => u.is_approved && !u.beta_user && !u.origin_member).length,
    beta: users.filter(u => u.beta_user).length,
    origin: users.filter(u => u.origin_member).length,
  }), [users]);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(u => u.user_id)));
    }
  };

  const sendApprovalEmail = async (userIds: string[]) => {
    try {
      await supabase.functions.invoke("notify-user-approved", { body: { userIds } });
    } catch (e) {
      Sentry.captureException(e, { tags: { context: "admin_users" } });
    }
  };

  const executeAction = async (type: string, ids: string[]) => {
    setActing(true);
    try {
      if (type === "approve") {
        for (const id of ids) {
          await supabase.from("profiles").update({ is_approved: true }).eq("user_id", id);
        }
        await sendApprovalEmail(ids);
        toast.success(`Approved ${ids.length} user(s) — notification email sent`);
      } else if (type === "revoke") {
        for (const id of ids) {
          await supabase.from("profiles").update({ is_approved: false }).eq("user_id", id);
        }
        toast.success(`Revoked access for ${ids.length} user(s)`);
      } else if (type === "approve-all") {
        const pending = users.filter(u => !u.is_approved);
        const pendingIds = pending.map(u => u.user_id);
        for (const u of pending) {
          await supabase.from("profiles").update({ is_approved: true }).eq("user_id", u.user_id);
        }
        if (pendingIds.length > 0) await sendApprovalEmail(pendingIds);
        toast.success(`Approved all ${pending.length} pending users — emails sent`);
      } else if (type === "revoke-all") {
        const approved = users.filter(u => u.is_approved && !u.roles.includes("admin"));
        for (const u of approved) {
          await supabase.from("profiles").update({ is_approved: false }).eq("user_id", u.user_id);
        }
        toast.success(`Revoked access for ${approved.length} users`);
      }
      setSelected(new Set());
      queryClient.invalidateQueries({ queryKey: ["admin-users-full"] });
    } catch (err: any) {
      toast.error(err.message || "Action failed");
    }
    setActing(false);
    setConfirmAction(null);
  };

  const statusBadge = (u: UserRow) => {
    const s = getStatus(u);
    if (s === "origin") return <Badge className="bg-primary/20 text-primary border-0 text-xs"><Shield className="w-3 h-3 mr-1" /> Origin</Badge>;
    if (s === "beta") return <Badge className="bg-blue-500/20 text-blue-400 border-0 text-xs">Beta</Badge>;
    if (s === "approved") return <Badge className="bg-primary/20 text-primary border-0 text-xs"><CheckCircle className="w-3 h-3 mr-1" /> Approved</Badge>;
    return <Badge className="bg-yellow-500/20 text-yellow-400 border-0 text-xs">Pending</Badge>;
  };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-6">
        <BackNav />
        <div className="flex items-center gap-3">
          <UserCog className="w-7 h-7 text-primary" />
          <h1 className="text-2xl font-heading font-bold">Users & Access</h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: "Total", value: stats.total, color: "text-foreground" },
            { label: "Pending", value: stats.pending, color: "text-yellow-400" },
            { label: "Approved", value: stats.approved, color: "text-primary" },
            { label: "Beta", value: stats.beta, color: "text-blue-400" },
            { label: "Origin", value: stats.origin, color: "text-primary" },
          ].map(s => (
            <Card key={s.label} className="bg-card border-border">
              <CardContent className="p-4 text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by name, email, or referral code..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={statusFilter} onValueChange={v => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="beta">Beta</SelectItem>
              <SelectItem value="origin">Origin</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Bulk actions */}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={selected.size === 0 || acting}
            onClick={() => setConfirmAction({ type: "approve", label: `Approve ${selected.size} selected user(s)?`, ids: Array.from(selected) })}>
            <CheckCircle className="w-4 h-4 mr-1" /> Approve Selected ({selected.size})
          </Button>
          <Button size="sm" variant="outline" disabled={selected.size === 0 || acting}
            onClick={() => setConfirmAction({ type: "revoke", label: `Revoke access for ${selected.size} selected user(s)?`, ids: Array.from(selected) })}>
            <XCircle className="w-4 h-4 mr-1" /> Revoke Selected
          </Button>
          <Button size="sm" variant="outline" disabled={acting}
            onClick={() => setConfirmAction({ type: "approve-all", label: `Approve ALL pending users (${stats.pending})?`, ids: [] })}>
            Approve All
          </Button>
          <Button size="sm" variant="destructive" disabled={acting}
            onClick={() => setConfirmAction({ type: "revoke-all", label: "Revoke ALL non-admin users?", ids: [] })}>
            Revoke All
          </Button>
        </div>

        {/* User table */}
        {isLoading ? (
          <div className="space-y-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
        ) : (
          <Card className="bg-card border-border">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground text-left">
                      <th className="py-3 px-3"><Checkbox checked={selected.size === filtered.length && filtered.length > 0} onCheckedChange={toggleAll} /></th>
                      <th className="py-3 px-3">User</th>
                      <th className="py-3 px-3">Role</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3">Referrals</th>
                      <th className="py-3 px-3">Referred By</th>
                      <th className="py-3 px-3">Joined</th>
                      <th className="py-3 px-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(u => (
                      <tr key={u.user_id} className="border-b border-border/50 hover:bg-muted/20">
                        <td className="py-3 px-3">
                          <Checkbox checked={selected.has(u.user_id)} onCheckedChange={() => toggleSelect(u.user_id)} />
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary overflow-hidden">
                              {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover" /> : (u.display_name || "?")[0].toUpperCase()}
                            </div>
                            <div>
                              <span className="font-medium flex items-center gap-1">
                                {u.display_name || `${u.first_name || ""} ${u.last_name || ""}`.trim() || "Anonymous"}
                                {u.origin_member && <OriginBadge size="sm" />}
                                {u.roles.includes("admin") && <Crown className="w-3 h-3 text-primary" />}
                              </span>
                              {u.referral_code && <p className="text-[10px] text-muted-foreground">REF: {u.referral_code}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <Badge variant="outline" className="text-xs capitalize">{u.role_type || "member"}</Badge>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            {statusBadge(u)}
                            {u.is_approved && (
                              <span className="text-[10px] text-muted-foreground">
                                {u.invite_codes_count ?? 0}/5
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono">{u.referral_count}</td>
                        <td className="py-3 px-3 text-xs text-muted-foreground">{u.referred_by_name || "—"}</td>
                        <td className="py-3 px-3 text-xs text-muted-foreground">{format(new Date(u.created_at), "MMM d, yyyy")}</td>
                        <td className="py-3 px-3">
                          <div className="flex gap-1">
                            {!u.is_approved ? (
                              <Button size="sm" className="h-7 text-xs bg-primary text-primary-foreground hover:bg-primary/80"
                                onClick={() => setConfirmAction({ type: "approve", label: `Approve ${u.display_name}?`, ids: [u.user_id] })}>
                                Approve
                              </Button>
                            ) : (
                              <Button size="sm" variant="outline" className="h-7 text-xs"
                                disabled={u.roles.includes("admin")}
                                onClick={() => setConfirmAction({ type: "revoke", label: `Revoke ${u.display_name}'s access?`, ids: [u.user_id] })}>
                                Revoke
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No users found</p>}
            </CardContent>
          </Card>
        )}

        {/* Confirmation Dialog */}
        <AlertDialog open={!!confirmAction} onOpenChange={open => !open && setConfirmAction(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Action</AlertDialogTitle>
              <AlertDialogDescription>{confirmAction?.label}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={acting}>Cancel</AlertDialogCancel>
              <AlertDialogAction disabled={acting} onClick={() => confirmAction && executeAction(confirmAction.type, confirmAction.ids)}>
                {acting && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                Confirm
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
