import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { motion } from "framer-motion";
import {
  User, Bell, Shield, CreditCard, Palette, Mail,
  Camera, Save, Eye, EyeOff, Trash2, Download, Megaphone, Loader2, Users, Ticket, Bot,
  Sun, Moon, Monitor, Radio, Cast, Share2, Heart, Info, ExternalLink
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import AppLayout from "@/components/layout/AppLayout";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";
import { useProfile, useUpdateProfile, useUploadAvatar } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { SubscriptionsTab } from "@/components/settings/SubscriptionsTab";
import CancelSubscriptionModal from "@/components/pricing/CancelSubscriptionModal";
import { PLATFORM_PLANS, planDisplayName } from "@/components/pricing/plans";
import YouTubeImport from "@/components/classroom/YouTubeImport";
import { useMyTickets } from "@/hooks/useEvents";
import SocialProfileSection from "@/components/settings/SocialProfileSection";
import BrandingSettings from "@/components/settings/BrandingSettings";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAutoRetryPreference } from "@/hooks/useAutoRetryPreference";
import { useNavigate, useSearchParams } from "react-router-dom";
import { format, isBefore } from "date-fns";

type SettingsTab = "profile" | "social" | "notifications" | "subscriptions" | "tickets" | "aria" | "ai-team" | "simulcast" | "distribution" | "account";

const AriaSettingsSection = lazy(() => import("@/components/aria/AriaSettingsSection"));
const SimulcastSettings = lazy(() => import("@/components/settings/SimulcastSettings"));
const DistributionSettings = lazy(() => import("@/components/settings/DistributionSettings"));

const tabs = [
  { id: "profile" as const, label: "Profile", icon: User },
  { id: "social" as const, label: "Social", icon: Heart },
  { id: "notifications" as const, label: "Notifications", icon: Bell },
  { id: "subscriptions" as const, label: "Subscriptions", icon: Users },
  { id: "tickets" as const, label: "My Tickets", icon: Ticket },
  { id: "simulcast" as const, label: "Simulcast", icon: Cast },
  { id: "distribution" as const, label: "Distribution", icon: Share2 },
  { id: "aria" as const, label: "ARIA Agent", icon: Bot },
  { id: "ai-team" as const, label: "AI Team", icon: Bot },
  { id: "account" as const, label: "Account", icon: Shield },
];

function MyTicketsTab() {
  const { data: tickets, isLoading } = useMyTickets();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
    );
  }

  if (!tickets?.length) {
    return (
      <div className="text-center py-12">
        <Ticket className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <h3 className="font-semibold text-foreground mb-1">No tickets yet</h3>
        <p className="text-sm text-muted-foreground">Tickets you purchase for events will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tickets.map((t: any) => {
        const event = t.events;
        const isPast = event ? isBefore(new Date(event.ends_at), new Date()) : false;
        return (
          <div
            key={t.id}
            onClick={() => navigate(`/tickets/${t.qr_code_token}`)}
            className="flex gap-3 p-3 rounded-xl bg-card border border-border cursor-pointer hover:border-primary/40 transition-colors"
          >
            {event?.cover_image_url && (
              <img src={event.cover_image_url} alt={event.title || ""} className="w-20 h-14 rounded-lg object-cover flex-shrink-0" loading="lazy" />
            )}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-foreground truncate">{event?.title || "Event"}</h4>
              {event && (
                <p className="text-xs text-primary mt-0.5">
                  {format(new Date(event.starts_at), "EEE MMM d · h:mm a")}
                </p>
              )}
              <div className="flex items-center gap-2 mt-1">
                {t.status === "active" && <Badge variant="outline" className="bg-primary/20 text-primary text-[10px]">Active</Badge>}
                {t.status === "used" && <Badge variant="outline" className="bg-muted text-muted-foreground text-[10px]">Checked In</Badge>}
                {t.status === "refunded" && <Badge variant="outline" className="bg-destructive/20 text-destructive text-[10px]">Refunded</Badge>}
                {t.status === "canceled" && <Badge variant="outline" className="bg-destructive/20 text-destructive text-[10px]">Canceled</Badge>}
                {isPast && <Badge variant="outline" className="bg-muted text-muted-foreground text-[10px]">Ended</Badge>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function Settings() {
  const { profile: appProfile, refreshProfile } = useApp();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { prefs: campaignPrefs, updatePrefs } = useNotificationPreferences();
  const { data: dbProfile } = useProfile();
  const updateProfile = useUpdateProfile();
  const uploadAvatar = useUploadAvatar();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get("tab") as SettingsTab) || "profile";
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem("notif_sound_enabled") !== "false");
  const { enabled: autoRetryEnabled, setEnabled: setAutoRetryEnabled } = useAutoRetryPreference();
  const autoRetryRef = useRef<HTMLDivElement>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Platform subscription (Billing card): plan status, portal, cancel-retention modal
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const { data: platformSub, refetch: refetchPlatformSub } = useQuery({
    queryKey: ["platform-subscription-detail", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<{ subscribed: boolean; plan: string; subscription_end: string | null; is_trial: boolean }> => {
      const fallback = { subscribed: false, plan: "free", subscription_end: null, is_trial: false };
      try {
        const { data, error } = await supabase.functions.invoke("check-platform-subscription");
        if (error) return fallback;
        return data as { subscribed: boolean; plan: string; subscription_end: string | null; is_trial: boolean };
      } catch {
        return fallback;
      }
    },
  });

  const platformPlanLabel = planDisplayName(platformSub?.plan);

  const handleOpenBillingPortal = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-create-portal");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: any) {
      toast.error("Couldn't open billing portal", { description: err.message });
    }
    setPortalLoading(false);
  };

  const handleDeleteAccount = async () => {
    if (deleteText !== "DELETE") {
      toast.error("Type DELETE to confirm");
      return;
    }
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-account", {
        body: { confirm: "DELETE" },
      });
      if (error || (data as any)?.error) throw new Error(error?.message || (data as any)?.error || "Failed");
      toast.success("Account deleted. Goodbye 👋");
      await supabase.auth.signOut();
      window.location.href = "/";
    } catch (e: any) {
      toast.error(e.message || "Could not delete account");
      setDeleting(false);
    }
  };

  // If linked with ?highlight=auto-retry, scroll the section into view + toast
  useEffect(() => {
    if (searchParams.get("highlight") === "auto-retry" && activeTab === "account") {
      const fromRetry = searchParams.get("from") === "retry";
      const t = setTimeout(() => {
        autoRetryRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        toast.success(
          fromRetry ? "Made it on retry — section highlighted" : "Auto-retry section highlighted",
          {
            description: fromRetry
              ? "Your second attempt to open Settings worked. Toggle below to enable or disable automatic onboarding retries."
              : "Toggle below to enable or disable automatic onboarding retries.",
          }
        );
      }, 200);
      return () => clearTimeout(t);
    }
  }, [searchParams, activeTab]);

  // Profile state - initialized from DB
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [website, setWebsite] = useState("");

  // Load from DB profile
  useEffect(() => {
    if (dbProfile) {
      setName(dbProfile.display_name || "");
      setBio(dbProfile.bio || "");
      setWebsite(dbProfile.website || "");
    }
  }, [dbProfile]);

  const [saving, setSaving] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleProfileSave = async () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      await updateProfile.mutateAsync({ display_name: name, bio, website });
      refreshProfile();
      toast.success("Profile saved ✓");
    } catch {
      toast.error("Failed to save");
    }
    setSaving(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await uploadAvatar.mutateAsync(file);
      refreshProfile();
      toast.success("Avatar updated ✓");
    } catch {
      toast.error("Upload failed");
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) toast.error("Error", { description: error.message });
    else {
      toast.success("Password updated ✓");
      setNewPassword("");
    }
    setSaving(false);
  };

  const handleForgotPassword = async () => {
    if (!user?.email) return;
    setForgotLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error("Error", { description: error.message });
    else toast.success("Reset link sent to your email");
    setForgotLoading(false);
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
        <h1 className="text-2xl font-bold text-foreground mb-6">Settings</h1>

        {/* Tab bar */}
        <div className="flex gap-1 overflow-x-auto pb-1 mb-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Profile tab */}
        {activeTab === "profile" && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <div className="w-20 h-20 rounded-full bg-secondary border-2 border-border overflow-hidden">
                  {dbProfile?.avatar_url ? (
                    <img src={dbProfile.avatar_url} alt={name || ""} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <User className="w-8 h-8" />
                    </div>
                  )}
                </div>
                <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Camera className="w-5 h-5 text-white" />
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </div>
              <div>
                <p className="font-medium text-foreground">{name || "Your name"}</p>
              <p className="text-xs text-muted-foreground">@{(dbProfile as any)?.username || "username"}</p>
              </div>
            </div>

            {/* Fields */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Display Name *</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  maxLength={50}
                  className="w-full rounded-lg bg-secondary/40 border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Bio</label>
                <textarea
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  maxLength={500}
                  rows={3}
                  className="w-full rounded-lg bg-secondary/40 border border-border px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
                <p className="text-xs text-muted-foreground text-right mt-1">{bio.length}/500</p>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Website</label>
                <input
                  value={website}
                  onChange={e => setWebsite(e.target.value)}
                  placeholder="https://"
                  className="w-full rounded-lg bg-secondary/40 border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
              </div>
            </div>

            <button
              onClick={handleProfileSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Profile
            </button>

            <Separator />

            {/* Appearance */}
            <div className="rounded-2xl border border-border bg-card/40 p-6 space-y-4">
              <div className="flex items-center gap-3">
                <Palette className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Appearance</h2>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { value: "light" as const, label: "Light", icon: Sun },
                  { value: "dark" as const, label: "Dark", icon: Moon },
                  { value: "system" as const, label: "System", icon: Monitor },
                ]).map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setTheme(opt.value)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border text-sm font-medium transition-colors ${
                      theme === opt.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
                    }`}
                  >
                    <opt.icon className="w-5 h-5" />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            {/* YouTube Import */}
            {user && (
              <div className="rounded-2xl border border-border bg-card/40 p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">YouTube Import</h2>
                <YouTubeImport creatorId={user.id} />
              </div>
            )}
          </motion.div>
        )}

        {/* Social Profile tab */}
        {activeTab === "social" && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <SocialProfileSection />
          </motion.div>
        )}

        {/* Notifications tab */}
        {activeTab === "notifications" && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Email Notifications */}
            <div className="rounded-2xl border border-border bg-card/40 p-6 space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">Email Notifications</h2>
              </div>
              <p className="text-xs text-muted-foreground">Choose which emails you receive. These do not affect in-app notifications.</p>
              {[
                { key: "weekly_report_email" as const, label: "Weekly Growth Report", desc: "Summary of views, members & revenue every Monday" },
                { key: "new_follower_email" as const, label: "New Follower", desc: "Get notified when someone follows you" },
                { key: "tip_received_email" as const, label: "Tip Received", desc: "Get notified when a viewer sends you a tip" },
                { key: "member_joined_email" as const, label: "Member Joined", desc: "Get notified when someone joins your community" },
              ].map(pref => (
                <div key={pref.key} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{pref.label}</p>
                    <p className="text-xs text-muted-foreground">{pref.desc}</p>
                  </div>
                  <Switch
                    checked={campaignPrefs[pref.key] ?? true}
                    onCheckedChange={(checked) => updatePrefs({ [pref.key]: checked })}
                  />
                </div>
              ))}
            </div>

            {/* Campaign Notifications */}
            <div className="rounded-2xl border border-border bg-card/40 p-6 space-y-4">
              <div className="flex items-center gap-3">
                <Megaphone className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">Campaign Alerts</h2>
              </div>
              {[
                { key: "budget_warning" as const, label: "Budget Warnings", desc: "Alert when a campaign nears its budget limit" },
                { key: "campaign_completed" as const, label: "Campaign Completed", desc: "Get notified when a campaign finishes running" },
              ].map(pref => (
                <div key={pref.key} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{pref.label}</p>
                    <p className="text-xs text-muted-foreground">{pref.desc}</p>
                  </div>
                  <Switch
                    checked={campaignPrefs[pref.key] ?? true}
                    onCheckedChange={(checked) => updatePrefs({ [pref.key]: checked })}
                  />
                </div>
              ))}
            </div>

            {/* Live & Stream Notifications */}
            <div className="rounded-2xl border border-border bg-card/40 p-6 space-y-4">
              <div className="flex items-center gap-3">
                <Radio className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">Live & Streams</h2>
              </div>
              {[
                { key: "live_start_push" as const, label: "Creator Goes Live", desc: "Get notified when a creator you follow starts streaming" },
                { key: "stream_raid_push" as const, label: "Raids & Co-streams", desc: "Alerts when you receive a raid or co-stream invite" },
              ].map(pref => (
                <div key={pref.key} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{pref.label}</p>
                    <p className="text-xs text-muted-foreground">{pref.desc}</p>
                  </div>
                  <Switch
                    checked={localStorage.getItem(`notif_${pref.key}`) !== "false"}
                    onCheckedChange={(checked) => {
                      localStorage.setItem(`notif_${pref.key}`, String(checked));
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Purchases & Events */}
            <div className="rounded-2xl border border-border bg-card/40 p-6 space-y-4">
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">Purchases & Events</h2>
              </div>
              {[
                { key: "purchase_receipt_email" as const, label: "Purchase Receipts", desc: "Email confirmation when you buy a product or course" },
                { key: "event_reminder_push" as const, label: "Event Reminders", desc: "Reminder 1 hour before events you've RSVP'd to" },
              ].map(pref => (
                <div key={pref.key} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{pref.label}</p>
                    <p className="text-xs text-muted-foreground">{pref.desc}</p>
                  </div>
                  <Switch
                    checked={localStorage.getItem(`notif_${pref.key}`) !== "false"}
                    onCheckedChange={(checked) => {
                      localStorage.setItem(`notif_${pref.key}`, String(checked));
                    }}
                  />
                </div>
              ))}
            </div>

            {/* In-App Notifications */}
            <div className="rounded-2xl border border-border bg-card/40 p-6 space-y-4">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">In-App</h2>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Notification sounds</p>
                  <p className="text-xs text-muted-foreground">Play a sound when you receive notifications</p>
                </div>
                <Switch
                  checked={soundEnabled}
                  onCheckedChange={(checked) => {
                    setSoundEnabled(checked);
                    localStorage.setItem("notif_sound_enabled", String(checked));
                  }}
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* Subscriptions tab */}
        {activeTab === "subscriptions" && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <SubscriptionsTab />
          </motion.div>
        )}

        {/* My Tickets tab */}
        {activeTab === "tickets" && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <MyTicketsTab />
          </motion.div>
        )}

        {/* ARIA Agent tab */}
        {activeTab === "aria" && (
          <Suspense fallback={<div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>}>
            <AriaSettingsSection />
          </Suspense>
        )}

        {/* Simulcast tab */}
        {activeTab === "simulcast" && (
          <Suspense fallback={<div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>}>
            <SimulcastSettings />
          </Suspense>
        )}

        {/* Distribution tab */}
        {activeTab === "distribution" && (
          <Suspense fallback={<div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>}>
            <DistributionSettings />
          </Suspense>
        )}

        {/* AI Team tab */}
        {activeTab === "ai-team" && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <div className="rounded-2xl border border-border bg-card/40 p-6 space-y-4">
              <h2 className="text-lg font-semibold text-foreground">AI Team Settings</h2>
              <p className="text-sm text-muted-foreground">Manage your 5 AI agents from the <a href="/dashboard/ai-team" className="text-primary hover:underline">AI Team Dashboard</a>. Toggle agents on/off, review pending tasks, and monitor usage there.</p>
              <div className="rounded-xl bg-secondary/30 p-4">
                <h3 className="text-sm font-medium text-foreground mb-2">Member Opt-Out</h3>
                <p className="text-xs text-muted-foreground">Community members can opt out of automated AI messages from their notification settings. Sales AI and Community AI always respect opt-out preferences.</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Account tab */}
        {activeTab === "account" && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Onboarding auto-retry preference */}
            <div
              ref={autoRetryRef}
              className={`rounded-2xl border bg-card/40 p-6 space-y-4 transition-all ${
                searchParams.get("highlight") === "auto-retry"
                  ? "border-primary ring-2 ring-primary/40"
                  : "border-border"
              }`}
            >
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">Onboarding Submission</h2>
              </div>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-foreground">Auto-retry on submission failure</p>
                    <TooltipProvider delayDuration={150}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            aria-label="What does auto-retry do?"
                            className="text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Info className="w-3.5 h-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
                          Automatic retries kick in only when your onboarding application fails to submit
                          (e.g. network drop or server error). We wait a 5-second countdown — which you can
                          cancel — then resend automatically. Successful submissions are never retried.
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    If your onboarding application fails to submit, automatically try again after a short countdown.
                    You can always cancel or retry manually.
                  </p>
                </div>
                <Switch
                  checked={autoRetryEnabled}
                  onCheckedChange={(v) => {
                    setAutoRetryEnabled(v);
                    if (v) {
                      toast.success("Auto-retry enabled", {
                        description: "If onboarding submission fails, we'll start a 5-second countdown and retry automatically.",
                      });
                    } else {
                      toast.success("Auto-retry disabled", {
                        description: "Failed submissions will wait for you to tap Retry — no automatic countdown.",
                      });
                    }
                  }}
                  aria-label="Toggle onboarding auto-retry"
                />
              </div>
            </div>

            {/* Password */}
            <div className="rounded-2xl border border-border bg-card/40 p-6 space-y-4">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">Change Password</h2>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">New Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    maxLength={128}
                    placeholder="Min 8 characters"
                    className="w-full rounded-lg bg-secondary/40 border border-border px-3 py-2.5 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  />
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleChangePassword}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-sm font-medium hover:bg-secondary/80 transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Update Password
                </button>
                <button
                  onClick={handleForgotPassword}
                  disabled={forgotLoading}
                  className="text-xs text-primary hover:underline"
                >
                  {forgotLoading ? "Sending..." : "Forgot password?"}
                </button>
              </div>
            </div>

            {/* Billing */}
            <div className="rounded-2xl border border-border bg-card/40 p-6 space-y-4">
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">Billing</h2>
              </div>
              {platformSub?.subscribed ? (
                <>
                  <div className="flex items-center justify-between py-2 px-4 rounded-lg bg-secondary/30 border border-border">
                    <div>
                      <p className="text-sm font-medium">
                        Current Plan · {platformPlanLabel}
                        {platformSub.is_trial ? " (trial)" : ""}
                      </p>
                      {platformSub.subscription_end && (
                        <p className="text-xs text-muted-foreground">
                          Renews {new Date(platformSub.subscription_end).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Stripe portal stays the place for payment-method / invoice updates */}
                    <button
                      onClick={handleOpenBillingPortal}
                      disabled={portalLoading}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-sm font-medium hover:bg-secondary/80 transition-colors disabled:opacity-50"
                    >
                      {portalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                      Manage billing
                    </button>
                    <button
                      onClick={() => setCancelModalOpen(true)}
                      className="px-3 py-2 rounded-lg text-sm text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      Cancel subscription
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between py-2 px-4 rounded-lg bg-secondary/30 border border-border">
                  <div>
                    <p className="text-sm font-medium">Current Plan</p>
                    <p className="text-xs text-muted-foreground">Tier {appProfile.tier} · {appProfile.tierName}</p>
                  </div>
                  <span className="text-sm text-muted-foreground font-medium">Payments coming soon</span>
                </div>
              )}
            </div>

            {/* Branding / White-Label */}
            <div className="rounded-2xl border border-border bg-card/40 p-6">
              <BrandingSettings />
            </div>

            <Separator />

            {/* Danger Zone */}
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 space-y-4">
              <h2 className="text-lg font-semibold text-destructive">Danger Zone</h2>
              <div className="flex flex-wrap gap-3">
                <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm hover:bg-secondary transition-colors" disabled>
                  <Download className="w-4 h-4" /> Export Data
                </button>
                <button
                  onClick={() => { setShowDeleteConfirm(true); setDeleteText(""); }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-destructive/40 text-sm text-destructive hover:bg-destructive/10 transition-colors min-h-[44px]"
                >
                  <Trash2 className="w-4 h-4" /> Delete Account
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Deleting your account is permanent. Your profile, posts, and content will be removed.
              </p>

              {showDeleteConfirm && (
                <div className="mt-4 rounded-xl border border-destructive/40 bg-background p-4 space-y-3">
                  <p className="text-sm font-semibold text-destructive">This cannot be undone.</p>
                  <p className="text-xs text-muted-foreground">
                    Your account, profile, content, and access will be permanently deleted. Type <span className="font-mono font-bold text-foreground">DELETE</span> to confirm.
                  </p>
                  <input
                    type="text"
                    value={deleteText}
                    onChange={(e) => setDeleteText(e.target.value)}
                    placeholder="DELETE"
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm font-mono"
                    style={{ fontSize: "16px" }}
                    autoFocus
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={deleting}
                      className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-secondary transition-colors min-h-[40px]"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteAccount}
                      disabled={deleting || deleteText !== "DELETE"}
                      className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-bold hover:bg-destructive/90 transition-colors min-h-[40px] disabled:opacity-50 inline-flex items-center gap-2"
                    >
                      {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                      Permanently delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>

      <CancelSubscriptionModal
        open={cancelModalOpen}
        onOpenChange={setCancelModalOpen}
        planName={planDisplayName(platformSub?.plan)}
        onChanged={() => refetchPlatformSub()}
      />
    </AppLayout>
  );
}
