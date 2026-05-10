import { useState } from "react";
import { useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trophy, Music, Vote } from "lucide-react";
import {
  useRemixContest,
  useRemixSubmissions,
  useMyRemixVote,
  useCreateRemixSubmission,
  useVoteForRemix,
} from "../hooks/useRemixContests";

export default function RemixContestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: contest, isLoading } = useRemixContest(id);
  const { data: submissions = [] } = useRemixSubmissions(id);
  const { data: myVote } = useMyRemixVote(id);
  const submit = useCreateRemixSubmission();
  const vote = useVoteForRemix();
  const [title, setTitle] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [notes, setNotes] = useState("");

  if (isLoading) return <div className="p-6 text-muted-foreground">Loading…</div>;
  if (!contest) return <div className="p-6 text-muted-foreground">Contest not found</div>;

  const handleSubmit = async () => {
    if (!title.trim() || !audioUrl.trim()) {
      toast.error("Title and audio URL required");
      return;
    }
    try {
      await submit.mutateAsync({ contest_id: contest.id, title, audio_url: audioUrl, notes });
      toast.success("Remix submitted!");
      setTitle(""); setAudioUrl(""); setNotes("");
    } catch (e: any) {
      toast.error(e.message || "Failed to submit");
    }
  };

  const handleVote = async (submissionId: string) => {
    try {
      await vote.mutateAsync({ contest_id: contest.id, submission_id: submissionId });
      toast.success("Vote cast!");
    } catch (e: any) {
      toast.error(e.message || "Failed to vote");
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-4xl mobile-safe-content">
      <Card className="overflow-hidden">
        {contest.cover_url && <img src={contest.cover_url} alt={contest.title} className="w-full aspect-video object-cover" />}
        <div className="p-6 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-2xl md:text-3xl font-bold">{contest.title}</h1>
            <Badge variant="secondary" className="capitalize">{contest.status}</Badge>
          </div>
          {contest.description && <p className="text-muted-foreground">{contest.description}</p>}
          {contest.prize_description && (
            <div className="flex items-center gap-2 text-primary">
              <Trophy className="h-5 w-5" />
              <span className="font-medium">{contest.prize_description}</span>
            </div>
          )}
          {contest.stems_url && (
            <a href={contest.stems_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm underline">
              <Music className="h-4 w-4" /> Download stems
            </a>
          )}
        </div>
      </Card>

      <Card className="p-6 space-y-3">
        <h2 className="font-semibold">Submit your remix</h2>
        <Input placeholder="Remix title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Input placeholder="Audio URL (SoundCloud, Dropbox, etc.)" value={audioUrl} onChange={(e) => setAudioUrl(e.target.value)} />
        <Textarea placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <Button onClick={handleSubmit} disabled={submit.isPending} className="w-full">
          {submit.isPending ? "Submitting…" : "Submit remix"}
        </Button>
      </Card>

      <div className="space-y-3">
        <h2 className="font-semibold text-lg">Submissions ({submissions.length})</h2>
        {submissions.length === 0 && <p className="text-sm text-muted-foreground">No submissions yet — be the first!</p>}
        {submissions.map((s) => {
          const isVoted = myVote?.submission_id === s.id;
          return (
            <Card key={s.id} className="p-4 flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium truncate">{s.title}</h3>
                  {s.status === "winner" && <Badge className="bg-primary text-primary-foreground">Winner</Badge>}
                </div>
                {s.notes && <p className="text-xs text-muted-foreground truncate">{s.notes}</p>}
                <audio src={s.audio_url} controls className="w-full mt-2 h-8" />
              </div>
              <div className="flex flex-col items-center gap-1">
                <Button
                  size="sm"
                  variant={isVoted ? "default" : "outline"}
                  onClick={() => handleVote(s.id)}
                  disabled={vote.isPending}
                >
                  <Vote className="h-4 w-4 mr-1" />
                  {s.vote_count}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
