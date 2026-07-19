import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ARTIST_ROSTER } from "@/data/artistRoster";
import ArtistSectionNav from "./ArtistSectionNav";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LogOut, Mail, Sparkles, BookOpen, Users, ExternalLink } from "lucide-react";

/**
 * Artist-scoped account dashboard. Shows the signed-in user's relationship
 * to this artist: community status, courses owned, and quick actions.
 * Falls back to the artist sign-in page if not authenticated.
 */
export default function ArtistAccountPage() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const artist = ARTIST_ROSTER.find((a) => a.slug === slug || (a.aliases ?? []).includes(slug));

  const [displayName, setDisplayName] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState("");

  useEffect(() => {
    if (artist) document.title = `${artist.displayName} · Your account · UPLY`;
  }, [artist]);

  useEffect(() => {
    if (loading) return;
    if (!user && artist) {
      navigate(`/${artist.slug}/signin`, { replace: true });
    }
  }, [user, loading, artist, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .maybeSingle();
      const n = (data as any)?.display_name || user.user_metadata?.name || null;
      setDisplayName(n);
      setNameDraft(n || "");
    })();
  }, [user]);

  if (!artist) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
        <div className="text-center">
          <p className="opacity-60">Artist not found.</p>
          <Link to="/roster" className="underline mt-2 inline-block">Browse roster</Link>
        </div>
      </main>
    );
  }

  if (loading || !user) {
    return (
      <main className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </main>
    );
  }

  const accent = artist.accent;
  const affinity = (user.user_metadata as any)?.artist_affinity === artist.slug;

  const saveName = async () => {
    if (!nameDraft.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: nameDraft.trim() })
        .eq("user_id", user.id);
      if (error) throw error;
      setDisplayName(nameDraft.trim());
      setEditing(false);
      toast.success("Saved.");
    } catch (err: any) {
      toast.error(err?.message || "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white">
      <ArtistSectionNav artist={artist} />

      <section
        className="px-6 pt-12 pb-10"
        style={{ background: `radial-gradient(70% 80% at 50% 0%, ${artist.gradient.from}, ${artist.gradient.to} 70%)` }}
      >
        <div className="max-w-3xl mx-auto">
          <p className="text-[11px] uppercase tracking-[0.28em]" style={{ color: accent }}>
            Your account · {artist.displayName}
          </p>
          <h1 className="mt-3 font-bold" style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: "clamp(34px, 6vw, 52px)" }}>
            Welcome{displayName ? `, ${displayName}` : ""}.
          </h1>
          <p className="mt-3 opacity-80 max-w-xl text-[15px]">
            One UPLY account, signed in for {artist.displayName}. Manage your subscription, courses, and updates here.
          </p>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-6 py-10 space-y-6">
        {/* Identity card */}
        <div className="rounded-2xl p-5 bg-white/5 border border-white/10">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.2em] opacity-60">Signed in as</p>
              <p className="mt-1 inline-flex items-center gap-2 text-[14px] opacity-90 truncate">
                <Mail className="w-4 h-4 opacity-60 shrink-0" />
                <span className="truncate">{user.email}</span>
              </p>
              {affinity && (
                <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em]" style={{ color: accent }}>
                  <Sparkles className="w-3 h-3" /> Joined via {artist.displayName}
                </p>
              )}
            </div>
            <button
              onClick={async () => { await signOut(); navigate(`/${artist.slug}`); }}
              className="shrink-0 h-9 px-3 rounded-full text-[12px] font-semibold border border-white/15 hover:bg-white/5 inline-flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign out
            </button>
          </div>

          <div className="mt-5 pt-5 border-t border-white/10">
            <p className="text-[11px] uppercase tracking-[0.2em] opacity-60 mb-2">Display name</p>
            {editing ? (
              <div className="flex gap-2">
                <input
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  className="flex-1 h-10 px-3 rounded-lg bg-black/40 border border-white/10 text-[15px] outline-none focus:border-white/30"
                  placeholder="Your name"
                />
                <button
                  onClick={saveName}
                  disabled={saving}
                  className="h-10 px-4 rounded-lg font-semibold text-[13px] disabled:opacity-60"
                  style={{ background: accent, color: "#0a0a0a" }}
                >
                  {saving ? "Saving…" : "Save"}
                </button>
                <button
                  onClick={() => { setEditing(false); setNameDraft(displayName || ""); }}
                  className="h-10 px-3 rounded-lg text-[13px] border border-white/15"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-[15px] opacity-90">{displayName || <span className="opacity-50">No name set</span>}</p>
                <button onClick={() => setEditing(true)} className="text-[12px] underline opacity-70 hover:opacity-100">Edit</button>
              </div>
            )}
          </div>
        </div>

        {/* Community membership */}
        {artist.community && (
          <div className="rounded-2xl p-5 bg-white/5 border border-white/10">
            <div className="flex items-start gap-3">
              <span
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${accent}22`, color: accent }}
              >
                <Users className="w-5 h-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] uppercase tracking-[0.2em] opacity-60">Community</p>
                <p className="mt-0.5 text-[16px] font-semibold">{artist.community.name}</p>
                <p className="text-[13px] opacity-70 mt-1">
                  {artist.community.contactForPricing ? "By application" : artist.community.priceUsd === 0 ? "Free membership" : `$${artist.community.priceUsd}/mo`} · Not active
                </p>
              </div>
              <Link
                to={`/${artist.slug}/community`}
                className="shrink-0 h-9 px-4 rounded-full text-[13px] font-semibold inline-flex items-center"
                style={{ background: accent, color: "#0a0a0a" }}
              >
                Join
              </Link>
            </div>
          </div>
        )}

        {/* Courses */}
        {artist.courses && artist.courses.length > 0 && (
          <div className="rounded-2xl p-5 bg-white/5 border border-white/10">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-4 h-4" style={{ color: accent }} />
              <p className="text-[11px] uppercase tracking-[0.2em] opacity-60">Your courses</p>
            </div>
            <ul className="space-y-3">
              {artist.courses.map((c) => (
                <li key={c.slug} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold truncate">{c.title}</p>
                    <p className="text-[12px] opacity-60">{c.level} · {c.lessons} lessons · {c.duration}</p>
                  </div>
                  <Link
                    to={`/${artist.slug}/courses/${c.slug}`}
                    className="shrink-0 text-[12px] font-semibold inline-flex items-center gap-1 underline opacity-80 hover:opacity-100"
                  >
                    Open <ExternalLink className="w-3 h-3" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Quick links */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: "Links", href: `/${artist.slug}` },
            { label: "Site", href: `/${artist.slug}-site` },
            ...(artist.posts?.length ? [{ label: "Blog", href: `/${artist.slug}/blog` }] : []),
          ].map((l) => (
            <Link
              key={l.href}
              to={l.href}
              className="h-12 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition inline-flex items-center justify-center text-[13px] font-semibold"
            >
              {l.label}
            </Link>
          ))}
        </div>

        <p className="text-center text-[11px] opacity-40 pt-2">
          Your UPLY account works across every artist on the platform.
        </p>
      </div>
    </main>
  );
}
