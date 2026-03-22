import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Link2, Search, Users, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import BackNav from "@/components/BackNav";

export default function AdminReferrals() {
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-referrals"],
    queryFn: async () => {
      // Get all profiles with referral codes
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, first_name, last_name, referral_code, created_at")
        .not("referral_code", "is", null)
        .order("created_at", { ascending: false })
        .limit(500);

      // Get all referrals
      const { data: referrals } = await supabase
        .from("referrals" as any)
        .select("referrer_id, referred_id, created_at") as any;

      // Count per referrer
      const countMap: Record<string, number> = {};
      (referrals || []).forEach((r: any) => {
        countMap[r.referrer_id] = (countMap[r.referrer_id] || 0) + 1;
      });

      const rows = (profiles || []).map((p: any) => ({
        user_id: p.user_id,
        name: p.display_name || `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Unknown",
        referral_code: p.referral_code,
        signups: countMap[p.user_id] || 0,
        created_at: p.created_at,
      }));

      rows.sort((a: any, b: any) => b.signups - a.signups);

      return {
        rows,
        totalReferrals: (referrals || []).length,
        totalCodes: rows.length,
        topReferrer: rows[0] || null,
      };
    },
  });

  const filtered = (data?.rows || []).filter((r: any) =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.referral_code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 space-y-6">
        <BackNav />
        <div className="flex items-center gap-3">
          <Link2 className="w-7 h-7 text-primary" />
          <h1 className="text-2xl font-heading font-bold">Referral Management</h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{data?.totalCodes || 0}</p>
              <p className="text-xs text-muted-foreground">Referral Codes</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">{data?.totalReferrals || 0}</p>
              <p className="text-xs text-muted-foreground">Total Signups via Referral</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-purple-400">{data?.topReferrer?.name || "—"}</p>
              <p className="text-xs text-muted-foreground">Top Referrer ({data?.topReferrer?.signups || 0})</p>
            </CardContent>
          </Card>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by name or code..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>

        {isLoading ? (
          <div className="space-y-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
        ) : (
          <Card className="bg-card border-border">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground text-left">
                      <th className="py-3 px-4">#</th>
                      <th className="py-3 px-4">Creator</th>
                      <th className="py-3 px-4">Referral Code</th>
                      <th className="py-3 px-4">Signups</th>
                      <th className="py-3 px-4">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r: any, i: number) => (
                      <tr key={r.user_id} className="border-b border-border/50 hover:bg-muted/20">
                        <td className="py-3 px-4 text-muted-foreground">{i + 1}</td>
                        <td className="py-3 px-4 font-medium">{r.name}</td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="font-mono text-xs">{r.referral_code}</Badge>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`font-mono ${r.signups > 0 ? "text-primary font-bold" : "text-muted-foreground"}`}>
                            {r.signups}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">
                          {format(new Date(r.created_at), "MMM d, yyyy")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No referral codes found</p>}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
