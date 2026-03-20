import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface AdminStatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  change?: number;
  changePeriod?: string;
  size?: "sm" | "md" | "lg";
}

export function AdminStatCard({ icon: Icon, label, value, change, changePeriod = "vs prev", size = "md" }: AdminStatCardProps) {
  const isPositive = change !== undefined && change > 0;
  const isNegative = change !== undefined && change < 0;

  return (
    <Card className="bg-card border-border">
      <CardContent className={cn("flex items-start gap-3", size === "lg" ? "p-6" : "p-4")}>
        <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
          <Icon className={cn(size === "lg" ? "w-6 h-6" : "w-5 h-5")} />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          <p className={cn("font-bold font-heading tracking-tight", size === "lg" ? "text-2xl" : "text-lg")}>{value}</p>
          {change !== undefined && (
            <div className={cn("flex items-center gap-1 text-xs mt-0.5", isPositive ? "text-primary" : isNegative ? "text-destructive" : "text-muted-foreground")}>
              {isPositive ? <TrendingUp className="w-3 h-3" /> : isNegative ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
              <span>{Math.abs(change).toFixed(1)}% {changePeriod}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface AlertItem {
  level: "critical" | "warning" | "win";
  message: string;
}

export function AdminAlerts({ alerts }: { alerts: AlertItem[] }) {
  if (alerts.length === 0) return null;

  const levelStyles = {
    critical: "bg-destructive/10 border-destructive/30 text-destructive",
    warning: "bg-warning/10 border-warning/30 text-warning",
    win: "bg-primary/10 border-primary/30 text-primary",
  };

  const levelIcons = { critical: "🔴", warning: "🟡", win: "🟢" };

  return (
    <div className="space-y-2 mb-4">
      {alerts.map((alert, i) => (
        <div key={i} className={cn("px-4 py-2.5 rounded-lg border text-sm", levelStyles[alert.level])}>
          {levelIcons[alert.level]} {alert.message}
        </div>
      ))}
    </div>
  );
}

export function fmt(n: number, prefix = "$"): string {
  if (n >= 1000000) return `${prefix}${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${prefix}${(n / 1000).toFixed(1)}K`;
  return `${prefix}${n.toFixed(2)}`;
}

export function fmtInt(n: number): string {
  return n.toLocaleString();
}

export function pct(n: number): string {
  return `${n.toFixed(1)}%`;
}
