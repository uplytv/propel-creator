import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, Check, CheckCheck, AlertTriangle, Flag, Briefcase,
  CheckCircle2, XCircle, Eye, Star, Filter, Trash2,
  MessageSquare, Heart, UserPlus, Coins, Users, Megaphone,
  Trophy, Package, Gift, Zap, Calendar, Ticket, MapPin, Music, Repeat2, Mail
} from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useNotifications, AppNotification } from "@/hooks/useNotifications";
import { useMusicActivityNotifications } from "@/features/music/hooks/useMusicActivityNotifications";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type FilterTab = "all" | "activity" | "matches" | "events" | "purchases";

const MATCH_TYPES = new Set(["hey", "super_hey", "hey_mutual"]);
const EVENT_TYPES = new Set(["event_reminder", "going_out", "waitlist_available"]);
const PURCHASE_TYPES = new Set([
  "ticket_confirmed", "subscription_confirmed", "order_shipped", "live_sale", "tip_received",
  // notification-engine money events
  "sale", "purchase", "ticket", "ticket_sold", "event_ticket", "event_ticket_sale",
  "resale_sold", "renewal", "new_paid_member", "new_subscriber", "affiliate_conversion",
]);

// Fallback click-through routes for notification types whose rows carry no link.
const TYPE_FALLBACK_ROUTES: Record<string, string> = {
  member_joined: "/dashboard",
  new_paid_member: "/dashboard",
  new_subscriber: "/dashboard",
  email_subscriber: "/dashboard/subscribers",
  sale: "/wallet",
  renewal: "/wallet",
  resale_sold: "/wallet",
  tip_received: "/wallet",
  live_sale: "/wallet",
  purchase: "/products",
  ticket: "/tickets",
  event_ticket: "/tickets",
  ticket_sold: "/events",
  event_ticket_sale: "/events",
  booking_inquiry: "/admin/booking-inquiries",
  affiliate_conversion: "/affiliates",
  brand_application: "/marketplace",
  brand_application_accepted: "/marketplace",
  deal_message: "/marketplace",
  new_message: "/messages",
  payment_failed: "/settings",
};

const socialNotifIcon: Record<string, { icon: any; color: string }> = {
  community_comment: { icon: MessageSquare, color: "bg-primary/10 text-primary" },
  community_like: { icon: Heart, color: "bg-destructive/10 text-destructive" },
  community_blast: { icon: Megaphone, color: "bg-primary/15 text-primary" },
  new_follower: { icon: UserPlus, color: "bg-primary/10 text-primary" },
  tip_received: { icon: Coins, color: "bg-primary/15 text-primary" },
  live_sale: { icon: Coins, color: "bg-primary/15 text-primary" },
  auction_won: { icon: Trophy, color: "bg-amber-500/15 text-amber-400" },
  subscription_confirmed: { icon: CheckCircle2, color: "bg-primary/10 text-primary" },
  member_joined: { icon: Users, color: "bg-primary/10 text-primary" },
  order_shipped: { icon: Package, color: "bg-blue-500/15 text-blue-400" },
  giveaway_winner: { icon: Gift, color: "bg-amber-500/15 text-amber-400" },
  hey: { icon: UserPlus, color: "bg-primary/10 text-primary" },
  super_hey: { icon: Zap, color: "bg-amber-500/15 text-amber-400" },
  hey_mutual: { icon: Heart, color: "bg-primary/15 text-primary" },
  story_view: { icon: Eye, color: "bg-primary/10 text-primary" },
  event_reminder: { icon: Calendar, color: "bg-primary/10 text-primary" },
  ticket_confirmed: { icon: Ticket, color: "bg-primary/15 text-primary" },
  waitlist_available: { icon: Ticket, color: "bg-primary/10 text-primary" },
  going_out: { icon: MapPin, color: "bg-primary/10 text-primary" },
  // Music activity notifications (rendered separately via useMusicActivityNotifications).
  track_uploaded: { icon: Music, color: "bg-primary/15 text-primary" },
  track_reposted: { icon: Repeat2, color: "bg-primary/10 text-primary" },
  track_comment: { icon: MessageSquare, color: "bg-primary/10 text-primary" },
  // Notification-engine types (DB triggers + webhook/app-level inserts).
  email_subscriber: { icon: Mail, color: "bg-primary/10 text-primary" },
  new_subscriber: { icon: Users, color: "bg-primary/15 text-primary" },
  new_paid_member: { icon: Users, color: "bg-primary/15 text-primary" },
  member_canceled: { icon: XCircle, color: "bg-destructive/10 text-destructive" },
  subscription_canceled: { icon: XCircle, color: "bg-destructive/10 text-destructive" },
  subscription_recovered: { icon: CheckCircle2, color: "bg-primary/10 text-primary" },
  payment_failed: { icon: AlertTriangle, color: "bg-destructive/10 text-destructive" },
  renewal: { icon: Coins, color: "bg-primary/15 text-primary" },
  sale: { icon: Coins, color: "bg-primary/15 text-primary" },
  purchase: { icon: Package, color: "bg-blue-500/15 text-blue-400" },
  ticket: { icon: Ticket, color: "bg-primary/15 text-primary" },
  ticket_sold: { icon: Ticket, color: "bg-primary/15 text-primary" },
  event_ticket: { icon: Ticket, color: "bg-primary/15 text-primary" },
  event_ticket_sale: { icon: Ticket, color: "bg-primary/15 text-primary" },
  resale_sold: { icon: Coins, color: "bg-primary/15 text-primary" },
  booking_inquiry: { icon: Calendar, color: "bg-primary/10 text-primary" },
  affiliate_conversion: { icon: Repeat2, color: "bg-primary/10 text-primary" },
  brand_application: { icon: Briefcase, color: "bg-primary/10 text-primary" },
  brand_application_accepted: { icon: CheckCircle2, color: "bg-primary/15 text-primary" },
  new_message: { icon: MessageSquare, color: "bg-primary/10 text-primary" },
  deal_message: { icon: MessageSquare, color: "bg-primary/10 text-primary" },
};

const jobNotifIcon: Record<string, { icon: any; color: string; label: string }> = {
  new_application: { icon: Briefcase, color: "bg-primary/10 text-primary", label: "New Application" },
  status_reviewed: { icon: Eye, color: "bg-accent/10 text-accent-foreground", label: "Reviewed" },
  status_shortlisted: { icon: Star, color: "bg-primary/10 text-primary", label: "Shortlisted" },
  status_hired: { icon: CheckCircle2, color: "bg-primary/15 text-primary", label: "Hired" },
  status_rejected: { icon: XCircle, color: "bg-destructive/10 text-destructive", label: "Not Selected" },
};

function NotificationItem({
  n, onRead, onNavigate, onDelete,
}: {
  n: AppNotification; onRead: () => void; onNavigate: () => void; onDelete: () => void;
}) {
  const getIcon = () => {
    if (n.source === "social") {
      const config = socialNotifIcon[n.type] || { icon: Bell, color: "bg-secondary text-muted-foreground" };
      const Icon = config.icon;
      return (
        <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${config.color}`}>
          <Icon className="w-5 h-5" />
        </div>
      );
    }
    if (n.source === "job") {
      const config = jobNotifIcon[n.type] || jobNotifIcon.new_application;
      const Icon = config.icon;
      return (
        <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${config.color}`}>
          <Icon className="w-5 h-5" />
        </div>
      );
    }
    return (
      <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
        n.type === "budget_warning" ? "bg-warning/10 text-warning" : "bg-primary/10 text-primary"
      }`}>
        {n.type === "budget_warning" ? <AlertTriangle className="w-5 h-5" /> : <Flag className="w-5 h-5" />}
      </div>
    );
  };

  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      onClick={onNavigate}
      className={`w-full text-left px-5 py-4 flex gap-4 hover:bg-secondary/40 transition-colors border-b border-border/50 last:border-0 group ${
        !n.read ? "bg-primary/[0.03]" : ""
      } ${n.type === "community_blast" ? "border-l-[3px] border-l-primary" : ""}`}
    >
      {getIcon()}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-semibold truncate">{n.title}</span>
          {!n.read && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{n.message}</p>
        <p className="text-[11px] text-muted-foreground/50 mt-1.5">
          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
        </p>
      </div>
      <div className="flex-shrink-0 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {!n.read && (
          <button
            onClick={(e) => { e.stopPropagation(); onRead(); }}
            className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
            title="Mark as read"
          >
            <Check className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
          title="Delete notification"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </motion.button>
  );
}

export default function Notifications() {
  const { notifications, unreadCount, markRead, markAllRead, deleteNotification, isLoading } = useNotifications();
  const { data: musicNotifs = [] } = useMusicActivityNotifications(15);
  const [filter, setFilter] = useState<FilterTab>("all");
  const navigate = useNavigate();

  const filtered = notifications.filter((n) => {
    if (filter === "activity") return !MATCH_TYPES.has(n.type) && !EVENT_TYPES.has(n.type) && !PURCHASE_TYPES.has(n.type);
    if (filter === "matches") return MATCH_TYPES.has(n.type);
    if (filter === "events") return EVENT_TYPES.has(n.type);
    if (filter === "purchases") return PURCHASE_TYPES.has(n.type);
    return true;
  });

  const handleNavigate = async (n: AppNotification) => {
    if (!n.read) markRead(n.id, n.source);
    if (n.source === "job" && n.job_id) { navigate(`/jobs/${n.job_id}`); return; }
    if (n.link) { navigate(n.link); return; }
    if (MATCH_TYPES.has(n.type)) { navigate("/social/people"); return; }
    if (EVENT_TYPES.has(n.type)) { navigate("/social/local"); return; }
    // Community engagement: resolve the post's community for click-through.
    if ((n.type === "community_comment" || n.type === "community_like" || n.type === "community_blast") && n.reference_id) {
      const { data } = await supabase
        .from("community_posts").select("creator_id").eq("id", n.reference_id).maybeSingle();
      if (data?.creator_id) { navigate(`/community/${data.creator_id}/community`); return; }
    }
    // New follower: go to the follower's profile.
    if (n.type === "new_follower" && n.actor_id) {
      const { data } = await supabase
        .from("profiles").select("username").eq("user_id", n.actor_id).maybeSingle();
      if (data?.username) { navigate(`/${data.username}`); return; }
    }
    const fallback = TYPE_FALLBACK_ROUTES[n.type];
    if (fallback) navigate(fallback);
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 md:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Notifications</h1>
              <p className="text-xs text-muted-foreground">
                {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
              </p>
            </div>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={() => markAllRead()} className="gap-2">
              <CheckCheck className="w-4 h-4" />
              Mark all read
            </Button>
          )}
        </div>

        <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterTab)} className="mb-4">
          <TabsList className="bg-secondary/50 w-full flex overflow-x-auto">
            <TabsTrigger value="all" className="text-xs flex-1">All</TabsTrigger>
            <TabsTrigger value="activity" className="text-xs flex-1">Activity</TabsTrigger>
            <TabsTrigger value="matches" className="text-xs flex-1">Matches</TabsTrigger>
            <TabsTrigger value="events" className="text-xs flex-1">Events</TabsTrigger>
            <TabsTrigger value="purchases" className="text-xs flex-1">Purchases</TabsTrigger>
          </TabsList>
        </Tabs>

        {(filter === "all" || filter === "activity") && musicNotifs.length > 0 && (
          <div className="mb-4 rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-5 py-3 flex items-center gap-2 border-b border-border/50 bg-secondary/30">
              <Music className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wide">Music activity</span>
            </div>
            {musicNotifs.map((m) => {
              const cfg = socialNotifIcon[m.type];
              const Icon = cfg?.icon ?? Music;
              return (
                <button
                  key={m.id}
                  onClick={() => navigate(m.link)}
                  className="w-full text-left px-5 py-3 flex gap-3 items-start hover:bg-secondary/40 border-b border-border/40 last:border-0"
                >
                  <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${cfg?.color ?? "bg-primary/10 text-primary"}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{m.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{m.message}</p>
                    <p className="text-[11px] text-muted-foreground/50 mt-0.5">
                      {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-sm">Loading notifications…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Bell className="w-10 h-10 mb-3 opacity-20" />
              <p className="text-sm font-medium">
                {filter === "all" ? "No notifications yet" : `No ${filter} notifications`}
              </p>
              <p className="text-xs mt-1 opacity-60">
                Notifications will appear here as activity happens.
              </p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {filtered.map((n) => (
                <NotificationItem
                  key={n.id}
                  n={n}
                  onRead={() => markRead(n.id, n.source)}
                  onNavigate={() => handleNavigate(n)}
                  onDelete={() => deleteNotification(n.id, n.source)}
                />
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
