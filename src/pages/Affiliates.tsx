import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Copy, Check, Share2, Users, DollarSign, MousePointerClick, Clock, ExternalLink } from "lucide-react";
import { buildReferralUrl } from "@/lib/referralUrls";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import AppLayout from "@/components/layout/AppLayout";
import EventPromoCard from "@/components/affiliates/EventPromoCard";
import { useAffiliateLink, useAffiliateStats } from "@/hooks/useAffiliates";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

export default function Affiliates() {
  const [copied, setCopied] = useState(false);
  const { data: linkData, isLoading: linkLoading } = useAffiliateLink();
  const { data: stats, isLoading: statsLoading } = useAffiliateStats();

  const isLoading = linkLoading || statsLoading;
  // Fetch profile for username-based referral URLs
  const [profileUsername, setProfileUsername] = useState<string | null>(null);
  useEffect(() => {
    const fetchUsername = async () => {
      if (!linkData?.code) return;
      const { data } = await supabase.from("profiles").select("username, display_name").eq("user_id", linkData.id?.split?.("-")?.[0] || "").maybeSingle();
      // Fallback: get from auth
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: prof } = await supabase.from("profiles").select("username, display_name").eq("user_id", user.id).maybeSingle();
        if (prof) setProfileUsername((prof as any).username || (prof as any).display_name);
      }
    };
    fetchUsername();
  }, [linkData]);
  const referralLink = linkData?.code ? buildReferralUrl(linkData.code, profileUsername) : "";

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareTwitter = () => {
    const text = encodeURIComponent("Join me on UPLY — the creator monetization platform! 🚀");
    const url = encodeURIComponent(referralLink);
    window.open(`https://x.com/intent/tweet?text=${text}&url=${url}`, "_blank");
  };

  const statCards = [
    { label: "Total Clicks", value: stats?.totalClicks ?? 0, icon: MousePointerClick },
    { label: "Total Signups", value: stats?.totalSignups ?? 0, icon: Users },
    { label: "Total Earnings", value: `$${(stats?.totalEarnings ?? 0).toFixed(2)}`, icon: DollarSign },
    { label: "Pending Payout", value: `$${(stats?.pendingEarnings ?? 0).toFixed(2)}`, icon: Clock },
  ];

  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl md:text-3xl font-bold">Referrals</h1>
          <p className="text-muted-foreground mt-1">Refer creators to UPLY and earn 20% commission on their revenue.</p>
        </motion.div>

        {/* Referral Link */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card p-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Your Referral Link</p>
          {isLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex-1 px-4 py-2.5 rounded-lg bg-secondary border border-border text-sm font-mono text-muted-foreground truncate">
                {referralLink}
              </div>
              <Button variant="default" size="sm" onClick={handleCopy} className="flex items-center gap-1.5 flex-shrink-0">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          )}
          <div className="flex gap-2 mt-3">
            <Button variant="outline" size="sm" onClick={handleShareTwitter} className="gap-1.5 text-xs">
              <ExternalLink className="w-3.5 h-3.5" /> Share on X
            </Button>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {statCards.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                className="glass-card p-4"
              >
                <Icon className="w-4 h-4 text-muted-foreground mb-2" />
                {isLoading ? (
                  <Skeleton className="h-7 w-16" />
                ) : (
                  <p className="text-xl font-bold font-mono">{stat.value}</p>
                )}
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Event promoter links (self-hides unless this user promotes events) */}
        <EventPromoCard />

        {/* Conversions Table */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card overflow-hidden">
          <div className="p-5 border-b border-border">
            <h3 className="text-sm font-semibold">Conversion History</h3>
          </div>
          {isLoading ? (
            <div className="p-5 space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (stats?.conversions?.length || 0) === 0 ? (
            <div className="p-12 text-center">
              <Share2 className="w-8 h-8 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No conversions yet. Share your link to start earning!</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Referred User</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Commission</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats!.conversions.map((conv: any, i: number) => (
                  <TableRow key={conv.id}>
                    <TableCell className="font-mono text-xs">Creator #{i + 1}</TableCell>
                    <TableCell className="text-xs">{format(new Date(conv.created_at), "MMM d, yyyy")}</TableCell>
                    <TableCell>
                      <Badge variant={conv.conversion_type === "signup" ? "secondary" : "default"} className="text-xs">
                        {conv.conversion_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">${Number(conv.commission_amount).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={conv.status === "paid" ? "default" : "outline"} className="text-xs">
                        {conv.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </motion.div>
      </div>
    </AppLayout>
  );
}
