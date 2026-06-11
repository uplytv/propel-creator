import { useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Heart, Trophy, Download } from "lucide-react";
import {
  useChallenge,
  useChallengeEntries,
  useMyChallengeVotes,
  useSubmitChallengeEntry,
  useCastChallengeVote,
} from "../hooks/useChallenges";
import { ChallengeLeaderboard } from "../components/ChallengeLeaderboard";
import { toast } from "sonner";

export default function ChallengeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: challenge, isLoading } = useChallenge(id);
  const { data: entries = [] } = useChallengeEntries(id);
  const { data: myVotes = [] } = useMyChallengeVotes(id);
  const submit = useSubmitChallengeEntry();
  const vote = useCastChallengeVote();

  const [form, setForm] = useState({ title: "", description: "", media_url: "", artwork_url: "" });

  if (isLoading) return <div className="p-6">Loading…</div>;
  if (!challenge) return <div className="p-6">Challenge not found.</div>;

  const handleSubmit = async () => {
    if (!form.title || !form.media_url) {
      toast.error("Title and media URL are required");
      return;
    }
    try {
      await submit.mutateAsync({ challenge_id: challenge.id, ...form });
      setForm({ title: "", description: "", media_url: "", artwork_url: "" });
      toast.success("Entry submitted!");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleVote = async (entryId: string) => {
    try {
      await vote.mutateAsync({ entry_id: entryId });
      toast.success("Vote cast!");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="min-h-screen bg-background mobile-safe-content max-w-3xl mx-auto px-4 py-6">
      <div className="aspect-video rounded-lg overflow-hidden bg-muted mb-4">
        {challenge.artwork_url && (
          <img src={challenge.artwork_url} alt={challenge.title} loading="lazy" className="w-full h-full object-cover" />
        )}
      </div>

      <div className="flex items-start justify-between gap-2 mb-2">
        <h1 className="text-2xl font-display font-bold">{challenge.title}</h1>
        <Badge className="capitalize">{challenge.status}</Badge>
      </div>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <Badge variant="outline" className="capitalize">{challenge.challenge_type}</Badge>
        {challenge.prize_cents > 0 && (
          <Badge className="bg-primary text-primary-foreground">
            <Trophy className="w-3 h-3 mr-1" />
            ${(challenge.prize_cents / 100).toFixed(0)} prize
          </Badge>
        )}
      </div>
      {challenge.description && <p className="text-muted-foreground mb-3">{challenge.description}</p>}
      {challenge.prompt && (
        <Card className="p-3 mb-3">
          <p className="text-sm whitespace-pre-line">{challenge.prompt}</p>
        </Card>
      )}
      {challenge.stems_url && (
        <a href={challenge.stems_url} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="sm" className="mb-4">
            <Download className="w-4 h-4 mr-2" /> Download stems
          </Button>
        </a>
      )}

      <Tabs defaultValue="entries">
        <TabsList className="grid grid-cols-3">
          <TabsTrigger value="entries">Entries ({entries.length})</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="submit">Submit</TabsTrigger>
        </TabsList>

        <TabsContent value="entries" className="space-y-2 mt-4">
          {entries.length === 0 && (
            <p className="text-sm text-muted-foreground">Be the first to submit your entry!</p>
          )}
          {entries.map((e) => {
            const voted = myVotes.includes(e.id);
            return (
              <Card key={e.id} className="p-3">
                <div className="flex items-start gap-3">
                  {e.artwork_url ? (
                    <img src={e.artwork_url} alt={e.title} loading="lazy" className="w-14 h-14 rounded object-cover" />
                  ) : (
                    <div className="w-14 h-14 rounded bg-muted" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{e.title}</p>
                    {e.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{e.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {e.vote_count} votes · score {Number(e.score).toFixed(1)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={voted ? "secondary" : "default"}
                    disabled={voted || vote.isPending}
                    onClick={() => handleVote(e.id)}
                  >
                    <Heart className={`w-4 h-4 mr-1 ${voted ? "fill-current" : ""}`} />
                    {voted ? "Voted" : "Vote"}
                  </Button>
                </div>
                {e.media_url && (
                  <audio src={e.media_url} controls className="w-full mt-2" preload="none" />
                )}
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="leaderboard" className="mt-4">
          <ChallengeLeaderboard challengeId={challenge.id} />
        </TabsContent>

        <TabsContent value="submit" className="space-y-3 mt-4">
          <Input
            placeholder="Entry title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <Textarea
            placeholder="Tell us about your remix"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <Input
            placeholder="Audio URL (mp3/wav)"
            value={form.media_url}
            onChange={(e) => setForm({ ...form, media_url: e.target.value })}
          />
          <Input
            placeholder="Artwork URL (optional)"
            value={form.artwork_url}
            onChange={(e) => setForm({ ...form, artwork_url: e.target.value })}
          />
          <Button onClick={handleSubmit} disabled={submit.isPending} className="w-full">
            Submit entry
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
