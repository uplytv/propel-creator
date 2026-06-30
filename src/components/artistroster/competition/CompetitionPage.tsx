import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Trophy, Upload, Flame, Globe, PlayCircle, Share2, Sparkles, ChevronRight, Heart, Loader2 } from "lucide-react";
import { ARTIST_ROSTER } from "@/data/artistRoster";
import ArtistSectionNav from "../ArtistSectionNav";
import { useAuth } from "@/context/AuthContext";
import { useWallet } from "@/hooks/useWallet";
import { useToast } from "@/hooks/use-toast";
import {
  useCompetitionBySlug,
  useLeaderboard,
  useMyFreeVotes,
  useMyEntry,
  useEntry,
  useCastFreeVote,
  useSuperVote,
  useSubmitEntry,
  uploadCompetitionMedia,
} from "./useCompetition";

function MediaPlayer({ mediaUrl, externalUrl }: { mediaUrl?: string | null; externalUrl?: string | null }) {
  if (mediaUrl) {
    const isVideo = /\.(mp4|webm|mov|m4v)(\?|$)/i.test(mediaUrl);
    if (isVideo) {
      return <video src={mediaUrl} controls playsInline className="w-full rounded-xl bg-black aspect-video" />;
    }
    return <audio src={mediaUrl} controls className="w-full" />;
  }
  if (externalUrl) {
    return (
      <a
        href={externalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 text-sm underline opacity-80 hover:opacity-100"
      >
        <PlayCircle className="w-4 h-4" /> Watch on external site
      </a>
    );
  }
  return null;
}

export default function CompetitionPage() {
  const { slug = "", entryId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const artist = ARTIST_ROSTER.find((a) => a.slug === slug || (a.aliases ?? []).includes(slug));
  const { data: challenge, isLoading } = useCompetitionBySlug(artist?.competitionSlug);
  const { data: leaderboard = [] } = useLeaderboard(challenge?.id);
  const { data: myVotes } = useMyFreeVotes(challenge?.id);
  const { data: myEntry } = useMyEntry(challenge?.id);
  const { data: wallet } = useWallet();
  const { data: focusedEntry } = useEntry(entryId);
  const castFree = useCastFreeVote();
  const superVote = useSuperVote();

  useEffect(() => {
    if (artist && challenge) document.title = `${challenge.title} · ${artist.displayName} · UPLY`;
  }, [artist, challenge]);

  if (!artist) {
    return <main className="min-h-screen flex items-center justify-center bg-background text-foreground p-6"><p className="opacity-60">Artist not found.</p></main>;
  }
  if (isLoading) {
    return <main className="min-h-screen flex items-center justify-center bg-[#0A0A0A] text-white"><Loader2 className="w-6 h-6 animate-spin" /></main>;
  }
  if (!challenge) {
    return (
      <main className="min-h-screen bg-[#0A0A0A] text-white">
        <ArtistSectionNav artist={artist} />
        <div className="max-w-2xl mx-auto px-6 py-24 text-center">
          <p className="opacity-60">No active competition right now. Check back soon.</p>
        </div>
      </main>
    );
  }

  const handleFreeVote = async (entryIdToVote: string) => {
    if (!user) { navigate(`/${artist.slug}/signin`); return; }
    try {
      await castFree.mutateAsync(entryIdToVote);
      toast({ title: "Vote cast!", description: "Thanks for supporting this artist." });
    } catch (e: any) {
      toast({ title: "Couldn't vote", description: e?.message ?? String(e), variant: "destructive" });
    }
  };

  const handleSuperVote = async (entryIdToVote: string, credits: number) => {
    if (!user) { navigate(`/${artist.slug}/signin`); return; }
    try {
      await superVote.mutateAsync({ entryId: entryIdToVote, credits });
      toast({ title: `Super vote × ${credits} cast!`, description: "You boosted this entry up the leaderboard." });
    } catch (e: any) {
      toast({ title: "Super vote failed", description: e?.message ?? String(e), variant: "destructive" });
    }
  };

  // Entry detail view
  if (entryId) {
    if (!focusedEntry) {
      return (
        <main className="min-h-screen bg-[#0A0A0A] text-white">
          <ArtistSectionNav artist={artist} />
          <div className="max-w-2xl mx-auto px-6 py-24 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
        </main>
      );
    }
    const rank = leaderboard.findIndex((l: any) => l.entry_id === entryId) + 1;
    return (
      <main className="min-h-screen bg-[#0A0A0A] text-white">
        <ArtistSectionNav artist={artist} />
        <article className="max-w-[760px] mx-auto px-6 pt-10 pb-24">
          <Link to={`/${artist.slug}/competition`} className="text-[12px] uppercase tracking-[0.2em] opacity-60 hover:opacity-100">
            ← All entries
          </Link>
          <div className="mt-4 flex items-center gap-3">
            {rank > 0 && (
              <span className="px-3 py-1 rounded-full text-[12px] font-bold" style={{ background: `${artist.accent}22`, color: artist.accent }}>
                #{rank} on leaderboard
              </span>
            )}
            {focusedEntry.country && <span className="text-[12px] opacity-70 inline-flex items-center gap-1"><Globe className="w-3 h-3" /> {focusedEntry.country}</span>}
          </div>
          <h1 className="mt-3 font-bold" style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: "clamp(32px, 5vw, 48px)" }}>
            {focusedEntry.title}
          </h1>
          {focusedEntry.description && <p className="mt-3 opacity-85 text-[15px] whitespace-pre-line">{focusedEntry.description}</p>}
          <div className="mt-6">
            <MediaPlayer mediaUrl={focusedEntry.media_url} externalUrl={focusedEntry.external_url as any} />
          </div>

          <div className="mt-8 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-white/5 border border-white/10 p-4">
              <div className="text-2xl font-bold" style={{ color: artist.accent }}>{focusedEntry.vote_count}</div>
              <div className="text-[11px] uppercase tracking-[0.2em] opacity-60">Votes</div>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/10 p-4">
              <div className="text-2xl font-bold" style={{ color: artist.accent }}>{Number(focusedEntry.score).toFixed(0)}</div>
              <div className="text-[11px] uppercase tracking-[0.2em] opacity-60">Score</div>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/10 p-4">
              <div className="text-2xl font-bold" style={{ color: artist.accent }}>{rank > 0 ? `#${rank}` : "—"}</div>
              <div className="text-[11px] uppercase tracking-[0.2em] opacity-60">Rank</div>
            </div>
          </div>

          <VoteBar
            artist={artist}
            entryId={focusedEntry.id}
            disabledFree={myVotes?.has(focusedEntry.id) || focusedEntry.user_id === user?.id}
            ownEntry={focusedEntry.user_id === user?.id}
            credits={wallet?.credits ?? 0}
            onFree={() => handleFreeVote(focusedEntry.id)}
            onSuper={(c) => handleSuperVote(focusedEntry.id, c)}
            loading={castFree.isPending || superVote.isPending}
          />

          <button
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              toast({ title: "Link copied", description: "Share this entry to rally votes." });
            }}
            className="mt-6 inline-flex items-center gap-2 text-sm opacity-80 hover:opacity-100"
          >
            <Share2 className="w-4 h-4" /> Share this entry
          </button>
        </article>
      </main>
    );
  }

  // Leaderboard / landing view
  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white">
      <ArtistSectionNav artist={artist} />

      <section
        className="px-6 pt-14 pb-12 text-center relative overflow-hidden"
        style={{ background: `radial-gradient(70% 80% at 50% 0%, ${artist.gradient.from}, ${artist.gradient.to} 70%)` }}
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] uppercase tracking-[0.28em] bg-black/40 border border-white/10">
          <Sparkles className="w-3 h-3" style={{ color: artist.accent }} /> Global Talent Search
        </div>
        <h1 className="mt-4 font-bold" style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: "clamp(40px, 8vw, 80px)", lineHeight: 1 }}>
          {challenge.title}
        </h1>
        <p className="mt-5 max-w-2xl mx-auto text-[16px] opacity-85">{challenge.description}</p>
        <div className="mt-6 flex items-center justify-center gap-3 flex-wrap">
          <Link
            to={`/${artist.slug}/competition/submit`}
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full font-semibold"
            style={{ background: artist.accent, color: "#0a0a0a" }}
          >
            <Upload className="w-4 h-4" /> {myEntry ? "Update my submission" : "Submit your talent"}
          </Link>
          <a href="#leaderboard" className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full font-semibold border border-white/20 hover:bg-white/5">
            <Trophy className="w-4 h-4" /> View leaderboard
          </a>
        </div>
        <div className="mt-6 flex items-center justify-center gap-6 text-[12px] opacity-70 flex-wrap">
          <span><strong className="text-white">{leaderboard.length}</strong> entries</span>
          <span><strong className="text-white">{challenge.vote_count}</strong> votes cast</span>
          {challenge.submission_deadline && (
            <span>Submissions close <strong className="text-white">{new Date(challenge.submission_deadline).toLocaleDateString()}</strong></span>
          )}
        </div>
      </section>

      {/* Prize + rules */}
      <section className="max-w-[920px] mx-auto px-6 py-12 grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl p-6 bg-white/5 border border-white/10">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] opacity-70 mb-3"><Trophy className="w-3.5 h-3.5" /> The Prize</div>
          <p className="text-[15px] opacity-90 whitespace-pre-line">{challenge.prize_description}</p>
        </div>
        <div className="rounded-2xl p-6 bg-white/5 border border-white/10">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] opacity-70 mb-3"><Flame className="w-3.5 h-3.5" /> Rules</div>
          <p className="text-[14px] opacity-85 whitespace-pre-line">{challenge.rules ?? "Be original. Be respectful. Have fun."}</p>
        </div>
      </section>

      {/* My status */}
      {user && (
        <section className="max-w-[920px] mx-auto px-6 pb-8">
          <div className="rounded-2xl p-5 bg-white/5 border border-white/10 flex items-center justify-between flex-wrap gap-3">
            <div className="text-[14px] opacity-85">
              {myEntry ? (
                <>Your entry: <strong>{myEntry.title}</strong> — <span className="opacity-70">{myEntry.moderation_status === "approved" ? "live" : myEntry.moderation_status === "pending" ? "under review" : "rejected"}</span></>
              ) : (
                <>Got a voice? <Link to={`/${artist.slug}/competition/submit`} className="underline">Submit your entry</Link>.</>
              )}
            </div>
            <div className="text-[12px] opacity-70">⚡ Super vote balance: <strong className="text-white">{wallet?.credits ?? 0}</strong> credits</div>
          </div>
        </section>
      )}

      {/* Leaderboard */}
      <section id="leaderboard" className="max-w-[920px] mx-auto px-6 pb-24">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-2xl font-bold" style={{ fontFamily: "Fraunces, Georgia, serif" }}>Live Leaderboard</h2>
          <span className="text-[11px] uppercase tracking-[0.2em] opacity-60">Top {leaderboard.length}</span>
        </div>
        {leaderboard.length === 0 ? (
          <div className="rounded-2xl p-12 text-center bg-white/5 border border-white/10">
            <p className="opacity-70">No approved entries yet. Be the first — <Link to={`/${artist.slug}/competition/submit`} className="underline">submit yours</Link>.</p>
          </div>
        ) : (
          <ol className="space-y-2">
            {leaderboard.map((row: any, i: number) => {
              const isTop3 = i < 3;
              const voted = myVotes?.has(row.entry_id);
              return (
                <li
                  key={row.entry_id}
                  className="rounded-xl bg-white/5 border border-white/10 hover:bg-white/[0.08] transition-colors"
                >
                  <div className="p-4 flex items-center gap-4">
                    <div
                      className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-[14px]"
                      style={isTop3 ? { background: artist.accent, color: "#0a0a0a" } : { background: "rgba(255,255,255,0.08)" }}
                    >
                      {i + 1}
                    </div>
                    <Link to={`/${artist.slug}/competition/entry/${row.entry_id}`} className="flex-1 min-w-0">
                      <div className="font-semibold truncate" style={{ fontFamily: "Fraunces, Georgia, serif" }}>{row.title}</div>
                      <div className="text-[12px] opacity-60 flex items-center gap-3 mt-0.5">
                        <span>{row.vote_count} votes</span>
                        <span>·</span>
                        <span>score {Number(row.score).toFixed(0)}</span>
                        {row.country && (<><span>·</span><span className="inline-flex items-center gap-1"><Globe className="w-3 h-3" />{row.country}</span></>)}
                      </div>
                    </Link>
                    <button
                      onClick={() => handleFreeVote(row.entry_id)}
                      disabled={voted || row.user_id === user?.id || castFree.isPending}
                      className="shrink-0 inline-flex items-center gap-1.5 px-3 h-9 rounded-full text-[12px] font-semibold border transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{
                        borderColor: voted ? artist.accent : "rgba(255,255,255,0.2)",
                        background: voted ? `${artist.accent}22` : "transparent",
                        color: voted ? artist.accent : "white",
                      }}
                      aria-label={voted ? "Already voted" : "Upvote"}
                    >
                      <Heart className="w-3.5 h-3.5" fill={voted ? artist.accent : "none"} />
                      {voted ? "Voted" : "Vote"}
                    </button>
                    <Link
                      to={`/${artist.slug}/competition/entry/${row.entry_id}`}
                      className="shrink-0 opacity-60 hover:opacity-100"
                      aria-label="Open entry"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </Link>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </main>
  );
}

function VoteBar({
  artist,
  entryId,
  disabledFree,
  ownEntry,
  credits,
  onFree,
  onSuper,
  loading,
}: {
  artist: any;
  entryId: string;
  disabledFree: boolean;
  ownEntry: boolean;
  credits: number;
  onFree: () => void;
  onSuper: (credits: number) => void;
  loading: boolean;
}) {
  const [boost, setBoost] = useState(5);
  if (ownEntry) {
    return (
      <div className="mt-8 rounded-2xl p-5 bg-white/5 border border-white/10 text-center text-[14px] opacity-80">
        This is your entry — share the link to gather votes.
      </div>
    );
  }
  return (
    <div className="mt-8 rounded-2xl p-5 bg-white/5 border border-white/10">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] opacity-60">Free vote</div>
          <div className="text-[14px] opacity-85">One per entry — costs nothing.</div>
        </div>
        <button
          onClick={onFree}
          disabled={disabledFree || loading}
          className="px-5 py-2.5 rounded-full font-semibold inline-flex items-center gap-2 disabled:opacity-40"
          style={{ background: disabledFree ? "rgba(255,255,255,0.1)" : artist.accent, color: disabledFree ? "white" : "#0a0a0a" }}
        >
          <Heart className="w-4 h-4" /> {disabledFree ? "Already voted" : "Cast free vote"}
        </button>
      </div>

      <div className="h-px bg-white/10 my-5" />

      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.2em] opacity-60">Super vote</div>
            <div className="text-[14px] opacity-85">Spend UPLY credits — 1 credit = 1 weight. Stack them to push your favorite up the leaderboard.</div>
          </div>
          <div className="text-[12px] opacity-70">Balance: <strong className="text-white">{credits}</strong></div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="number"
            min={1}
            max={Math.max(1, Math.min(credits, 1000))}
            value={boost}
            onChange={(e) => setBoost(Math.max(1, Math.min(1000, Number(e.target.value) || 1)))}
            className="w-24 px-3 h-10 rounded-lg bg-black/40 border border-white/15 text-white text-[14px]"
          />
          <button
            onClick={() => onSuper(boost)}
            disabled={loading || credits < boost}
            className="px-5 h-10 rounded-full font-semibold inline-flex items-center gap-2 disabled:opacity-40"
            style={{ background: artist.accent, color: "#0a0a0a" }}
          >
            <Flame className="w-4 h-4" /> Boost × {boost}
          </button>
          {credits < boost && (
            <Link to="/buy-credits" className="text-[12px] underline opacity-80 hover:opacity-100">
              Buy more credits
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
