import { motion } from "framer-motion";
import { Trophy, DollarSign, Users, TrendingUp, Share2, ArrowRight, Copy, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import AppLayout from "@/components/layout/AppLayout";

const mockAffiliates = [
  { id: 1, name: "Sarah Chen", avatar: "SC", sales: 47, revenue: 9400, commission: 2820 },
  { id: 2, name: "Marcus Lee", avatar: "ML", sales: 31, revenue: 6200, commission: 1860 },
  { id: 3, name: "Jordan Kim", avatar: "JK", sales: 22, revenue: 4400, commission: 1320 },
  { id: 4, name: "Alex Rivera", avatar: "AR", sales: 18, revenue: 3600, commission: 1080 },
  { id: 5, name: "Taylor Swift", avatar: "TS", sales: 12, revenue: 2400, commission: 720 },
];

export default function Affiliates() {
  const [copied, setCopied] = useState(false);
  const isEmpty = false;

  const totalAffiliates = mockAffiliates.length;
  const totalRevenue = mockAffiliates.reduce((s, a) => s + a.revenue, 0);

  const stats = [
    { label: "Total Affiliates", value: totalAffiliates.toString(), icon: Users },
    { label: "Revenue via Affiliates", value: `$${totalRevenue.toLocaleString()}`, icon: DollarSign },
    { label: "Avg. Commission", value: "30%", icon: TrendingUp },
  ];

  const handleCopy = () => {
    navigator.clipboard.writeText("https://platform.com/ref/creator123");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl md:text-3xl font-bold">Affiliates</h1>
          <p className="text-muted-foreground mt-1">Gamified leaderboard · Real-time tracking</p>
        </motion.div>

        {/* Referral Link */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card p-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Your Referral Link</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 px-4 py-2.5 rounded-lg bg-secondary border border-border text-sm font-mono text-muted-foreground truncate">
              https://platform.com/ref/creator123
            </div>
            <Button variant="default" size="sm" onClick={handleCopy} className="flex items-center gap-1.5 flex-shrink-0">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </motion.div>

        {isEmpty ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-12 text-center">
            <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Share2 className="w-7 h-7 text-primary" />
            </div>
            <h3 className="text-lg font-bold mb-2">Grow with affiliate partners</h3>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-5">
              Let your customers become your salesforce. Set up affiliate links with custom commission rates and track performance in real-time.
            </p>
            <Button variant="hero">
              Invite Your First Affiliate <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </motion.div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              {stats.map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 + i * 0.05 }}
                    className="glass-card p-4"
                  >
                    <Icon className="w-4 h-4 text-muted-foreground mb-2" />
                    <p className="text-xl md:text-2xl font-bold font-mono">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </motion.div>
                );
              })}
            </div>

            {/* Leaderboard */}
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card overflow-hidden">
              <div className="p-5 border-b border-border flex items-center gap-2">
                <Trophy className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold">Top Affiliates</h3>
              </div>
              <div className="divide-y divide-border">
                {mockAffiliates.map((affiliate, i) => (
                  <motion.div
                    key={affiliate.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.25 + i * 0.05 }}
                    className="flex items-center justify-between px-5 py-4 hover:bg-secondary/30 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <span className={`text-lg font-bold font-mono w-6 ${i < 3 ? "text-primary" : "text-muted-foreground"}`}>{i + 1}</span>
                      <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-xs font-bold">
                        {affiliate.avatar}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{affiliate.name}</p>
                        <p className="text-xs text-muted-foreground">{affiliate.sales} sales</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right hidden md:block">
                        <p className="text-sm font-semibold font-mono">${affiliate.revenue.toLocaleString()}</p>
                        <p className="text-[10px] text-muted-foreground">revenue</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold font-mono text-primary">${affiliate.commission.toLocaleString()}</p>
                        <p className="text-[10px] text-muted-foreground">earned</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
