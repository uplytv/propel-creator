import { useState } from "react";
import { useParams } from "react-router-dom";
import {
  useGuestList,
  useMyGuestRequest,
  useGuestRequestsForList,
  useSubmitGuestRequest,
  useUpdateGuestRequestStatus,
} from "../hooks/useGuestLists";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/hooks/use-toast";
import { CalendarClock, MapPin, Users, Check, X, UserCheck } from "lucide-react";

export default function GuestListDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data: list, isLoading } = useGuestList(id);
  const { data: myRequest } = useMyGuestRequest(id);
  const { data: requests } = useGuestRequestsForList(id);
  const submit = useSubmitGuestRequest();
  const updateStatus = useUpdateGuestRequestStatus();

  const [fullName, setFullName] = useState("");
  const [plusOne, setPlusOne] = useState("");
  const [note, setNote] = useState("");

  if (isLoading) return <div className="p-6 text-muted-foreground">Loading…</div>;
  if (!list) return <div className="p-6 text-muted-foreground">Guest list not found.</div>;

  const isArtist = user?.id === list.artist_id;
  const date = new Date(list.show_date);
  const remaining = Math.max(0, list.capacity - list.spots_used);
  const isFull = remaining <= 0;
  const isOpen = list.status === "open";

  const submitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;
    try {
      await submit.mutateAsync({
        guest_list_id: list.id,
        full_name: fullName.trim(),
        plus_one_name: plusOne.trim() || undefined,
        note: note.trim() || undefined,
      });
      toast({ title: "Request submitted" });
      setFullName("");
      setPlusOne("");
      setNote("");
    } catch (err: any) {
      toast({ title: "Couldn't submit", description: err?.message, variant: "destructive" });
    }
  };

  return (
    <div className="mobile-safe-content max-w-2xl mx-auto p-4 space-y-5">
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-primary">
          <Users className="h-5 w-5" />
          <span className="text-xs uppercase tracking-wide">{list.status}</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground">{list.show_title}</h1>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarClock className="h-4 w-4" />
          <span>{date.toLocaleString()}</span>
        </div>
        {list.venue && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{list.venue}</span>
          </div>
        )}
        {list.notes && (
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{list.notes}</p>
        )}
        <p className="text-sm text-foreground">
          <span className="font-semibold">{remaining}</span> spots remaining of {list.capacity}
        </p>
      </header>

      {!isArtist && user && (
        <section>
          {myRequest ? (
            <div className="rounded-xl border border-border/50 bg-card/40 p-4 space-y-1">
              <h3 className="text-sm font-semibold text-foreground">Your request</h3>
              <p className="text-sm text-foreground">{myRequest.full_name}</p>
              {myRequest.plus_one_name && (
                <p className="text-xs text-muted-foreground">+1: {myRequest.plus_one_name}</p>
              )}
              <span
                className={`inline-block text-[10px] uppercase rounded px-1.5 py-0.5 ${
                  myRequest.status === "approved" || myRequest.status === "checked_in"
                    ? "bg-primary/15 text-primary"
                    : myRequest.status === "declined"
                    ? "bg-destructive/15 text-destructive"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {myRequest.status}
              </span>
            </div>
          ) : (
            isOpen && !isFull && (
              <form
                onSubmit={submitRequest}
                className="space-y-2 rounded-xl border border-border/50 bg-card/40 p-4"
              >
                <h3 className="text-sm font-semibold text-foreground">Request a spot</h3>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Full name"
                  required
                  className="w-full rounded-lg bg-background border border-border/60 px-3 py-2 text-base text-foreground"
                />
                <input
                  type="text"
                  value={plusOne}
                  onChange={(e) => setPlusOne(e.target.value)}
                  placeholder="+1 name (optional)"
                  className="w-full rounded-lg bg-background border border-border/60 px-3 py-2 text-base text-foreground"
                />
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Note for the artist (optional)"
                  rows={2}
                  className="w-full rounded-lg bg-background border border-border/60 px-3 py-2 text-base text-foreground"
                />
                <button
                  type="submit"
                  disabled={submit.isPending}
                  className="w-full min-h-11 rounded-lg bg-primary text-primary-foreground font-semibold disabled:opacity-50"
                >
                  {submit.isPending ? "Submitting…" : "Request guest list spot"}
                </button>
              </form>
            )
          )}
          {isFull && !myRequest && (
            <p className="rounded-xl border border-border/50 p-3 text-sm text-muted-foreground text-center">
              Guest list is full.
            </p>
          )}
        </section>
      )}

      {isArtist && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">Requests ({requests?.length ?? 0})</h2>
          <ul className="space-y-2">
            {requests?.map((r) => (
              <li
                key={r.id}
                className="rounded-xl border border-border/50 bg-card/40 p-3 space-y-2"
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">{r.full_name}</p>
                  {r.plus_one_name && (
                    <p className="text-xs text-muted-foreground">+1: {r.plus_one_name}</p>
                  )}
                  {r.note && (
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap mt-1">{r.note}</p>
                  )}
                  <span
                    className={`inline-block mt-1 text-[10px] uppercase rounded px-1.5 py-0.5 ${
                      r.status === "approved" || r.status === "checked_in"
                        ? "bg-primary/15 text-primary"
                        : r.status === "declined"
                        ? "bg-destructive/15 text-destructive"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {r.status}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {r.status !== "approved" && (
                    <button
                      type="button"
                      onClick={() =>
                        updateStatus.mutate({
                          request_id: r.id,
                          guest_list_id: list.id,
                          status: "approved",
                        })
                      }
                      className="min-h-11 px-3 rounded-lg bg-primary/15 text-primary text-sm font-semibold flex items-center gap-1"
                    >
                      <Check className="h-4 w-4" /> Approve
                    </button>
                  )}
                  {r.status !== "declined" && (
                    <button
                      type="button"
                      onClick={() =>
                        updateStatus.mutate({
                          request_id: r.id,
                          guest_list_id: list.id,
                          status: "declined",
                        })
                      }
                      className="min-h-11 px-3 rounded-lg bg-destructive/15 text-destructive text-sm font-semibold flex items-center gap-1"
                    >
                      <X className="h-4 w-4" /> Decline
                    </button>
                  )}
                  {r.status === "approved" && (
                    <button
                      type="button"
                      onClick={() =>
                        updateStatus.mutate({
                          request_id: r.id,
                          guest_list_id: list.id,
                          status: "checked_in",
                        })
                      }
                      className="min-h-11 px-3 rounded-lg bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-1"
                    >
                      <UserCheck className="h-4 w-4" /> Check in
                    </button>
                  )}
                </div>
              </li>
            ))}
            {!requests?.length && (
              <p className="text-sm text-muted-foreground">No requests yet.</p>
            )}
          </ul>
        </section>
      )}
    </div>
  );
}
