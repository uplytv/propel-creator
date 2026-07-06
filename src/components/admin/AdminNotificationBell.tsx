import { useState } from "react";
import { Bell, X, DollarSign, Users, Radio, AlertTriangle, Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAdminNotifications, getCategory, getSeverity, type AdminNotification } from "@/hooks/useAdminNotifications";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

type CategoryFilter = "money" | "users" | "streams" | "technical";

const CATEGORY_ICONS: Record<CategoryFilter, { icon: typeof DollarSign; emoji: string; label: string }> = {
  money: { icon: DollarSign, emoji: "💰", label: "Money" },
  users: { icon: Users, emoji: "👤", label: "Users" },
  streams: { icon: Radio, emoji: "🔴", label: "Streams" },
  technical: { icon: AlertTriangle, emoji: "🚨", label: "Technical" },
};

const SEVERITY_COLORS: Record<string, string> = {
  success: "bg-primary/20 text-primary",
  warning: "bg-yellow-500/20 text-yellow-400",
  critical: "bg-destructive/20 text-destructive",
  info: "bg-muted text-muted-foreground",
};

const SEVERITY_BORDER: Record<string, string> = {
  success: "border-l-primary",
  warning: "border-l-yellow-500",
  critical: "border-l-destructive",
  info: "border-l-muted-foreground",
};

export default function AdminNotificationBell() {
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState<Set<CategoryFilter>>(new Set(["money", "users", "streams", "technical"]));
  const { notifications, unreadCount, markRead, markAllRead } = useAdminNotifications();
  const navigate = useNavigate();

  const toggleFilter = (cat: CategoryFilter) => {
    setFilters(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  };

  const filtered = notifications.filter(n => filters.has(getCategory(n.type)));

  const handleTap = async (n: AdminNotification) => {
    if (!n.read) await markRead(n.id);
    if (n.link) navigate(n.link);
    setOpen(false);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="relative h-9 w-9 p-0"
        onClick={() => setOpen(true)}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-[400px] max-w-full bg-background border-l border-border p-0">
          <SheetHeader className="px-4 pt-4 pb-3 border-b border-border">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-foreground font-heading text-lg">Admin Alerts</SheetTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary text-xs h-7"
                  onClick={() => markAllRead()}
                >
                  Mark all read
                </Button>
              </div>
            </div>
            {/* Category filters */}
            <div className="flex gap-1.5 pt-2">
              {(Object.entries(CATEGORY_ICONS) as [CategoryFilter, typeof CATEGORY_ICONS["money"]][]).map(([key, { emoji, label }]) => (
                <Button
                  key={key}
                  variant={filters.has(key) ? "default" : "ghost"}
                  size="sm"
                  className="text-xs h-7 gap-1"
                  onClick={() => toggleFilter(key)}
                >
                  {emoji} {label}
                </Button>
              ))}
            </div>
          </SheetHeader>

          <div className="overflow-y-auto max-h-[calc(100vh-120px)]">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Bell className="w-8 h-8 mb-2 opacity-40" />
                <p className="text-sm">No alerts</p>
              </div>
            ) : (
              filtered.map(n => {
                const severity = getSeverity(n.type);
                return (
                  <button
                    key={n.id}
                    onClick={() => handleTap(n)}
                    className={cn(
                      "w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted border-l-[3px]",
                      !n.read ? SEVERITY_BORDER[severity] : "border-l-transparent opacity-70"
                    )}
                  >
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 mt-0.5", SEVERITY_COLORS[severity])}>
                      {n.title.charAt(0) === "🚨" || n.title.charAt(0) === "⚠" || n.title.charAt(0) === "✅" || n.title.charAt(0) === "💰" || n.title.charAt(0) === "💸" || n.title.charAt(0) === "👤" || n.title.charAt(0) === "🎨" || n.title.charAt(0) === "🔴" || n.title.charAt(0) === "📋" || n.title.charAt(0) === "💝" || n.title.charAt(0) === "🎫"
                        ? n.title.slice(0, 2)
                        : severity === "critical" ? "🚨" : severity === "warning" ? "⚠️" : severity === "success" ? "✅" : "ℹ️"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-[11px] text-muted-foreground/60 mt-1">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    {n.link && <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />}
                  </button>
                );
              })
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
