import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trophy } from 'lucide-react';
import { toast } from 'sonner';

export default function CreateChallengePage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('remix');
  const [prompt, setPrompt] = useState('');
  const [stemsUrl, setStemsUrl] = useState('');
  const [artworkUrl, setArtworkUrl] = useState('');
  const [prize, setPrize] = useState('');
  const [prizeUsd, setPrizeUsd] = useState('');
  const [submissionDeadline, setSubmissionDeadline] = useState('');
  const [votingDeadline, setVotingDeadline] = useState('');
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!user) return toast.error('Sign in required');
    if (!title.trim()) return toast.error('Title required');
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('music_challenges')
        .insert({
          host_id: user.id,
          title: title.trim(),
          description: description.trim() || null,
          challenge_type: type,
          prompt: prompt.trim() || null,
          stems_url: stemsUrl.trim() || null,
          artwork_url: artworkUrl.trim() || null,
          prize_description: prize.trim() || null,
          prize_cents: prizeUsd ? Math.round(parseFloat(prizeUsd) * 100) : 0,
          submission_deadline: submissionDeadline || null,
          voting_deadline: votingDeadline || null,
        })
        .select()
        .single();
      if (error) throw error;
      toast.success('Challenge created');
      nav(`/music/challenges/${data.id}`);
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to create');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container max-w-2xl mx-auto p-4 space-y-6 mobile-safe-content">
      <header className="flex items-center gap-2">
        <Trophy className="text-primary" />
        <h1 className="text-2xl font-bold">Host a Challenge</h1>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Challenge details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="t">Title</Label>
            <Input id="t" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="d">Description</Label>
            <Textarea id="d" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="remix">Remix</SelectItem>
                <SelectItem value="cover">Cover</SelectItem>
                <SelectItem value="original">Original</SelectItem>
                <SelectItem value="beat">Beat</SelectItem>
                <SelectItem value="lyric">Lyric</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="p">Prompt</Label>
            <Textarea id="p" rows={2} placeholder="What should creators make?" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="st">Stems / source URL</Label>
            <Input id="st" placeholder="Link to stems pack or original track" value={stemsUrl} onChange={(e) => setStemsUrl(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="aw">Artwork URL</Label>
            <Input id="aw" value={artworkUrl} onChange={(e) => setArtworkUrl(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="pr">Prize (USD)</Label>
              <Input id="pr" type="number" inputMode="decimal" placeholder="0" value={prizeUsd} onChange={(e) => setPrizeUsd(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prd">Prize description</Label>
              <Input id="prd" placeholder="e.g. cash + feature" value={prize} onChange={(e) => setPrize(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="sd">Submission deadline</Label>
              <Input id="sd" type="datetime-local" value={submissionDeadline} onChange={(e) => setSubmissionDeadline(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vd">Voting deadline</Label>
              <Input id="vd" type="datetime-local" value={votingDeadline} onChange={(e) => setVotingDeadline(e.target.value)} />
            </div>
          </div>
          <Button onClick={handleCreate} disabled={saving} className="w-full">
            {saving ? 'Creating…' : 'Create challenge'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
