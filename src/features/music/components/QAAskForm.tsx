import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { useSubmitQAQuestion } from "../hooks/useArtistQA";

interface Props {
  artistId: string;
}

export function QAAskForm({ artistId }: Props) {
  const submit = useSubmitQAQuestion();
  const [body, setBody] = useState("");
  const [anon, setAnon] = useState(false);

  return (
    <form
      className="rounded-xl border border-border bg-card/40 p-4 space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const text = body.trim();
        if (text.length < 4) {
          toast({ title: "Question is too short", variant: "destructive" });
          return;
        }
        submit.mutate(
          { artist_id: artistId, body: text, is_anonymous: anon },
          {
            onSuccess: () => {
              toast({ title: "Question submitted" });
              setBody("");
            },
            onError: (err: any) =>
              toast({ title: "Could not submit", description: err.message, variant: "destructive" }),
          },
        );
      }}
    >
      <div className="space-y-1">
        <Label htmlFor="qa-body">Ask the artist</Label>
        <Textarea
          id="qa-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={500}
          placeholder="What do you want to know?"
          rows={3}
        />
        <p className="text-xs text-muted-foreground">{body.length}/500</p>
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="qa-anon" className="text-sm">Ask anonymously</Label>
        <Switch id="qa-anon" checked={anon} onCheckedChange={setAnon} />
      </div>
      <Button type="submit" className="w-full" disabled={submit.isPending}>
        {submit.isPending ? "Submitting..." : "Submit question"}
      </Button>
    </form>
  );
}
