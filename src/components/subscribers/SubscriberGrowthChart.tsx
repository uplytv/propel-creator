import { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Subscriber } from "@/hooks/useSubscribers";
import { format, subDays, startOfDay, isSameDay } from "date-fns";

interface Props {
  subscribers: Subscriber[];
}

export default function SubscriberGrowthChart({ subscribers }: Props) {
  const chartData = useMemo(() => {
    const days = 30;
    const data: { date: string; total: number; label: string }[] = [];
    const sortedSubs = [...subscribers].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    for (let i = days - 1; i >= 0; i--) {
      const day = startOfDay(subDays(new Date(), i));
      const countUpToDay = sortedSubs.filter(
        s => new Date(s.created_at) <= new Date(day.getTime() + 86400000 - 1)
      ).length;
      data.push({
        date: format(day, "yyyy-MM-dd"),
        total: countUpToDay,
        label: format(day, "MMM d"),
      });
    }
    return data;
  }, [subscribers]);

  if (subscribers.length === 0) return null;

  return (
    <div className="px-4 pb-4">
      <div className="rounded-2xl border border-border bg-card p-4">
        <h3 className="text-xs font-medium text-muted-foreground mb-3">Subscriber Growth (30 days)</h3>
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="subGrowth" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3D7CFF" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3D7CFF" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              interval="preserveStartEnd"
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              width={30}
            />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              labelStyle={{ color: "hsl(var(--foreground))" }}
            />
            <Area
              type="monotone"
              dataKey="total"
              stroke="#3D7CFF"
              strokeWidth={2}
              fill="url(#subGrowth)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
