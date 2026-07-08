import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Activity, CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type HealthCheck = { ok: boolean; ms?: number; depth?: number };

type HealthResponse = {
  status: "ok" | "degraded";
  checks: {
    db: HealthCheck;
    stripe: HealthCheck;
    mux: HealthCheck;
    email_queue: HealthCheck;
  };
  version?: string;
};

const CHECKS: { key: keyof HealthResponse["checks"]; label: string }[] = [
  { key: "db", label: "Database" },
  { key: "stripe", label: "Stripe" },
  { key: "mux", label: "Mux" },
  { key: "email_queue", label: "Email queue" },
];

function HealthChip({ label, check }: { label: string; check?: HealthCheck }) {
  const ok = check?.ok === true;
  return (
    <span
      className={cn(
        // Square tokens per design language — no rounding.
        "inline-flex items-center gap-1.5 rounded-none border px-2 py-1 text-xs font-medium",
        ok
          ? "border-border bg-primary/10 text-primary"
          : "border-destructive/40 bg-destructive/10 text-destructive",
      )}
    >
      {ok ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
      {label}
      {typeof check?.depth === "number" && (
        <span className="text-muted-foreground font-normal">· {check.depth} queued</span>
      )}
      {typeof check?.ms === "number" && (
        <span className="text-muted-foreground font-normal">· {check.ms}ms</span>
      )}
    </span>
  );
}

export default function SystemHealthCard() {
  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ["admin-system-health"],
    queryFn: async (): Promise<HealthResponse> => {
      const { data, error } = await supabase.functions.invoke("health-check");
      if (error) throw error;
      return data as HealthResponse;
    },
    refetchInterval: 60_000,
  });

  const degraded = isError || data?.status === "degraded";

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          System health
          {!isLoading && (
            <span
              className={cn(
                "rounded-none border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                degraded
                  ? "border-destructive/40 bg-destructive/10 text-destructive"
                  : "border-border bg-primary/10 text-primary",
              )}
            >
              {degraded ? "Degraded" : "Operational"}
            </span>
          )}
        </CardTitle>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0"
          onClick={() => refetch()}
          disabled={isFetching}
          aria-label="Refresh system health"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", isFetching && "animate-spin")} />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex gap-2 flex-wrap">
            {CHECKS.map((c) => (
              <Skeleton key={c.key} className="h-6 w-24 rounded-none" />
            ))}
          </div>
        ) : isError ? (
          <p className="text-xs text-destructive">
            Health check unreachable — the edge function itself did not respond.
          </p>
        ) : (
          <div className="flex gap-2 flex-wrap items-center">
            {CHECKS.map((c) => (
              <HealthChip key={c.key} label={c.label} check={data?.checks?.[c.key]} />
            ))}
            {data?.version && (
              <span className="text-[10px] text-muted-foreground ml-auto font-mono">
                {data.version.slice(0, 7)}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
