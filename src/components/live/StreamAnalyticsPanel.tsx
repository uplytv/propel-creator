import { motion } from 'framer-motion';
import { TrendingUp, Eye, MessageSquare, Coins, Clock, Activity, BarChart3, X } from 'lucide-react';
import { type StreamAnalytics } from '@/hooks/useStreamAnalytics';

interface StreamAnalyticsPanelProps {
  analytics: StreamAnalytics;
  isLive: boolean;
  onClose: () => void;
}

export default function StreamAnalyticsPanel({ analytics, isLive, onClose }: StreamAnalyticsPanelProps) {
  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const stats = [
    {
      label: 'Peak Viewers',
      value: analytics.peakViewers.toString(),
      icon: Eye,
      color: 'text-blue-400',
      bgColor: 'rgba(59,130,246,0.15)',
    },
    {
      label: 'Current',
      value: analytics.currentViewers.toString(),
      icon: Activity,
      color: 'text-green-400',
      bgColor: 'rgba(34,197,94,0.15)',
    },
    {
      label: 'Chat Messages',
      value: analytics.totalChatMessages.toString(),
      icon: MessageSquare,
      color: 'text-purple-400',
      bgColor: 'rgba(168,85,247,0.15)',
    },
    {
      label: 'Tips',
      value: `$${analytics.tipRevenue}`,
      icon: Coins,
      color: 'text-amber-400',
      bgColor: 'rgba(245,158,11,0.15)',
    },
    {
      label: 'Duration',
      value: formatTime(analytics.avgWatchTimeSeconds),
      icon: Clock,
      color: 'text-cyan-400',
      bgColor: 'rgba(6,182,212,0.15)',
    },
    {
      label: 'Engagement',
      value: `${analytics.engagementRate}%`,
      icon: TrendingUp,
      color: 'text-pink-400',
      bgColor: 'rgba(236,72,153,0.15)',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="rounded-2xl p-4 space-y-3"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(16px)' }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">Live Analytics</span>
        </div>
        <button onClick={onClose}>
          <X className="w-3.5 h-3.5 text-white/50 hover:text-white" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl p-2.5 text-center"
            style={{ backgroundColor: stat.bgColor }}
          >
            <stat.icon className={`w-3.5 h-3.5 mx-auto mb-1 ${stat.color}`} />
            <p className="text-sm font-bold text-white">{stat.value}</p>
            <p className="text-[9px] text-white/50 uppercase tracking-wider">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Mini viewer timeline */}
      {analytics.viewerTimeline.length > 1 && (
        <div className="space-y-1">
          <span className="text-[10px] text-white/40 uppercase tracking-wider">Viewer Trend</span>
          <div className="flex items-end gap-0.5 h-8">
            {analytics.viewerTimeline.slice(-20).map((point, i) => {
              const max = Math.max(...analytics.viewerTimeline.map(p => p.viewers), 1);
              const height = (point.viewers / max) * 100;
              return (
                <div
                  key={i}
                  className="flex-1 rounded-t-sm bg-primary/60"
                  style={{ height: `${Math.max(height, 5)}%` }}
                />
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}
