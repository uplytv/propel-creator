import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTrackListenerTrends, useTrackGeoBreakdown, useCreatorMusicRevenue } from "../hooks/useMusicAnalytics";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { TrendingUp, Users, DollarSign, Globe } from "lucide-react";

export default function MusicAnalyticsPage() {
  const { user } = useAuth();
  const [days, setDays] = useState(30);
  const [trackId, setTrackId] = useState<string | undefined>();

  const { data: tracks } = useQuery({
    queryKey: ["my-music-tracks", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await (supabase as any)
        .from("music_tracks")
        .select("id, title, cover_url")
        .eq("artist_id", user.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const effectiveTrack = trackId || tracks?.[0]?.id;
  const { data: trends = [] } = useTrackListenerTrends(effectiveTrack, days);
  const { data: geo } = useTrackGeoBreakdown(effectiveTrack, days);
  const { data: revenue = [] } = useCreatorMusicRevenue(user?.id, days);

  const totalPlays = trends.reduce((s, d) => s + Number(d.plays || 0), 0);
  const totalListeners = trends.reduce((s, d) => Math.max(s, Number(d.unique_listeners || 0)), 0);
  const totalRevenue = revenue.reduce((s, d) => s + Number(d.total_revenue || 0), 0);

  if (!user) {
    return <div className="px-4 py-8 text-white/60">Sign in to view your music analytics.</div>;
  }

  return (
    <div className="px-4 py-4 mobile-safe-content space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-white font-black text-2xl">Music Analytics</h1>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="bg-white/5 text-white text-sm rounded-lg px-3 py-2 border border-white/10"
          style={{ fontSize: 16 }}
        >
          <option value={7}>7 days</option>
          <option value={30}>30 days</option>
          <option value={90}>90 days</option>
        </select>
      </header>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2.5">
        <StatCard icon={TrendingUp} label="Plays" value={totalPlays.toLocaleString()} color="#3D7CFF" />
        <StatCard icon={Users} label="Listeners" value={totalListeners.toLocaleString()} color="#00E5FF" />
        <StatCard icon={DollarSign} label="Revenue" value={`$${totalRevenue.toFixed(0)}`} color="#FFD700" />
      </div>

      {/* Track selector */}
      {tracks && tracks.length > 0 && (
        <div>
          <label className="text-white/60 text-xs font-medium mb-2 block">Track</label>
          <select
            value={effectiveTrack || ""}
            onChange={(e) => setTrackId(e.target.value)}
            className="w-full bg-white/5 text-white rounded-lg px-3 py-3 border border-white/10"
            style={{ fontSize: 16 }}
          >
            {tracks.map((t: any) => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </select>
        </div>
      )}

      {/* Listener trends */}
      <section className="rounded-xl bg-white/5 p-4">
        <h3 className="text-white font-bold text-sm mb-3">Daily Plays & Listeners</h3>
        <div style={{ width: "100%", height: 220 }}>
          <ResponsiveContainer>
            <LineChart data={trends}>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="day" stroke="rgba(255,255,255,0.4)" fontSize={10} />
              <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} />
              <Tooltip contentStyle={{ background: "#0A0A0A", border: "1px solid rgba(255,255,255,0.1)" }} />
              <Line type="monotone" dataKey="plays" stroke="#3D7CFF" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="unique_listeners" stroke="#00E5FF" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Revenue */}
      <section className="rounded-xl bg-white/5 p-4">
        <h3 className="text-white font-bold text-sm mb-3">Daily Revenue</h3>
        <div style={{ width: "100%", height: 220 }}>
          <ResponsiveContainer>
            <BarChart data={revenue}>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="day" stroke="rgba(255,255,255,0.4)" fontSize={10} />
              <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} />
              <Tooltip contentStyle={{ background: "#0A0A0A", border: "1px solid rgba(255,255,255,0.1)" }} />
              <Bar dataKey="sales_revenue" stackId="a" fill="#3D7CFF" />
              <Bar dataKey="tips_revenue" stackId="a" fill="#FFD700" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Geo breakdown */}
      <section className="rounded-xl bg-white/5 p-4">
        <h3 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
          <Globe className="w-4 h-4" /> Top Locations
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-white/40 text-xs font-medium mb-2">Countries</p>
            <ul className="space-y-1.5">
              {(geo?.countries ?? []).slice(0, 5).map((c) => (
                <li key={c.country} className="flex justify-between text-sm">
                  <span className="text-white/80">{c.country}</span>
                  <span className="text-white/50">{c.listeners}</span>
                </li>
              ))}
              {(!geo?.countries || geo.countries.length === 0) && (
                <li className="text-white/30 text-xs">No data yet</li>
              )}
            </ul>
          </div>
          <div>
            <p className="text-white/40 text-xs font-medium mb-2">Cities</p>
            <ul className="space-y-1.5">
              {(geo?.cities ?? []).slice(0, 5).map((c) => (
                <li key={c.city} className="flex justify-between text-sm">
                  <span className="text-white/80">{c.city}</span>
                  <span className="text-white/50">{c.listeners}</span>
                </li>
              ))}
              {(!geo?.cities || geo.cities.length === 0) && (
                <li className="text-white/30 text-xs">No data yet</li>
              )}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl p-3 bg-white/5">
      <Icon className="w-4 h-4 mb-2" style={{ color }} />
      <p className="text-white font-black text-lg">{value}</p>
      <p className="text-white/40 text-[11px] font-medium">{label}</p>
    </div>
  );
}
