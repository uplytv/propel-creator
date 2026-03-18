import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, Users, Share2, Crown } from "lucide-react";
import { toast } from "sonner";

export default function AdminWaitlistTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-waitlist"],
    queryFn: async () => {
      const [
        { count: totalApplicants },
        { data: allRows },
        { data: topReferrers },
        { data: earlyAccessUsers },
      ] = await Promise.all([
        supabase.from("waitlist" as any).select("*", { count: "exact", head: true }),
        supabase.from("waitlist" as any).select("*").order("created_at", { ascending: false }).limit(1000),
        supabase.from("waitlist" as any).select("full_name, email, referral_count").order("referral_count", { ascending: false }).limit(20),
        supabase.from("waitlist" as any).select("full_name, email, referral_count").eq("early_access", true),
      ]) as any;

      const totalReferrals = (allRows || []).reduce((s: number, r: any) => s + (r.referral_count || 0), 0);

      return {
        totalApplicants: totalApplicants || 0,
        totalReferrals,
        topReferrers: topReferrers || [],
        earlyAccessUsers: earlyAccessUsers || [],
        allRows: allRows || [],
      };
    },
  });

  const exportCSV = () => {
    if (!data?.allRows?.length) return;
    const headers = ["full_name", "email", "social_handle", "creator_type", "follower_count", "primary_platform", "referral_code", "referral_count", "position", "early_access", "created_at"];
    const csvRows = [headers.join(",")];
    data.allRows.forEach((r: any) => {
      csvRows.push(headers.map((h) => `"${(r[h] ?? "").toString().replace(/"/g, '""')}"`).join(","));
    });
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `uply-waitlist-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Waitlist exported");
  };

  if (isLoading) return <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-20" />)}</div>;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary"><Users className="w-5 h-5" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Total Applicants</p>
              <p className="text-lg font-bold">{data?.totalApplicants}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary"><Share2 className="w-5 h-5" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Total Referrals</p>
              <p className="text-lg font-bold">{data?.totalReferrals}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/10 text-yellow-500"><Crown className="w-5 h-5" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Early Access</p>
              <p className="text-lg font-bold">{data?.earlyAccessUsers.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center justify-center">
            <Button variant="outline" size="sm" className="gap-2" onClick={exportCSV}>
              <Download className="w-4 h-4" /> Export CSV
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Top Referrers */}
      <Card className="bg-card border-border">
        <CardHeader><CardTitle className="text-base">Top 20 Referrers</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-left">
                  <th className="py-2 px-2">#</th>
                  <th className="py-2 px-2">Name</th>
                  <th className="py-2 px-2">Email</th>
                  <th className="py-2 px-2 text-right">Referrals</th>
                  <th className="py-2 px-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {data?.topReferrers.map((r: any, i: number) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-2 px-2 text-primary font-bold">#{i + 1}</td>
                    <td className="py-2 px-2">{r.full_name}</td>
                    <td className="py-2 px-2 text-muted-foreground">{r.email}</td>
                    <td className="py-2 px-2 text-right font-semibold">{r.referral_count}</td>
                    <td className="py-2 px-2">
                      {r.referral_count >= 25 && <Badge className="bg-yellow-500/10 text-yellow-500 border-0 text-xs">👑 Founding</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Early Access Users */}
      {data?.earlyAccessUsers.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-base">Early Access Granted</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.earlyAccessUsers.map((u: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{u.full_name}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </div>
                  <Badge className="bg-primary/10 text-primary border-0 text-xs">{u.referral_count} referrals</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
