import { useState } from "react";
import { useCreateDedication } from "../hooks/useSongDedications";
import { toast } from "@/hooks/use-toast";

interface Props {
  trackId: string;
  artistId: string;
  onDone?: () => void;
}

const PRESETS = [500, 1000, 2500];

export default function SongDedicationForm({ trackId, artistId, onDone }: Props) {
  const [dedicatedTo, setDedicatedTo] = useState("");
  const [message, setMessage] = useState("");
  const [amount, setAmount] = useState(500);
  const [isPublic, setIsPublic] = useState(true);
  const create = useCreateDedication();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dedicatedTo.trim()) return;
    try {
      await create.mutateAsync({
        track_id: trackId,
        artist_id: artistId,
        dedicated_to: dedicatedTo.trim(),
        message: message.trim() || undefined,
        amount_cents: amount,
        is_public: isPublic,
      });
      toast({ title: "Dedication sent", description: "Thanks for supporting the artist." });
      setDedicatedTo("");
      setMessage("");
      onDone?.();
    } catch (err: any) {
      toast({ title: "Couldn't send dedication", description: err?.message, variant: "destructive" });
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border border-border/50 bg-card/40 p-4">
      <h3 className="text-sm font-semibold text-foreground">Dedicate this song</h3>
      <input
        type="text"
        value={dedicatedTo}
        onChange={(e) => setDedicatedTo(e.target.value)}
        placeholder="Dedicated to (name)"
        className="w-full rounded-lg bg-background border border-border/60 px-3 py-2 text-base text-foreground"
        required
      />
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Add a message (optional)"
        rows={3}
        className="w-full rounded-lg bg-background border border-border/60 px-3 py-2 text-base text-foreground"
      />
      <div className="flex gap-2">
        {PRESETS.map((p) => (
          <button
            type="button"
            key={p}
            onClick={() => setAmount(p)}
            className={`flex-1 min-h-11 rounded-lg border text-sm font-semibold ${
              amount === p
                ? "border-primary bg-primary/10 text-primary"
                : "border-border/60 text-foreground"
            }`}
          >
            ${(p / 100).toFixed(0)}
          </button>
        ))}
      </div>
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          checked={isPublic}
          onChange={(e) => setIsPublic(e.target.checked)}
        />
        Show on public dedications wall
      </label>
      <button
        type="submit"
        disabled={create.isPending}
        className="w-full min-h-11 rounded-lg bg-primary text-primary-foreground font-semibold disabled:opacity-50"
      >
        {create.isPending ? "Sending…" : `Send dedication · $${(amount / 100).toFixed(2)}`}
      </button>
    </form>
  );
}
