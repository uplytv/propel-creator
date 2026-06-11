import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Download, BarChart3, MousePointerClick, Mail, Music, Sparkles, Lock, Gift, Trophy } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { toast } from "sonner";

interface SmartLink {
  id: string;
  slug: string;
  title: string;
  artist: string | null;
  cover_image_url: string | null;
  click_count: number;
  is_presave: boolean;
  creator_id: string;
}

interface Click {
  platform: string | null;
  country: string | null;
  referrer: string | null;
  clicked_at: string;
}

interface EmailRow {
  email: string;
  source: string | null;
  captured_at: string;
}

interface ContestEntry {
  fan_email: string;
  fan_name: string | null;
  referral_code: string | null;
  referral_count: number | null;
}

const PLATFORM_LABELS: Record<string, string> = {
  spotify: "Spotify",
  apple_music: "Apple Music",
  youtube: "YouTube",
  youtube_music: "YouTube Music",
  tidal: "Tidal",
  amazon_music: "Amazon Music",
  soundcloud: "SoundCloud",
  deezer: "Deezer",
  bandcamp: "Bandcamp",
  page_view: "Landing page view",
  presave: "Pre-save click",
};

export default function SmartLinkAnalyticsPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [link, setLink] = useState<SmartLink | null>(null);
  const [clicks, setClicks] = useState<Click[]>([]);
  const [emails, setEmails] = useState<EmailRow[]>([]);
  const [presaveCount, setPresaveCount] = useState(0);
  const [unlockCount, setUnlockCount] = useState(0);
  const [contestCount, setContestCount] = useState(0);
  const [topReferrers, setTopReferrers] = useState<ContestEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || !user) return;
    (async () => {
      setLoading(true);
      const { data: l } = await supabase
        .from("smart_links")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      setLink(l as SmartLink | null);

      const { data: c } = await supabase
        .from("smart_link_clicks")
        .select("platform, country, referrer, clicked_at")
        .eq("link_id", id)
        .order("clicked_at", { ascending: false })
        .limit(5000);
      setClicks((c || []) as Click[]);

      const { data: e } = await supabase
        .from("smart_link_email_captures")
        .select("email, source, captured_at")
        .eq("link_id", id)
        .order("captured_at", { ascending: false });
      setEmails((e || []) as EmailRow[]);

      const { count } = await supabase
        .from("smart_link_presaves")
        .select("*", { head: true, count: "exact" })
        .eq("link_id", id);
      setPresaveCount(count || 0);

      const { count: unlockCt } = await supabase
        .from("smart_link_unlocks" as any)
        .select("*", { head: true, count: "exact" })
        .eq("link_id", id);
      setUnlockCount(unlockCt || 0);

      const { count: contestCt } = await supabase
        .from("smart_link_contest_entries" as any)
        .select("*", { head: true, count: "exact" })
        .eq("link_id", id);
      setContestCount(contestCt || 0);

      const { data: refs } = await supabase
        .from("smart_link_contest_entries" as any)
        .select("fan_email, fan_name, referral_code, referral_count")
        .eq("link_id", id)
        .order("referral_count", { ascending: false })
        .limit(10);
      setTopReferrers(
        ((refs || []) as unknown as ContestEntry[]).filter((e) => (e.referral_count || 0) > 0),
      );

      setLoading(false);
    })();
  }, [id, user]);

  const platformBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of clicks) {
      const k = c.platform || "unknown";
      map[k] = (map[k] || 0) + 1;
    }
    return Object.entries(map)
      .map(([platform, count]) => ({ platform: PLATFORM_LABELS[platform] || platform, count }))
      .sort((a, b) => b.count - a.count);
  }, [clicks]);

  const geoBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of clicks) {
      const k = c.country || "Unknown";
      map[k] = (map[k] || 0) + 1;
    }
    return Object.entries(map)
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [clicks]);

  const timeSeries = useMemo(() => {
    const days: Record<string, number> = {};
    const now = Date.now();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now - i * 86400000);
      days[d.toISOString().slice(0, 10)] = 0;
    }
    for (const c of clicks) {
      const k = c.clicked_at.slice(0, 10);
      if (k in days) days[k]++;
    }
    return Object.entries(days).map(([date, clicks]) => ({
      date: date.slice(5),
      clicks,
    }));
  }, [clicks]);

  const exportEmailsCSV = () => {
    if (!emails.length) return toast.error("No emails to export");
    const header = "email,source,captured_at\n";
    const rows = emails
      .map((e) => `"${e.email}","${e.source || ""}","${e.captured_at}"`)
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${link?.slug || "smartlink"}-emails.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported");
  };

  if (loading) {
    return <div className="p-6 max-w-5xl mx-auto">Loading…</div>;
  }
  if (!link) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <p>SmartLink not found.</p>
        <Link to="/smart-links" className="text-primary underline">Back</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background mobile-safe-content">
      <div className="max-w-5xl mx-auto p-4 sm:p-6">
        <Link to="/smart-links" className="inline-flex items-center text-sm text-muted-foreground mb-4 min-h-[44px]">
          <ChevronLeft className="h-4 w-4 mr-1" /> Back to SmartLinks
        </Link>

        {/* Header */}
        <div className="flex items-start gap-4 mb-6">
          <div className="w-20 h-20 rounded bg-muted overflow-hidden flex-shrink-0">
            {link.cover_image_url ? (
              <img src={link.cover_image_url} alt={link.title} className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <div className="w-full h-full flex items-center justify-center"><Music className="h-8 w-8 text-muted-foreground" /></div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="h-5 w-5 text-primary" />
              <h1 className="text-xl sm:text-2xl font-bold truncate">{link.title}</h1>
              {link.is_presave && <Badge variant="secondary">Pre-save</Badge>}
            </div>
            <p className="text-sm text-muted-foreground truncate">/link/{link.slug}</p>
            {link.artist && <p className="text-sm text-muted-foreground">{link.artist}</p>}
          </div>
          <Button asChild variant="outline" size="sm" className="min-h-[44px]">
            <Link to={`/smart-links/campaign?link_id=${link.id}`}>
              <Sparkles className="h-4 w-4 mr-1" /> Promote
            </Link>
          </Button>
        </div>

        {/* Hero KPIs — primary engagement */}
        <div className="grid grid-cols-3 gap-3 mb-3">
          <Card className="p-4 bg-gradient-to-br from-primary/15 via-card to-card border-primary/30">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
              <MousePointerClick className="h-3 w-3" /> Clicks
            </div>
            <div className="text-3xl font-extrabold tabular-nums">{clicks.length.toLocaleString()}</div>
          </Card>
          <Card className="p-4">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Page views</div>
            <div className="text-3xl font-extrabold tabular-nums">{link.click_count.toLocaleString()}</div>
          </Card>
          <Card className="p-4">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Pre-saves</div>
            <div className="text-3xl font-extrabold tabular-nums text-primary">{presaveCount.toLocaleString()}</div>
          </Card>
        </div>

        {/* Secondary KPIs */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card className="p-3">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
              <Mail className="h-3 w-3" /> Emails
            </div>
            <div className="text-xl font-bold tabular-nums">{emails.length.toLocaleString()}</div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
              <Lock className="h-3 w-3" /> Unlocks
            </div>
            <div className="text-xl font-bold tabular-nums">{unlockCount.toLocaleString()}</div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
              <Gift className="h-3 w-3" /> Contest
            </div>
            <div className="text-xl font-bold tabular-nums">{contestCount.toLocaleString()}</div>
          </Card>
        </div>

        {topReferrers.length > 0 && (
          <Card className="p-4 mb-6">
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-primary" />
              Top contest referrers
            </h2>
            <ol className="space-y-2">
              {topReferrers.map((entry, idx) => {
                const maskEmail = (email: string) => {
                  const [u, d] = email.split("@");
                  if (!u || !d) return email;
                  const mu = u.length <= 2 ? u[0] + "*" : u.slice(0, 2) + "***";
                  return `${mu}@${d}`;
                };
                return (
                  <li
                    key={entry.referral_code || idx}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="text-muted-foreground w-5 text-right">{idx + 1}.</span>
                      <span className="truncate">
                        {entry.fan_name || maskEmail(entry.fan_email)}
                      </span>
                    </span>
                    <span className="font-semibold tabular-nums">
                      {entry.referral_count || 0}{" "}
                      {(entry.referral_count || 0) === 1 ? "referral" : "referrals"}
                    </span>
                  </li>
                );
              })}
            </ol>
          </Card>
        )}

        {/* Time series */}
        <Card className="p-4 mb-6">
          <h2 className="text-sm font-semibold mb-3">Clicks — last 30 days</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} />
                <Line type="monotone" dataKey="clicks" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {/* Platform breakdown */}
          <Card className="p-4">
            <h2 className="text-sm font-semibold mb-3">Clicks by platform</h2>
            {platformBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground">No clicks yet.</p>
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={platformBreakdown} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                    <YAxis type="category" dataKey="platform" tick={{ fontSize: 11 }} width={100} />
                    <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          {/* Geo */}
          <Card className="p-4">
            <h2 className="text-sm font-semibold mb-3">Top countries</h2>
            {geoBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data yet.</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {geoBreakdown.map((g) => (
                  <li key={g.country} className="flex items-center justify-between">
                    <span>{g.country}</span>
                    <span className="text-muted-foreground">{g.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Emails */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">Captured emails ({emails.length})</h2>
            <Button onClick={exportEmailsCSV} size="sm" variant="outline" className="min-h-[36px]">
              <Download className="h-3 w-3 mr-1" /> Export CSV
            </Button>
          </div>
          {emails.length === 0 ? (
            <p className="text-sm text-muted-foreground">No emails captured yet.</p>
          ) : (
            <div className="max-h-72 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground border-b">
                  <tr><th className="text-left py-2">Email</th><th className="text-left">Source</th><th className="text-right">When</th></tr>
                </thead>
                <tbody>
                  {emails.slice(0, 200).map((e) => (
                    <tr key={e.email + e.captured_at} className="border-b border-border/50">
                      <td className="py-1.5">{e.email}</td>
                      <td className="text-muted-foreground">{e.source || "—"}</td>
                      <td className="text-right text-muted-foreground text-xs">
                        {new Date(e.captured_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
