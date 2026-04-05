import { useState } from "react";
import { motion } from "framer-motion";
import { Share2, Users, DollarSign, Link2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { useCreatorAffiliateProgram, useUpsertCreatorAffiliateProgram, useCreatorAffiliateMembers } from "@/hooks/useAffiliates";
import { getSiteUrl } from "@/lib/siteUrl";

export default function CreatorAffiliate() {
  const { user } = useAuth();
  const { data: program, isLoading } = useCreatorAffiliateProgram(user?.id);
  const upsert = useUpsertCreatorAffiliateProgram();
  const { data: members = [] } = useCreatorAffiliateMembers(program?.id);

  const [isActive, setIsActive] = useState(program?.is_active ?? false);
  const [commissionRate, setCommissionRate] = useState(program?.commission_rate ?? 15);
  const [cookieDays, setCookieDays] = useState(program?.cookie_duration_days ?? 30);
  const [copied, setCopied] = useState(false);

  // Sync state when data loads
  useState(() => {
    if (program) {
      setIsActive(program.is_active);
      setCommissionRate(program.commission_rate);
      setCookieDays(program.cookie_duration_days);
    }
  });

  const handleSave = () => {
    upsert.mutate(
      { is_active: isActive, commission_rate: commissionRate, cookie_duration_days: cookieDays },
      { onSuccess: () => toast.success("Affiliate program updated!") }
    );
  };

  const affiliateUrl = `${getSiteUrl()}/ref/${user?.id?.slice(0, 8)}`;

  const copyLink = () => {
    navigator.clipboard.writeText(affiliateUrl);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const totalEarnings = members.reduce((sum: number, m: any) => sum + (m.earnings || 0), 0);
  const totalConversions = members.reduce((sum: number, m: any) => sum + (m.conversions || 0), 0);

  return (
    <AppLayout>
      <div className="min-h-screen pb-24">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="max-w-lg mx-auto px-4 py-6 space-y-6">

          {/* Header */}
          <div>
            <h1 className="text-xl font-bold text-foreground">Affiliate Program</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Let your community earn by promoting your products
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Members", value: members.length, icon: Users, color: "text-primary" },
              { label: "Conversions", value: totalConversions, icon: Link2, color: "text-primary" },
              { label: "Earned", value: `$${totalEarnings.toFixed(0)}`, icon: DollarSign, color: "text-primary" },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-3 bg-card border border-border text-center">
                <s.icon className={`w-4 h-4 mx-auto mb-1 ${s.color}`} />
                <p className="text-lg font-bold text-foreground">{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Settings */}
          <div className="rounded-xl p-4 bg-card border border-border space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">Program Active</span>
              <button onClick={() => setIsActive(!isActive)}
                className={`w-11 h-6 rounded-full transition-all relative ${isActive ? "bg-primary" : "bg-secondary"}`}>
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${isActive ? "left-[22px]" : "left-0.5"}`} />
              </button>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Commission Rate: {commissionRate}%</label>
              <input type="range" min={5} max={50} step={5} value={commissionRate}
                onChange={e => setCommissionRate(Number(e.target.value))}
                className="w-full accent-primary" />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>5%</span><span>50%</span>
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Cookie Duration: {cookieDays} days</label>
              <input type="range" min={7} max={90} step={7} value={cookieDays}
                onChange={e => setCookieDays(Number(e.target.value))}
                className="w-full accent-primary" />
            </div>

            <Button onClick={handleSave} disabled={upsert.isPending} className="w-full">
              {upsert.isPending ? "Saving…" : "Save Settings"}
            </Button>
          </div>

          {/* Share Link */}
          <div className="rounded-xl p-4 bg-card border border-border space-y-3">
            <p className="text-sm font-semibold text-foreground">Your Affiliate Link</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-secondary/50 rounded-lg px-3 py-2 text-xs text-muted-foreground truncate border border-border">
                {affiliateUrl}
              </div>
              <Button size="sm" variant="outline" onClick={copyLink} className="shrink-0">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Members */}
          {members.length > 0 && (
            <div className="rounded-xl p-4 bg-card border border-border space-y-3">
              <p className="text-sm font-semibold text-foreground">Top Affiliates</p>
              {(members as any[]).slice(0, 10).map((m: any) => (
                <div key={m.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-xs font-medium text-foreground">{m.affiliate_code}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {m.clicks} clicks · {m.conversions} sales
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-primary">${(m.earnings || 0).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </AppLayout>
  );
}
