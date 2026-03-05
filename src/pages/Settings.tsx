import { useState } from "react";
import { motion } from "framer-motion";
import {
  User, Bell, Shield, CreditCard, Palette, Mail,
  Camera, Save, Eye, EyeOff, Trash2, Download, Megaphone
} from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { useApp } from "@/context/AppContext";
import { useTheme } from "@/context/ThemeContext";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";

type SettingsTab = "profile" | "notifications" | "account";

const tabs = [
  { id: "profile" as const, label: "Profile", icon: User },
  { id: "notifications" as const, label: "Notifications", icon: Bell },
  { id: "account" as const, label: "Account", icon: Shield },
];

export default function Settings() {
  const { profile, setProfile } = useApp();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const { prefs: campaignPrefs, updatePrefs } = useNotificationPreferences();
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");

  // Profile state
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState("creator@example.com");
  const [bio, setBio] = useState("Building communities that matter.");
  const [website, setWebsite] = useState("https://");

  // Notification state
  const [notifications, setNotifications] = useState({
    emailNewMember: true,
    emailRevenue: true,
    emailWeeklyDigest: true,
    emailProductUpdates: false,
    pushNewMember: true,
    pushRevenue: false,
    pushMilestones: true,
    pushTips: true,
  });

  // Account state
  const [showPassword, setShowPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  

  const handleSaveProfile = () => {
    setProfile({ name });
    toast({ title: "Profile updated", description: "Your changes have been saved." });
  };

  const handleNotifToggle = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
    toast({ title: "Preference saved" });
  };

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword) {
      toast({ title: "Error", description: "Please fill in both password fields.", variant: "destructive" });
      return;
    }
    if (newPassword.length < 8) {
      toast({ title: "Error", description: "Password must be at least 8 characters.", variant: "destructive" });
      return;
    }
    toast({ title: "Password updated", description: "Your password has been changed." });
    setCurrentPassword("");
    setNewPassword("");
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 space-y-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your profile, notifications, and account.</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 bg-secondary/30 rounded-xl p-1 w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {activeTab === tab.id && (
                <motion.div
                  layoutId="settings-tab"
                  className="absolute inset-0 bg-primary rounded-lg"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </span>
            </button>
          ))}
        </div>

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Avatar Section */}
            <div className="rounded-2xl border border-border bg-card/40 p-6">
              <h2 className="text-lg font-semibold mb-4">Profile Photo</h2>
              <div className="flex items-center gap-5">
                <div className="relative group">
                  <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-2xl font-bold text-primary">
                    {name.charAt(0)}
                  </div>
                  <button className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="w-5 h-5 text-white" />
                  </button>
                </div>
                <div>
                  <p className="text-sm font-medium">{name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">JPG, PNG or GIF. Max 2MB.</p>
                  <button className="text-xs text-primary hover:underline mt-1">Upload new photo</button>
                </div>
              </div>
            </div>

            {/* Info Fields */}
            <div className="rounded-2xl border border-border bg-card/40 p-6 space-y-5">
              <h2 className="text-lg font-semibold">Personal Information</h2>

              <div className="grid md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Display Name</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={50}
                    className="w-full rounded-lg bg-secondary/40 border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</label>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    maxLength={255}
                    className="w-full rounded-lg bg-secondary/40 border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={300}
                  rows={3}
                  className="w-full rounded-lg bg-secondary/40 border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
                />
                <p className="text-[10px] text-muted-foreground text-right">{bio.length}/300</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Website</label>
                <input
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  maxLength={200}
                  className="w-full rounded-lg bg-secondary/40 border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleSaveProfile}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  <Save className="w-4 h-4" /> Save Changes
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Notifications Tab */}
        {activeTab === "notifications" && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="rounded-2xl border border-border bg-card/40 p-6 space-y-5">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">Email Notifications</h2>
              </div>

              {[
                { key: "emailNewMember" as const, label: "New member joins", desc: "Get notified when someone joins your community" },
                { key: "emailRevenue" as const, label: "Revenue milestones", desc: "Alerts when you hit revenue goals" },
                { key: "emailWeeklyDigest" as const, label: "Weekly digest", desc: "Summary of your growth metrics every Monday" },
                { key: "emailProductUpdates" as const, label: "Product updates", desc: "Platform feature announcements and tips" },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                  <Switch
                    checked={notifications[item.key]}
                    onCheckedChange={() => handleNotifToggle(item.key)}
                  />
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-border bg-card/40 p-6 space-y-5">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">Push Notifications</h2>
              </div>

              {[
                { key: "pushNewMember" as const, label: "New members", desc: "Real-time alerts for new signups" },
                { key: "pushRevenue" as const, label: "Revenue events", desc: "Instant alerts for purchases" },
                { key: "pushMilestones" as const, label: "Tier milestones", desc: "Celebrations when you level up" },
                { key: "pushTips" as const, label: "Growth tips", desc: "AI-powered suggestions from ARIA" },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                  <Switch
                    checked={notifications[item.key]}
                    onCheckedChange={() => handleNotifToggle(item.key)}
                  />
                </div>
              ))}
            </div>

            {/* Sound */}
            <div className="rounded-2xl border border-border bg-card/40 p-6 space-y-5">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-primary" />
                <div>
                  <h2 className="text-lg font-semibold">Sound</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Control notification sound effects</p>
                </div>
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium">Notification sound</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Play a sound when a new notification arrives</p>
                </div>
                <Switch
                  checked={localStorage.getItem("notif_sound_enabled") !== "false"}
                  onCheckedChange={(checked) => {
                    localStorage.setItem("notif_sound_enabled", String(checked));
                    toast({ title: checked ? "Sound enabled" : "Sound disabled" });
                  }}
                />
              </div>
            </div>

            {/* Campaign Alerts */}
            <div className="rounded-2xl border border-border bg-card/40 p-6 space-y-5">
              <div className="flex items-center gap-3">
                <Megaphone className="w-5 h-5 text-primary" />
                <div>
                  <h2 className="text-lg font-semibold">Campaign Alerts</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Control which campaign notifications appear in your inbox</p>
                </div>
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium">Budget warnings</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Alert when a campaign reaches 75% of its budget</p>
                </div>
                <Switch
                  checked={campaignPrefs.budget_warning}
                  onCheckedChange={async (checked) => {
                    await updatePrefs({ budget_warning: checked });
                    toast({ title: "Preference saved" });
                  }}
                />
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium">Campaign completed</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Alert when a campaign finishes its full budget</p>
                </div>
                <Switch
                  checked={campaignPrefs.campaign_completed}
                  onCheckedChange={async (checked) => {
                    await updatePrefs({ campaign_completed: checked });
                    toast({ title: "Preference saved" });
                  }}
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* Account Tab */}
        {activeTab === "account" && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Appearance */}
            <div className="rounded-2xl border border-border bg-card/40 p-6 space-y-4">
              <div className="flex items-center gap-3">
                <Palette className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">Appearance</h2>
              </div>
              <div className="flex gap-3">
                {(["dark", "light", "system"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all border ${
                      theme === t
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Change Password */}
            <div className="rounded-2xl border border-border bg-card/40 p-6 space-y-5">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">Security</h2>
              </div>

              <div className="grid md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Current Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      maxLength={128}
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
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">New Password</label>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    maxLength={128}
                    placeholder="Min 8 characters"
                    className="w-full rounded-lg bg-secondary/40 border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  />
                </div>
              </div>
              <button
                onClick={handleChangePassword}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-sm font-medium hover:bg-secondary/80 transition-colors"
              >
                Update Password
              </button>
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
                  <p className="text-xs text-muted-foreground">Tier {profile.tier} · {profile.tierName}</p>
                </div>
                <button className="text-sm text-primary hover:underline font-medium">Upgrade</button>
              </div>
            </div>

            <Separator />

            {/* Danger Zone */}
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 space-y-4">
              <h2 className="text-lg font-semibold text-destructive">Danger Zone</h2>
              <div className="flex flex-wrap gap-3">
                <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm hover:bg-secondary transition-colors">
                  <Download className="w-4 h-4" /> Export Data
                </button>
                <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-destructive/40 text-sm text-destructive hover:bg-destructive/10 transition-colors">
                  <Trash2 className="w-4 h-4" /> Delete Account
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
}