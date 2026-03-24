import { motion } from "framer-motion";
import { Eye, TrendingDown, Clock, BarChart3 } from "lucide-react";
import type { ViewerHeatmapData } from "@/hooks/useViewerHeatmap";

interface ViewerHeatmapPanelProps {
  data: ViewerHeatmapData;
  durationSeconds: number;
  onClose: () => void;
}

export default function ViewerHeatmapPanel({ data, durationSeconds, onClose }: ViewerHeatmapPanelProps) {
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  // Normalize data for chart
  const maxViewers = data.peakViewerCount || 1;
  const chartPoints = data.dataPoints.map(p => ({
    x: durationSeconds > 0 ? (p.timestamp / durationSeconds) * 100 : 0,
    y: (p.viewerCount / maxViewers) * 100,
    engagement: p.engagementScore,
  }));

  // Build SVG path
  const svgPath = chartPoints.length > 1
    ? `M ${chartPoints.map(p => `${p.x} ${100 - p.y}`).join(' L ')}`
    : '';

  // Build engagement heatmap gradient
  const engagementGradient = chartPoints.map(p => {
    const hue = p.engagement > 60 ? 120 : p.engagement > 30 ? 60 : 0; // green > yellow > red
    return `hsl(${hue}, 80%, 50%)`;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="glass-card p-4 space-y-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          <p className="text-xs font-bold text-foreground">Viewer Heatmap</p>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xs">✕</button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center">
          <Eye className="w-3.5 h-3.5 text-primary mx-auto mb-1" />
          <p className="text-sm font-bold text-foreground">{data.peakViewerCount}</p>
          <p className="text-[9px] text-muted-foreground">Peak Viewers</p>
        </div>
        <div className="text-center">
          <Clock className="w-3.5 h-3.5 text-primary mx-auto mb-1" />
          <p className="text-sm font-bold text-foreground">{formatTime(data.avgWatchDuration)}</p>
          <p className="text-[9px] text-muted-foreground">Avg Watch</p>
        </div>
        <div className="text-center">
          <TrendingDown className="w-3.5 h-3.5 text-destructive mx-auto mb-1" />
          <p className="text-sm font-bold text-foreground">{data.dropoffPoints.length}</p>
          <p className="text-[9px] text-muted-foreground">Drop-offs</p>
        </div>
      </div>

      {/* Viewer chart */}
      {chartPoints.length > 1 && (
        <div className="relative h-24 bg-secondary/30 rounded-lg overflow-hidden">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
            {/* Engagement heatmap background */}
            {chartPoints.map((p, i) => (
              <rect
                key={i}
                x={p.x}
                y={0}
                width={100 / chartPoints.length + 0.5}
                height={100}
                fill={engagementGradient[i]}
                opacity={0.15}
              />
            ))}
            {/* Viewer line */}
            <path
              d={svgPath}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
            {/* Drop-off markers */}
            {data.dropoffPoints.map((dp, i) => {
              const x = durationSeconds > 0 ? (dp.timestamp / durationSeconds) * 100 : 0;
              return (
                <line
                  key={i}
                  x1={x} y1={0} x2={x} y2={100}
                  stroke="hsl(var(--destructive))"
                  strokeWidth="1"
                  strokeDasharray="4 2"
                  vectorEffect="non-scaling-stroke"
                  opacity={0.6}
                />
              );
            })}
          </svg>
          {/* Time labels */}
          <div className="absolute bottom-0 left-0 right-0 flex justify-between px-1">
            <span className="text-[8px] text-muted-foreground">0:00</span>
            <span className="text-[8px] text-muted-foreground">{formatTime(Math.floor(durationSeconds / 2))}</span>
            <span className="text-[8px] text-muted-foreground">{formatTime(durationSeconds)}</span>
          </div>
        </div>
      )}

      {/* Retention curve */}
      <div>
        <p className="text-[10px] font-semibold text-foreground mb-1">Retention Curve</p>
        <div className="flex gap-0.5 h-8">
          {data.retentionCurve.map((pct, i) => (
            <div
              key={i}
              className="flex-1 rounded-sm bg-primary/20 relative overflow-hidden"
            >
              <div
                className="absolute bottom-0 left-0 right-0 bg-primary transition-all"
                style={{ height: `${pct}%` }}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-0.5">
          <span className="text-[8px] text-muted-foreground">Start</span>
          <span className="text-[8px] text-muted-foreground">End</span>
        </div>
      </div>

      {/* Drop-off insights */}
      {data.dropoffPoints.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-foreground mb-1">⚠️ Drop-off Points</p>
          {data.dropoffPoints.slice(0, 3).map((dp, i) => (
            <p key={i} className="text-[9px] text-muted-foreground">
              At {formatTime(dp.timestamp)} — {dp.dropPercent}% viewers left
            </p>
          ))}
        </div>
      )}
    </motion.div>
  );
}
