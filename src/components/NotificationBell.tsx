import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, AlertTriangle, Flag, Briefcase, CheckCircle2, XCircle, Eye, Star, MessageSquare, Heart, UserPlus, Coins, Users, Megaphone, Trophy, Package, Gift, Mail, Ticket, Calendar, Repeat2 } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";

const jobNotifIcon: Record<string, { icon: any; color: string }> = {
  new_application: { icon: Briefcase, color: "bg-primary/10 text-primary" },
  status_reviewed: { icon: Eye, color: "bg-accent/10 text-accent-foreground" },
  status_shortlisted: { icon: Star, color: "bg-primary/10 text-primary" },
  status_hired: { icon: CheckCircle2, color: "bg-primary/15 text-primary" },
  status_rejected: { icon: XCircle, color: "bg-destructive/10 text-destructive" },
};

export default function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleNotifClick = (n: any) => {
    if (!n.read) markRead(n.id, n.source);
    if (n.source === "job" && n.job_id) {
      navigate(`/jobs/${n.job_id}`);
    } else if (n.link) {
      navigate(n.link);
    } else {
      navigate("/notifications");
    }
    setOpen(false);
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

  const getIcon = (n: any) => {
    if (n.source === "social") {
      const config = socialNotifIcon[n.type] || { icon: Bell, color: "bg-secondary text-muted-foreground" };
      const Icon = config.icon;
      return (
        <div className={`mt-0.5 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${config.color}`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
      );
    }
    if (n.source === "job") {
      const config = jobNotifIcon[n.type] || jobNotifIcon.new_application;
      const Icon = config.icon;
      return (
        <div className={`mt-0.5 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${config.color}`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
      );
    }
    // Campaign notifications
    return (
      <div className={`mt-0.5 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
        n.type === "budget_warning"
          ? "bg-[hsl(38,92%,50%)]/10 text-[hsl(38,92%,50%)]"
          : "bg-primary/10 text-primary"
      }`}>
        {n.type === "budget_warning" ? (
          <AlertTriangle className="w-3.5 h-3.5" />
        ) : (
          <Flag className="w-3.5 h-3.5" />
        )}
      </div>
    );
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        aria-expanded={open}
        aria-haspopup="true"
        className="relative p-2 rounded-lg hover:bg-secondary transition-colors"
      >
        <Bell className="w-[18px] h-[18px] text-muted-foreground" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-1 right-1 min-w-[16px] h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center px-1"
          >
            {unreadCount}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full right-0 mt-2 w-80 max-h-[400px] rounded-xl bg-card border border-border shadow-xl z-50 overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-sm font-semibold">Notifications</span>
              <div className="flex items-center gap-3">
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllRead()}
                    className="text-[11px] text-primary hover:underline font-medium"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => { navigate("/notifications"); setOpen(false); }}
                  className="text-[11px] text-muted-foreground hover:text-foreground font-medium"
                >
                  View all
                </button>
              </div>
            </div>

            <div className="overflow-y-auto max-h-[340px]">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                  <Bell className="w-8 h-8 mb-2 opacity-30" />
                  <p className="text-sm">No notifications yet</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => handleNotifClick(n)}
                    className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-secondary/40 transition-colors border-b border-border/50 last:border-0 ${
                      !n.read ? "bg-primary/5" : ""
                    }`}
                  >
                    {getIcon(n)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold truncate">{n.title}</span>
                        {!n.read && (
                          <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
