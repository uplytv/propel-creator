import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft,
  Inbox,
  Loader2,
  Search,
  ExternalLink,
  Check,
  X,
  Mail,
  Globe,
  History,
  Send,
} from "lucide-react";

type ModStatus = "pending" | "approved" | "rejected";

interface Entry {
  id: string;
  challenge_id: string;
  user_id: string;
  title: string;
  description: string | null;
  media_url: string | null;
  external_url: string | null;
  artwork_url: string | null;
  contact_email: string | null;
  country: string | null;
  moderation_status: ModStatus;
  moderation_notes: string | null;
  vote_count: number;
  score: number;
  is_disqualified: boolean;
  created_at: string;
}

interface Challenge {
  id: string;
  title: string;
  slug: string | null;
  status: string;
}

const STATUS_META: Record<ModStatus, { label: string; bg: string; fg: string }> = {
  pending: { label: "Pending", bg: "bg-amber-400/15", fg: "text-amber-300" },
  approved: { label: "Approved", bg: "bg-[#00FF85]/15", fg: "text-[#00FF85]" },
  rejected: { label: "Rejected", bg: "bg-rose-500/15", fg: "text-rose-300" },
};
const STATUS_ORDER: ModStatus[] = ["pending", "approved", "rejected"];

export default function AdminCompetitionEntries() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ModStatus | "all">("pending");
  const [challengeFilter, setChallengeFilter] = useState<string>("all");
  const [q, setQ] = useState("");

  useEffect(() => {
    document.title = "Competition Entries — UPLY Admin";
  }, []);

  const load = async () => {
    setLoading(true);
    const [{ data: ents, error: eErr }, { data: chs, error: cErr }] = await Promise.all([
      (supabase as any)
        .from("music_challenge_entries")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000),
      (supabase as any)
        .from("music_challenges")
        .select("id,title,slug,status")
        .order("created_at", { ascending: false }),
    ]);
    if (eErr) setError(eErr.message);
    else setEntries((ents || []) as Entry[]);
    if (!cErr) setChallenges((chs || []) as Challenge[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("admin-competition-entries")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "music_challenge_entries" },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const updateStatus = async (
    id: string,
    moderation_status: ModStatus,
    moderation_notes?: string | null
  ) => {
    const target = entries.find((e) => e.id === id);
    const prevStatus = target?.moderation_status;
    const patch: any = { moderation_status };
    if (moderation_notes !== undefined) patch.moderation_notes = moderation_notes;
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
    const { error } = await (supabase as any)
      .from("music_challenge_entries")
      .update(patch)
      .eq("id", id);
    if (error) {
      setError(error.message);
      load();
      return;
    }

    // Notify submitter when status transitions to approved or rejected
    if (
      target &&
      (moderation_status === "approved" || moderation_status === "rejected") &&
      moderation_status !== prevStatus &&
      target.contact_email
    ) {
      const challenge = challenges.find((c) => c.id === target.challenge_id);
      const origin = typeof window !== "undefined" ? window.location.origin : "https://uply.tv";
      const leaderboardUrl = challenge?.slug
        ? `${origin}/omid/competition`
        : undefined;
      const submitUrl = `${origin}/omid/competition/submit`;
      try {
        await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "competition-entry-status-update",
            recipientEmail: target.contact_email,
            idempotencyKey: `comp-status-${id}-${moderation_status}-${Date.now()}`,
            templateData: {
              entryTitle: target.title,
              challengeTitle: challenge?.title,
              status: moderation_status,
              notes: moderation_notes || null,
              leaderboardUrl,
              submitUrl,
            },
          },
        });
      } catch (err) {
        console.error("Failed to send status email", err);
      }
    }
  };

  const challengeMap = useMemo(() => {
    const m = new Map<string, Challenge>();
    challenges.forEach((c) => m.set(c.id, c));
    return m;
  }, [challenges]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: entries.length };
    STATUS_ORDER.forEach((s) => (c[s] = 0));
    entries.forEach((e) => (c[e.moderation_status] = (c[e.moderation_status] || 0) + 1));
    return c;
  }, [entries]);

  const perChallengePending = useMemo(() => {
    const m = new Map<string, number>();
    entries.forEach((e) => {
      if (e.moderation_status === "pending")
        m.set(e.challenge_id, (m.get(e.challenge_id) || 0) + 1);
    });
    return m;
  }, [entries]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return entries.filter((e) => {
      if (statusFilter !== "all" && e.moderation_status !== statusFilter) return false;
      if (challengeFilter !== "all" && e.challenge_id !== challengeFilter) return false;
      if (!term) return true;
      const hay = [e.title, e.description, e.contact_email, e.country, e.external_url]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(term);
    });
  }, [entries, statusFilter, challengeFilter, q]);

  return (
    <div className="min-h-screen bg-[#050505] text-white mobile-safe-content">
      {/* Header */}
      <div className="border-b border-white/5 bg-black/60 backdrop-blur sticky top-0 z-30">
        <div className="mx-auto max-w-7xl px-5 py-4 flex items-center gap-3">
          <Link
            to="/admin"
            className="h-9 w-9 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex-1">
            <div className="text-[11px] uppercase tracking-[0.18em] text-[#00FF85]">
              UPLY · Admin · Moderation
            </div>
            <h1 className="font-heading text-xl font-bold leading-tight">
              Competition Entries
            </h1>
          </div>
          <div className="text-xs text-white/50 hidden sm:block">
            {counts.pending || 0} pending · live
          </div>
        </div>

        {/* Filters */}
        <div className="mx-auto max-w-7xl px-5 pb-4 flex flex-wrap gap-2 items-center">
          <FilterChip
            active={statusFilter === "all"}
            onClick={() => setStatusFilter("all")}
            label="All"
            count={counts.all}
          />
          {STATUS_ORDER.map((s) => (
            <FilterChip
              key={s}
              active={statusFilter === s}
              onClick={() => setStatusFilter(s)}
              label={STATUS_META[s].label}
              count={counts[s] || 0}
              dot={STATUS_META[s].fg}
            />
          ))}

          <select
            value={challengeFilter}
            onChange={(e) => setChallengeFilter(e.target.value)}
            className="rounded-full bg-white/[0.04] border border-white/10 text-xs text-white/80 px-3 py-2 focus:outline-none focus:border-[#00FF85]/40 min-h-[36px]"
            style={{ fontSize: 16 }}
          >
            <option value="all">All challenges</option>
            {challenges.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title} ({perChallengePending.get(c.id) || 0} pending)
              </option>
            ))}
          </select>

          <div className="ml-auto relative flex-1 sm:flex-none sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search title, email, country…"
              className="w-full pl-9 pr-3 py-2 rounded-full bg-white/[0.04] border border-white/10 text-sm placeholder:text-white/30 focus:outline-none focus:border-[#00FF85]/40"
              style={{ fontSize: 16 }}
            />
          </div>
        </div>
      </div>

      {/* Per-challenge pending summary */}
      {challenges.length > 0 && (
        <div className="mx-auto max-w-7xl px-5 pt-4 flex gap-2 overflow-x-auto">
          {challenges.map((c) => {
            const pending = perChallengePending.get(c.id) || 0;
            return (
              <button
                key={c.id}
                onClick={() => {
                  setChallengeFilter(c.id);
                  setStatusFilter("pending");
                }}
                className="shrink-0 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-left hover:border-white/20"
              >
                <div className="text-[10px] uppercase tracking-wider text-white/40">
                  {c.status}
                </div>
                <div className="text-sm font-semibold truncate max-w-[180px]">
                  {c.title}
                </div>
                <div className="text-xs text-amber-300">{pending} pending</div>
              </button>
            );
          })}
        </div>
      )}

      {/* Body */}
      <div className="mx-auto max-w-7xl px-5 py-6">
        {error && (
          <div className="mb-4 text-xs text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-lg p-2">
            {error}
          </div>
        )}
        {loading ? (
          <div className="py-24 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-[#00FF85]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <Inbox className="h-10 w-10 text-white/30 mx-auto" />
            <p className="mt-4 text-sm text-white/50">
              No entries match these filters.
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((e) => (
              <EntryCard
                key={e.id}
                entry={e}
                challenge={challengeMap.get(e.challenge_id)}
                onStatus={(s, notes) => updateStatus(e.id, s, notes)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  count,
  dot,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  dot?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold border transition min-h-[36px] ${
        active
          ? "bg-[#00FF85] text-black border-[#00FF85]"
          : "bg-white/[0.04] text-white/70 border-white/10 hover:bg-white/[0.08]"
      }`}
    >
      {dot && !active && <span className={`h-1.5 w-1.5 rounded-full bg-current ${dot}`} />}
      {label}
      <span
        className={`text-[10px] rounded-full px-1.5 py-0.5 ${
          active ? "bg-black/15" : "bg-white/10"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

interface LogRow {
  id: string;
  moderator_id: string | null;
  previous_status: string | null;
  new_status: string;
  notes: string | null;
  created_at: string;
}

function EntryCard({
  entry,
  challenge,
  onStatus,
}: {
  entry: Entry;
  challenge?: Challenge;
  onStatus: (s: ModStatus, notes?: string | null) => void;
}) {
  const meta = STATUS_META[entry.moderation_status];
  const [notes, setNotes] = useState(entry.moderation_notes || "");
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<LogRow[]>([]);
  const [moderatorNames, setModeratorNames] = useState<Record<string, string>>({});
  const [historyLoading, setHistoryLoading] = useState(false);
  const created = new Date(entry.created_at);

  const loadHistory = async () => {
    setHistoryLoading(true);
    const { data } = await (supabase as any)
      .from("competition_entry_moderation_log")
      .select("id,moderator_id,previous_status,new_status,notes,created_at")
      .eq("entry_id", entry.id)
      .order("created_at", { ascending: false });
    const rows = (data || []) as LogRow[];
    setHistory(rows);
    const ids = Array.from(new Set(rows.map((r) => r.moderator_id).filter(Boolean))) as string[];
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles_public")
        .select("user_id,display_name")
        .in("user_id", ids);
      const map: Record<string, string> = {};
      (profs || []).forEach((p: any) => (map[p.user_id] = p.display_name || p.user_id.slice(0, 8)));
      setModeratorNames(map);
    }
    setHistoryLoading(false);
  };

  const toggleHistory = () => {
    const next = !showHistory;
    setShowHistory(next);
    if (next && history.length === 0) loadHistory();
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5 hover:border-white/20 transition">
      <div className="flex flex-wrap items-start gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${meta.bg} ${meta.fg}`}
            >
              {meta.label}
            </span>
            {challenge && (
              <span className="text-[10px] uppercase tracking-wider text-white/40">
                {challenge.title}
              </span>
            )}
            <span className="text-[11px] text-white/40">
              · {created.toLocaleString()}
            </span>
          </div>
          <div className="mt-1.5 font-heading text-lg font-bold truncate">
            {entry.title}
          </div>
          <div className="flex items-center gap-3 text-xs text-white/60 flex-wrap">
            {entry.contact_email && (
              <a
                href={`mailto:${entry.contact_email}`}
                className="inline-flex items-center gap-1 hover:text-white"
              >
                <Mail className="h-3 w-3" /> {entry.contact_email}
              </a>
            )}
            {entry.country && (
              <span className="inline-flex items-center gap-1">
                <Globe className="h-3 w-3" /> {entry.country}
              </span>
            )}
            <span>Votes: {entry.vote_count}</span>
            <span>Score: {Number(entry.score).toFixed(1)}</span>
          </div>
        </div>
      </div>

      {entry.description && (
        <div className="mb-3 text-sm text-white/80 whitespace-pre-wrap">
          {entry.description}
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-3">
        {entry.media_url && (
          <a
            href={entry.media_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs rounded-full bg-white/[0.06] border border-white/10 px-3 py-1.5 hover:bg-white/[0.1]"
          >
            <ExternalLink className="h-3 w-3" /> Open uploaded media
          </a>
        )}
        {entry.external_url && (
          <a
            href={entry.external_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs rounded-full bg-white/[0.06] border border-white/10 px-3 py-1.5 hover:bg-white/[0.1]"
          >
            <ExternalLink className="h-3 w-3" /> External link
          </a>
        )}
        {challenge?.slug && (
          <Link
            to={`/omid/competition`}
            className="inline-flex items-center gap-1.5 text-xs rounded-full bg-white/[0.06] border border-white/10 px-3 py-1.5 hover:bg-white/[0.1]"
          >
            View leaderboard
          </Link>
        )}
        <button
          onClick={toggleHistory}
          className="inline-flex items-center gap-1.5 text-xs rounded-full bg-white/[0.06] border border-white/10 px-3 py-1.5 hover:bg-white/[0.1]"
        >
          <History className="h-3 w-3" /> {showHistory ? "Hide" : "Audit log"}
        </button>
      </div>

      {showHistory && (
        <div className="mb-3 rounded-lg border border-white/10 bg-black/30 p-3">
          {historyLoading ? (
            <div className="flex justify-center py-3">
              <Loader2 className="h-4 w-4 animate-spin text-white/50" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-xs text-white/40">No moderation actions recorded yet.</div>
          ) : (
            <ol className="space-y-2">
              {history.map((h) => {
                const prev = (h.previous_status as ModStatus | null);
                const next = h.new_status as ModStatus;
                const nm = STATUS_META[next];
                return (
                  <li key={h.id} className="text-xs flex flex-wrap items-start gap-2 border-b border-white/5 pb-2 last:border-0 last:pb-0">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${nm.bg} ${nm.fg}`}>
                      {prev ? `${prev} → ${nm.label}` : nm.label}
                    </span>
                    <span className="text-white/70">
                      {h.moderator_id ? (moderatorNames[h.moderator_id] || h.moderator_id.slice(0, 8)) : "System"}
                    </span>
                    <span className="text-white/40">
                      · {new Date(h.created_at).toLocaleString()}
                    </span>
                    {h.notes && (
                      <div className="basis-full text-white/70 italic mt-0.5">“{h.notes}”</div>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      )}

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Moderation notes (optional, internal)"
        rows={2}
        className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-sm placeholder:text-white/30 focus:outline-none focus:border-[#00FF85]/40"
        style={{ fontSize: 16 }}
      />

      <div className="flex flex-wrap gap-2 pt-3 mt-3 border-t border-white/5">
        <button
          onClick={() => { onStatus("approved", notes || null); if (showHistory) setTimeout(loadHistory, 400); }}
          disabled={entry.moderation_status === "approved"}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#00FF85] text-black px-3 py-1.5 text-xs font-bold disabled:opacity-40 min-h-[36px]"
        >
          <Check className="h-3 w-3" /> Approve
        </button>
        <button
          onClick={() => { onStatus("rejected", notes || null); if (showHistory) setTimeout(loadHistory, 400); }}
          disabled={entry.moderation_status === "rejected"}
          className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/20 text-rose-200 border border-rose-500/30 px-3 py-1.5 text-xs font-bold disabled:opacity-40 min-h-[36px]"
        >
          <X className="h-3 w-3" /> Reject
        </button>
        {entry.moderation_status !== "pending" && (
          <button
            onClick={() => { onStatus("pending", notes || null); if (showHistory) setTimeout(loadHistory, 400); }}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] border border-white/10 px-3 py-1.5 text-xs font-semibold text-white/80 min-h-[36px]"
          >
            Move to pending
          </button>
        )}
      </div>
    </div>
  );
}
