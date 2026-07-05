import { Link, useParams, Navigate } from 'react-router-dom';
import { ArrowLeft, Play, Heart, Repeat2, MessageCircle } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { useTrack } from '../hooks/useTrack';
import { useTrackInsights } from '../hooks/useTrackInsights';
import { useAuth } from '@/context/AuthContext';

export default function TrackInsightsPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data: track, isLoading } = useTrack(id);
  const { data: insights } = useTrackInsights(id);

  if (isLoading) return <div className="p-8 text-white/40">Loading…</div>;
  if (!track) return <div className="p-8 text-white/40">Not found</div>;
  if (track.creator_id !== user?.id)
    return (
      <div className="p-8 text-center text-white/60">
        <h1 className="text-xl font-bold mb-2">Forbidden</h1>
        <p className="text-sm">Only the track owner can view insights.</p>
      </div>
    );

  const completion = Math.round((insights?.completionRate ?? 0) * 100);

  return (
    <div className="pb-32 px-4 pt-3 max-w-3xl mx-auto">
      <Link
        to={`/music/track/${id}`}
        className="inline-flex items-center gap-1 text-white/60 text-sm"
      >
        <ArrowLeft className="w-4 h-4" /> Back to track
      </Link>
      <h1 className="text-2xl font-black text-white mt-2">{track.title} — Insights</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
        <Stat icon={<Play className="w-4 h-4" />} label="Plays" value={insights?.playCount ?? 0} />
        <Stat icon={<Heart className="w-4 h-4" />} label="Likes" value={insights?.likeCount ?? 0} />
        <Stat icon={<Repeat2 className="w-4 h-4" />} label="Reposts" value={insights?.repostCount ?? 0} />
        <Stat icon={<MessageCircle className="w-4 h-4" />} label="Comments" value={insights?.commentCount ?? 0} />
      </div>

      <section className="mt-6 rounded-2xl bg-white/[0.03] border border-white/5 p-4">
        <h2 className="text-sm font-bold text-white mb-3">Plays per day (30d)</h2>
        <div className="h-56">
          <ResponsiveContainer>
            <LineChart data={insights?.playsSeries ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" stroke="rgba(255,255,255,0.4)" fontSize={10} />
              <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} />
              <Tooltip
                contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)' }}
              />
              <Line type="monotone" dataKey="count" stroke="#3D7CFF" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="mt-6 rounded-2xl bg-white/[0.03] border border-white/5 p-4">
        <h2 className="text-sm font-bold text-white mb-3">Completion rate</h2>
        <div className="text-4xl font-black text-primary">{completion}%</div>
        <div className="text-xs text-white/50 mt-1">
          Average % of the track that listeners played in the last 30 days.
        </div>
      </section>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white/[0.04] border border-white/5 p-3">
      <div className="flex items-center gap-1 text-xs text-white/50">
        {icon} {label}
      </div>
      <div className="text-xl font-black text-white mt-1">{value.toLocaleString()}</div>
    </div>
  );
}
