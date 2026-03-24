import { useState, useEffect } from "react";
import { X, ArrowRight, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAdminNotifications } from "@/hooks/useAdminNotifications";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

export default function CriticalAlertBanner() {
  const { criticalUnread } = useAdminNotifications();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem("admin_dismissed_alerts");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  });

  const visible = criticalUnread.filter(n => !dismissed.has(n.id));

  const dismiss = (id: string) => {
    setDismissed(prev => {
      const next = new Set(prev);
      next.add(id);
      localStorage.setItem("admin_dismissed_alerts", JSON.stringify([...next]));
      return next;
    });
  };

  if (visible.length === 0) return null;

  return (
    <div className="space-y-1">
      {visible.map(n => (
        <div
          key={n.id}
          className="bg-destructive/15 border border-destructive/30 rounded-lg px-4 py-2.5 flex items-center gap-3"
        >
          <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
          <span className="text-sm text-destructive font-medium flex-1 truncate">
            🚨 {n.title} — {formatDistanceToNow(new Date(n.created_at))} ago
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive text-xs h-7 gap-1"
            onClick={() => { if (n.link) navigate(n.link); }}
          >
            View Details <ArrowRight className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-destructive/60 hover:text-destructive"
            onClick={() => dismiss(n.id)}
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      ))}
    </div>
  );
}
