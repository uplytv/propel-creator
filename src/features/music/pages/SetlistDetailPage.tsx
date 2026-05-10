import { useState } from "react";
import { useParams } from "react-router-dom";
import {
  useSetlist,
  useSetlistItems,
  useSetlistRequests,
  useMySetlistRequestVotes,
  useSubmitSetlistRequest,
  useToggleSetlistRequestVote,
} from "../hooks/useSetlists";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/hooks/use-toast";
import { ArrowUp, CalendarClock, MapPin, Music2 } from "lucide-react";

function fmtDuration(secs: number | null) {
  if (!secs) return null;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function SetlistDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data: setlist, isLoading } = useSetlist(id);
  const { data: items } = useSetlistItems(id);
  const { data: requests } = useSetlistRequests(id);
  const { data: votedSet } = useMySetlistRequestVotes(id);
  const submit = useSubmitSetlistRequest();
  const toggleVote = useToggleSetlistRequestVote();

  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");

  if (isLoading) return <div className="p-6 text-muted-foreground">Loading…</div>;
  if (!setlist) return <div className="p-6 text-muted-foreground">Setlist not found.</div>;

  const date = new Date(setlist.show_date);

  const submitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await submit.mutateAsync({
        setlist_id: setlist.id,
        track_title: title.trim(),
        note: note.trim() || undefined,
      });
      setTitle("");
      setNote("");
      toast({ title: "Request submitted" });
    } catch (err: any) {
      toast({ title: "Couldn't submit", description: err?.message, variant: "destructive" });
    }
  };

  return (
    <div className="mobile-safe-content max-w-2xl mx-auto p-4 space-y-5">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">{setlist.show_title}</h1>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarClock className="h-4 w-4" />
          <span>
            {date.toLocaleDateString()} ·{" "}
            {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
        {setlist.venue && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{setlist.venue}</span>
          </div>
        )}
        {setlist.notes && (
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{setlist.notes}</p>
        )}
      </header>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-foreground">Setlist</h2>
        {!items?.length && (
          <p className="text-sm text-muted-foreground">No songs published yet.</p>
        )}
        <ol className="space-y-1.5">
          {items?.map((it, idx) => (
            <li
              key={it.id}
              className="flex items-center gap-3 rounded-lg border border-border/50 bg-card/40 p-3"
            >
              <span className="w-6 text-xs text-muted-foreground tabular-nums">
                {String(idx + 1).padStart(2, "0")}
              </span>
              <Music2 className="h-4 w-4 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground line-clamp-1">{it.track_title}</p>
                {it.note && <p className="text-xs text-muted-foreground line-clamp-1">{it.note}</p>}
              </div>
              {it.duration_seconds && (
                <span className="text-xs text-muted-foreground tabular-nums">
                  {fmtDuration(it.duration_seconds)}
                </span>
              )}
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Fan requests</h2>
        {user && (
          <form onSubmit={submitRequest} className="space-y-2 rounded-xl border border-border/50 bg-card/40 p-3">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Song title"
              className="w-full rounded-lg bg-background border border-border/60 px-3 py-2 text-base text-foreground"
              required
            />
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Why this one? (optional)"
              className="w-full rounded-lg bg-background border border-border/60 px-3 py-2 text-base text-foreground"
            />
            <button
              type="submit"
              disabled={submit.isPending || !title.trim()}
              className="w-full min-h-11 rounded-lg bg-primary text-primary-foreground font-semibold disabled:opacity-50"
            >
              {submit.isPending ? "Requesting…" : "Request a song"}
            </button>
          </form>
        )}
        <ul className="space-y-2">
          {requests?.map((r) => {
            const voted = votedSet?.has(r.id) ?? false;
            return (
              <li key={r.id} className="rounded-xl border border-border/50 bg-card/40 p-3">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      toggleVote.mutate({ request_id: r.id, setlist_id: setlist.id, voted })
                    }
                    disabled={!user || toggleVote.isPending}
                    className={`min-w-11 min-h-11 flex flex-col items-center justify-center rounded-lg border ${
                      voted
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/60 text-foreground"
                    }`}
                  >
                    <ArrowUp className="h-4 w-4" />
                    <span className="text-xs font-semibold">{r.vote_count}</span>
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground line-clamp-1 flex-1">
                        {r.track_title}
                      </p>
                      {r.status !== "pending" && (
                        <span
                          className={`text-[10px] uppercase tracking-wide rounded px-1.5 py-0.5 ${
                            r.status === "accepted"
                              ? "bg-primary/15 text-primary"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {r.status}
                        </span>
                      )}
                    </div>
                    {r.note && (
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap mt-0.5">
                        {r.note}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
