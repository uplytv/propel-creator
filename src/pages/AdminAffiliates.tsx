import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useAdminAffiliateStats, useMarkConversionsPaid } from "@/hooks/useAffiliates";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldCheck, Users, DollarSign, Link2, TrendingUp, Download, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { toast } from "sonner";

export default function AdminAffiliates() {
  const navigate = useNavigate();
  const { data: stats, isLoading } = useAdminAffiliateStats();
  const markPaid = useMarkConversionsPaid();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const pendingConversions = (stats?.conversions || []).filter((c: any) => c.status === "pending");

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectAll = () => {
    if (selectedIds.length === pendingConversions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pendingConversions.map((c: any) => c.id));
    }
  };

  const handleMarkPaid = async () => {
    if (selectedIds.length === 0) return;
    await markPaid.mutateAsync(selectedIds);
    setSelectedIds([]);
    toast.success(`Marked ${selectedIds.length} conversions as paid`);
  };

  const exportCSV = () => {
    const rows = pendingConversions.map((c: any) => [
      c.id,
      c.referring_user_id,
      c.referred_user_id,
      c.conversion_type,
      c.amount,
      c.commission_amount,
      c.status,
      c.created_at,
    ]);
    const header = "ID,Referring User,Referred User,Type,Amount,Commission,Status,Date";
    const csv = [header, ...rows.map((r: any) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `affiliate-payouts-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const statCards = [
    { label: "Active Affiliate Links", value: stats?.totalLinks ?? 0, icon: Link2 },
    { label: "Signups This Month", value: stats?.monthlySignups ?? 0, icon: Users },
    { label: "Pending Commissions", value: `$${(stats?.pendingCommissions ?? 0).toFixed(2)}`, icon: DollarSign },
  ];

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-7 h-7 text-accent-green" />
            <h1 className="text-2xl font-bold">Admin — Affiliates</h1>
          </div>
          <Button size="sm" variant="outline" onClick={() => navigate("/admin")}>← Back</Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {statCards.map((s, i) => (
                <Card key={i} className="bg-card border-border">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary"><s.icon className="w-5 h-5" /></div>
                    <div>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                      <p className="text-lg font-bold">{s.value}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Tabs defaultValue="top">
              <TabsList className="bg-card border border-border">
                <TabsTrigger value="top">Top Affiliates</TabsTrigger>
                <TabsTrigger value="pending">Pending Payouts ({pendingConversions.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="top">
                <Card className="bg-card border-border">
                  <CardHeader><CardTitle className="text-base">Top 10 by Signups</CardTitle></CardHeader>
                  <CardContent>
                    {(stats?.topBySignups || []).length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No affiliates yet</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>#</TableHead>
                            <TableHead>User ID</TableHead>
                            <TableHead>Code</TableHead>
                            <TableHead>Clicks</TableHead>
                            <TableHead>Signups</TableHead>
                            <TableHead className="text-right">Revenue</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {stats!.topBySignups.map((link: any, i: number) => (
                            <TableRow key={link.id}>
                              <TableCell className="font-bold">{i + 1}</TableCell>
                              <TableCell className="font-mono text-xs">{link.user_id.substring(0, 8)}…</TableCell>
                              <TableCell className="font-mono text-xs">{link.code}</TableCell>
                              <TableCell>{link.clicks}</TableCell>
                              <TableCell>{link.signups}</TableCell>
                              <TableCell className="text-right font-mono">${Number(link.revenue_generated).toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="pending">
                <Card className="bg-card border-border">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Pending Commission Payouts</CardTitle>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={exportCSV} className="gap-1.5">
                          <Download className="w-3.5 h-3.5" /> Export CSV
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleMarkPaid}
                          disabled={selectedIds.length === 0 || markPaid.isPending}
                          className="gap-1.5"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Mark Paid ({selectedIds.length})
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {pendingConversions.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No pending payouts</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-10">
                              <Checkbox
                                checked={selectedIds.length === pendingConversions.length && pendingConversions.length > 0}
                                onCheckedChange={selectAll}
                              />
                            </TableHead>
                            <TableHead>Referrer</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Commission</TableHead>
                            <TableHead>Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pendingConversions.map((conv: any) => (
                            <TableRow key={conv.id}>
                              <TableCell>
                                <Checkbox
                                  checked={selectedIds.includes(conv.id)}
                                  onCheckedChange={() => toggleSelection(conv.id)}
                                />
                              </TableCell>
                              <TableCell className="font-mono text-xs">{conv.referring_user_id.substring(0, 8)}…</TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="text-xs">{conv.conversion_type}</Badge>
                              </TableCell>
                              <TableCell className="font-mono">${Number(conv.amount).toFixed(2)}</TableCell>
                              <TableCell className="font-mono font-bold">${Number(conv.commission_amount).toFixed(2)}</TableCell>
                              <TableCell className="text-xs">{format(new Date(conv.created_at), "MMM d, yyyy")}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </AppLayout>
  );
}
