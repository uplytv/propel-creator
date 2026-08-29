import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import AppLayout from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  ShieldCheck, Users, DollarSign, ToggleLeft, Link2, Share2,
  RefreshCw, BarChart3, Heart, Radio, Zap, Shield, TrendingUp, ListChecks, Settings
} from "lucide-react";
import { DateRange } from "@/hooks/useAdminHealthData";
import OverviewTab from "@/components/admin/OverviewTab";
import GrowthTab from "@/components/admin/GrowthTab";
import RevenueTab from "@/components/admin/RevenueTab";
import CreatorsTab from "@/components/admin/CreatorsTab";
import MembersTab from "@/components/admin/MembersTab";
import ContentTab from "@/components/admin/ContentTab";
import EngagementTab from "@/components/admin/EngagementTab";
import TechnicalTab from "@/components/admin/TechnicalTab";
import AdminWaitlistTab from "@/components/waitlist/AdminWaitlistTab";
import AdminNotificationBell from "@/components/admin/AdminNotificationBell";
import CriticalAlertBanner from "@/components/admin/CriticalAlertBanner";
import SystemHealthCard from "@/components/admin/SystemHealthCard";

const DATE_RANGES: { label: string; value: DateRange }[] = [
  { label: "Today", value: "today" },
  { label: "7 Days", value: "7d" },
  { label: "30 Days", value: "30d" },
  { label: "90 Days", value: "90d" },
  { label: "All Time", value: "all" },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [range, setRange] = useState<DateRange>("30d");
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const [secondsAgo, setSecondsAgo] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastRefresh) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [lastRefresh]);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    queryClient.invalidateQueries({ queryKey: ["admin-growth"] });
    queryClient.invalidateQueries({ queryKey: ["admin-revenue"] });
    queryClient.invalidateQueries({ queryKey: ["admin-creators"] });
    queryClient.invalidateQueries({ queryKey: ["admin-members"] });
    queryClient.invalidateQueries({ queryKey: ["admin-content"] });
    queryClient.invalidateQueries({ queryKey: ["admin-engagement"] });
    queryClient.invalidateQueries({ queryKey: ["admin-technical"] });
    setLastRefresh(Date.now());
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-4">
        {/* Critical Alert Banner */}
        <CriticalAlertBanner />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-7 h-7 text-primary" />
            <h1 className="text-2xl font-heading font-bold">Platform Health</h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <AdminNotificationBell />
            <Button size="sm" variant="outline" onClick={() => navigate("/admin/users")}>
              <Users className="w-4 h-4 mr-1" /> Users
            </Button>
            <Button size="sm" variant="outline" onClick={() => navigate("/admin/leads")}>
              <Inbox className="w-4 h-4 mr-1" /> Leads
            </Button>
            <Button size="sm" variant="outline" onClick={() => navigate("/admin/payouts")}>
              <DollarSign className="w-4 h-4 mr-1" /> Payouts
            </Button>
            <Button size="sm" variant="outline" onClick={() => navigate("/admin/features")}>
              <ToggleLeft className="w-4 h-4 mr-1" /> Features
            </Button>
            <Button size="sm" variant="outline" onClick={() => navigate("/admin/affiliates")}>
              <Link2 className="w-4 h-4 mr-1" /> Affiliates
            </Button>
            <Button size="sm" variant="outline" onClick={() => navigate("/admin/referrals")}>
              <Share2 className="w-4 h-4 mr-1" /> Referrals
            </Button>
            <Button size="sm" variant="outline" onClick={() => navigate("/admin/settings")}>
              <Settings className="w-4 h-4 mr-1" /> Settings
            </Button>
          </div>
        </div>

        {/* Date Range + Refresh */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex gap-1 flex-wrap">
            {DATE_RANGES.map((r) => (
              <Button
                key={r.value}
                size="sm"
                variant={range === r.value ? "default" : "ghost"}
                className="text-xs h-7"
                onClick={() => setRange(r.value)}
              >
                {r.label}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              Updated {secondsAgo}s ago
            </span>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={handleRefresh}>
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* System Health (live probe via health-check edge function) */}
        <SystemHealthCard />

        {/* Main Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="bg-card border border-border flex-wrap h-auto gap-0.5 p-1">
            <TabsTrigger value="overview" className="text-xs gap-1"><BarChart3 className="w-3.5 h-3.5" /> Overview</TabsTrigger>
            <TabsTrigger value="growth" className="text-xs gap-1"><TrendingUp className="w-3.5 h-3.5" /> Growth</TabsTrigger>
            <TabsTrigger value="revenue" className="text-xs gap-1"><DollarSign className="w-3.5 h-3.5" /> Revenue</TabsTrigger>
            <TabsTrigger value="creators" className="text-xs gap-1"><Users className="w-3.5 h-3.5" /> Creators</TabsTrigger>
            <TabsTrigger value="members" className="text-xs gap-1"><Heart className="w-3.5 h-3.5" /> Members</TabsTrigger>
            <TabsTrigger value="content" className="text-xs gap-1"><Radio className="w-3.5 h-3.5" /> Content</TabsTrigger>
            <TabsTrigger value="engagement" className="text-xs gap-1"><Zap className="w-3.5 h-3.5" /> Engagement</TabsTrigger>
            <TabsTrigger value="technical" className="text-xs gap-1"><Shield className="w-3.5 h-3.5" /> Technical</TabsTrigger>
            <TabsTrigger value="waitlist" className="text-xs gap-1"><ListChecks className="w-3.5 h-3.5" /> Waitlist</TabsTrigger>
          </TabsList>

          <TabsContent value="overview"><OverviewTab range={range} /></TabsContent>
          <TabsContent value="growth"><GrowthTab range={range} /></TabsContent>
          <TabsContent value="revenue"><RevenueTab range={range} /></TabsContent>
          <TabsContent value="creators"><CreatorsTab range={range} /></TabsContent>
          <TabsContent value="members"><MembersTab range={range} /></TabsContent>
          <TabsContent value="content"><ContentTab range={range} /></TabsContent>
          <TabsContent value="engagement"><EngagementTab range={range} /></TabsContent>
          <TabsContent value="technical"><TechnicalTab range={range} /></TabsContent>
          <TabsContent value="waitlist"><AdminWaitlistTab /></TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
