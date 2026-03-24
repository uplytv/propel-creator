import { useAdminOverview, DateRange } from "@/hooks/useAdminHealthData";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface DecisionCard {
  label: string;
  value: string;
  status: "green" | "yellow" | "red";
  action?: string;
  link?: string;
}

export default function DecisionsPanel({ range }: { range: DateRange }) {
  const { data } = useAdminOverview(range);
  const navigate = useNavigate();

  if (!data) return null;

  const webhookSuccessRate = data.uptimeProxy;
  const hasActiveCreators = data.activeCreators > 0;

  const cards: DecisionCard[] = [
    {
      label: "Webhook Success Rate",
      value: `${webhookSuccessRate.toFixed(0)}%`,
      status: webhookSuccessRate >= 95 ? "green" : webhookSuccessRate >= 90 ? "yellow" : "red",
      action: webhookSuccessRate < 95 ? "Check failed webhooks" : undefined,
      link: "/admin",
    },
    {
      label: "Active Creators",
      value: data.activeCreators.toString(),
      status: data.activeCreators > 0 ? "green" : "red",
      action: data.activeCreators === 0 ? "No creator growth — send outreach" : undefined,
      link: "/admin",
    },
    {
      label: "Active Members",
      value: data.activeMembers.toString(),
      status: data.activeMembers > 0 ? "green" : "yellow",
      action: data.activeMembers === 0 ? "No paying members yet" : undefined,
    },
    {
      label: "Waitlist Conversion",
      value: `${data.conversionRate.toFixed(1)}%`,
      status: data.conversionRate >= 10 ? "green" : data.conversionRate >= 5 ? "yellow" : "red",
      action: data.conversionRate < 5 ? "Low conversion — optimize funnel" : undefined,
    },
    {
      label: "Net Revenue Retention",
      value: `${data.retention.toFixed(0)}%`,
      status: data.retention >= 80 ? "green" : data.retention >= 60 ? "yellow" : "red",
    },
    {
      label: "Platform Revenue",
      value: `$${data.platformTake.toFixed(2)}`,
      status: data.platformTake > 0 ? "green" : "yellow",
      action: data.platformTake === 0 ? "No platform revenue yet" : undefined,
    },
  ];

  // Sort red to top
  const sorted = [...cards].sort((a, b) => {
    const order = { red: 0, yellow: 1, green: 2 };
    return order[a.status] - order[b.status];
  });

  const DOT = { green: "bg-primary", yellow: "bg-yellow-500", red: "bg-destructive" };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-heading font-semibold text-muted-foreground uppercase tracking-wider">
        Decisions & Health
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {sorted.map((card) => (
          <Card
            key={card.label}
            className={cn(
              "bg-card border-border transition-all",
              card.status === "red" && "border-destructive/40"
            )}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">{card.label}</span>
                <span className={cn("w-2 h-2 rounded-full", DOT[card.status])} />
              </div>
              <p className="text-xl font-bold font-heading">{card.value}</p>
              {card.status === "red" && (
                <Badge variant="destructive" className="text-[10px] mt-2">
                  Action Required
                </Badge>
              )}
              {card.action && (
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-muted-foreground">{card.action}</p>
                  {card.link && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs gap-1 text-primary"
                      onClick={() => navigate(card.link!)}
                    >
                      View <ArrowRight className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
