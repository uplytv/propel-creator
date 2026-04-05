import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, Check, CheckCheck, AlertTriangle, Flag, Briefcase,
  CheckCircle2, XCircle, Eye, Star, Filter, Trash2,
  MessageSquare, Heart, UserPlus, Coins, Users, Megaphone,
  Trophy, Package, Gift
} from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { useNotifications, AppNotification } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type FilterTab = "all" | "unread" | "job" | "campaign" | "social";

const jobNotifIcon: Record<string, { icon: any; color: string; label: string }> = {
  new_application: { icon: Briefcase, color: "bg-primary/10 text-primary", label: "New Application" },
  status_reviewed: { icon: Eye, color: "bg-accent/10 text-accent-foreground", label: "Reviewed" },
  status_shortlisted: { icon: Star, color: "bg-primary/10 text-primary", label: "Shortlisted" },
  status_hired: { icon: CheckCircle2, color: "bg-primary/15 text-primary", label: "Hired" },
  status_rejected: { icon: XCircle, color: "bg-destructive/10 text-destructive", label: "Not Selected" },
};

function NotificationItem({
  n,
  onRead,
  onNavigate,
  onDelete,
}: {
  n: AppNotification;
  onRead: () => void;
  onNavigate: () => void;
  onDelete: () => void;
}) {
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
  };

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
        n.type === "budget_warning"
          ? "bg-warning/10 text-warning"
          : "bg-primary/10 text-primary"
      }`}>
        {n.type === "budget_warning" ? (
          <AlertTriangle className="w-5 h-5" />
        ) : (
          <Flag className="w-5 h-5" />
        )}
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
          {!n.read && (
            <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
          )}
          <Badge variant="outline" className="ml-auto text-[10px] capitalize flex-shrink-0">
            {n.source}
          </Badge>
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
  const [filter, setFilter] = useState<FilterTab>("all");
  const navigate = useNavigate();

  const filtered = notifications.filter((n) => {
    if (filter === "unread") return !n.read;
    if (filter === "job") return n.source === "job";
    if (filter === "campaign") return n.source === "campaign";
    if (filter === "social") return n.source === "social";
    return true;
  });

  const handleNavigate = (n: AppNotification) => {
    if (!n.read) markRead(n.id, n.source);
    if (n.source === "job" && n.job_id) {
      navigate(`/jobs/${n.job_id}`);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 md:px-8 py-8">
        {/* Header */}
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllRead()}
              className="gap-2"
            >
              <CheckCheck className="w-4 h-4" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Filters */}
        <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterTab)} className="mb-4">
          <TabsList className="bg-secondary/50">
            <TabsTrigger value="all" className="text-xs gap-1.5">
              All
              {notifications.length > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">{notifications.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="unread" className="text-xs gap-1.5">
              Unread
              {unreadCount > 0 && (
                <Badge className="text-[10px] px-1.5 py-0 h-4 bg-primary text-primary-foreground">{unreadCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="job" className="text-xs">💼 Jobs</TabsTrigger>
            <TabsTrigger value="campaign" className="text-xs">📢 Campaigns</TabsTrigger>
            <TabsTrigger value="social" className="text-xs">💬 Social</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Notification List */}
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
                {filter === "unread"
                  ? "You're all caught up!"
                  : "Notifications will appear here as activity happens."}
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
