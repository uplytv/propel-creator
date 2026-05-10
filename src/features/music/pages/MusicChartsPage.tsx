import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMusicChart } from "../hooks/useMusicCharts";
import { ChartRow } from "../components/ChartRow";

type ChartType = "tracks" | "albums" | "artists";
type Period = "daily" | "weekly" | "monthly";

export default function MusicChartsPage() {
  const [chartType, setChartType] = useState<ChartType>("tracks");
  const [period, setPeriod] = useState<Period>("weekly");
  const { data: entries = [], isLoading } = useMusicChart(chartType, period);

  return (
    <div className="container mx-auto p-4 mobile-safe-content max-w-3xl">
      <header className="mb-4">
        <h1 className="text-3xl font-bold">Music Charts</h1>
        <p className="text-sm text-muted-foreground">
          Trending across UPLY — updated regularly.
        </p>
      </header>

      <div className="flex items-center gap-2 mb-4">
        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs value={chartType} onValueChange={(v) => setChartType(v as ChartType)}>
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="tracks">Tracks</TabsTrigger>
          <TabsTrigger value="albums">Albums</TabsTrigger>
          <TabsTrigger value="artists">Artists</TabsTrigger>
        </TabsList>
        <TabsContent value={chartType} className="mt-4 space-y-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading chart…</p>
          ) : entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No chart data yet. Check back soon.
            </p>
          ) : (
            entries.map((entry) => <ChartRow key={entry.id} entry={entry} />)
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
