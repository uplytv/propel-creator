import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { motion } from "framer-motion";
import {
  User, Bell, Shield, CreditCard, Palette, Mail,
  Camera, Save, Eye, EyeOff, Trash2, Download, Megaphone, Loader2, Users, Ticket, Bot
} from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";
import { useProfile, useUpdateProfile, useUploadAvatar } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { SubscriptionsTab } from "@/components/settings/SubscriptionsTab";
import YouTubeImport from "@/components/classroom/YouTubeImport";
import { useMyTickets } from "@/hooks/useEvents";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { format, isBefore } from "date-fns";

type SettingsTab = "profile" | "notifications" | "subscriptions" | "tickets" | "aria" | "ai-team" | "account";

const AriaSettingsSection = lazy(() => import("@/components/aria/AriaSettingsSection"));

const tabs = [
  { id: "profile" as const, label: "Profile", icon: User },
  { id: "notifications" as const, label: "Notifications", icon: Bell },
  { id: "subscriptions" as const, label: "Subscriptions", icon: Users },
  { id: "tickets" as const, label: "My Tickets", icon: Ticket },
  { id: "aria" as const, label: "ARIA Agent", icon: Bot },
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
              <img src={event.cover_image_url} className="w-20 h-14 rounded-lg object-cover flex-shrink-0" loading="lazy" />
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
  const { toast } = useToast();
  const { prefs: campaignPrefs, updatePrefs } = useNotificationPreferences();
  const { data: dbProfile } = useProfile();
  const updateProfile = useUpdateProfile();
  const uploadAvatar = useUploadAvatar();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem("notif_sound_enabled") !== "false");

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
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await updateProfile.mutateAsync({ display_name: name, bio, website });
      refreshProfile();
      toast({ title: "Profile saved ✓" });
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    }
    setSaving(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await uploadAvatar.mutateAsync(file);
      refreshProfile();
      toast({ title: "Avatar updated ✓" });
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 8) {
      toast({ title: "Password must be at least 8 characters", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Password updated ✓" });
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
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Reset link sent to your email" });
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
                    <img src={dbProfile.avatar_url} alt="" className="w-full h-full object-cover" />
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

            {/* YouTube Import */}
            {user && (
              <div className="rounded-2xl border border-border bg-card/40 p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">YouTube Import</h2>
                <YouTubeImport creatorId={user.id} />
              </div>
            )}
          </motion.div>
        )}

        {/* Notifications tab */}
        {activeTab === "notifications" && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="rounded-2xl border border-border bg-card/40 p-6 space-y-4">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">Notification Preferences</h2>
              </div>
              {[
                { key: "campaign_digest_email", label: "Campaign Digest Emails", desc: "Weekly summaries of your campaign performance" },
                { key: "campaign_alert_email", label: "Campaign Alert Emails", desc: "Important alerts about your campaigns" },
              ].map(pref => (
                <div key={pref.key} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium">{pref.label}</p>
                    <p className="text-xs text-muted-foreground">{pref.desc}</p>
                  </div>
                  <Switch
                    checked={(campaignPrefs as any)?.[pref.key] ?? true}
                    onCheckedChange={(checked) => updatePrefs({ [pref.key]: checked })}
                  />
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-border bg-card/40 p-6 space-y-4">
              <h3 className="font-semibold text-foreground">Sound</h3>
              <div className="flex items-center justify-between">
                <p className="text-sm">Notification sounds</p>
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

        {/* Account tab */}
        {activeTab === "account" && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
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
              <div className="flex items-center justify-between py-2 px-4 rounded-lg bg-secondary/30 border border-border">
                <div>
                  <p className="text-sm font-medium">Current Plan</p>
                  <p className="text-xs text-muted-foreground">Tier {appProfile.tier} · {appProfile.tierName}</p>
                </div>
                <span className="text-sm text-muted-foreground font-medium">Payments coming soon</span>
              </div>
            </div>

            <Separator />

            {/* Danger Zone */}
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 space-y-4">
              <h2 className="text-lg font-semibold text-destructive">Danger Zone</h2>
              <div className="flex flex-wrap gap-3">
                <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm hover:bg-secondary transition-colors" disabled>
                  <Download className="w-4 h-4" /> Export Data
                </button>
                <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-destructive/40 text-sm text-destructive hover:bg-destructive/10 transition-colors" disabled>
                  <Trash2 className="w-4 h-4" /> Delete Account
                </button>
              </div>
              <p className="text-xs text-muted-foreground">These features are not yet available.</p>
            </div>
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
}
