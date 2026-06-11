import { useState } from "react";
import { Mic, Plus, Upload, Copy, Check, ExternalLink, Play, Pause, Loader2, Headphones } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import BackNav from "@/components/BackNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import SEOHead from "@/components/SEOHead";

const CATEGORIES = ["Arts", "Business", "Comedy", "Education", "Fiction", "Health & Fitness", "History", "Music", "News", "Science", "Society & Culture", "Sports", "Technology", "True Crime"];

export default function Podcast() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const profileId = profile?.id;

  const [setupStep, setSetupStep] = useState(0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [language, setLanguage] = useState("en");
  const [isExplicit, setIsExplicit] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [artworkUrl, setArtworkUrl] = useState("");
  const [episodeDialogOpen, setEpisodeDialogOpen] = useState(false);
  const [epTitle, setEpTitle] = useState("");
  const [epDesc, setEpDesc] = useState("");
  const [epAudioUrl, setEpAudioUrl] = useState("");
  const [epNumber, setEpNumber] = useState(1);
  const [epMembersOnly, setEpMembersOnly] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: podcast, isLoading } = useQuery({
    queryKey: ["my-podcast", profileId],
    queryFn: async () => {
      const { data } = await supabase.from("creator_podcasts").select("*").eq("creator_id", profileId!).single();
      return data;
    },
    enabled: !!profileId,
  });

  const { data: episodes = [] } = useQuery({
    queryKey: ["podcast-episodes", podcast?.id],
    queryFn: async () => {
      const { data } = await supabase.from("podcast_episodes").select("*").eq("podcast_id", podcast!.id).order("episode_number", { ascending: false });
      return data || [];
    },
    enabled: !!podcast?.id,
  });

  const createPodcast = async () => {
    if (!profileId) return;
    const { error } = await supabase.from("creator_podcasts").insert({
      creator_id: profileId, title, description, category, language, is_explicit: isExplicit, is_private: isPrivate, artwork_url: artworkUrl, author: profile?.display_name,
    });
    if (error) { toast.error("Error", { description: error.message }); return; }
    toast.success("Podcast created!");
    qc.invalidateQueries({ queryKey: ["my-podcast"] });
  };

  const uploadArtwork = async (file: File) => {
    if (!user) return;
    setUploading(true);
    const path = `${user.id}/podcast-artwork-${Date.now()}.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("covers").upload(path, file);
    if (!error) {
      const { data } = supabase.storage.from("covers").getPublicUrl(path);
      setArtworkUrl(data.publicUrl);
    }
    setUploading(false);
  };

  const uploadAudio = async (file: File) => {
    if (!user) return;
    setUploading(true);
    const path = `${user.id}/podcast-ep-${Date.now()}.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("covers").upload(path, file);
    if (!error) {
      const { data } = supabase.storage.from("covers").getPublicUrl(path);
      setEpAudioUrl(data.publicUrl);
    }
    setUploading(false);
  };

  const publishEpisode = async (publish: boolean) => {
    if (!podcast) return;
    const { error } = await supabase.from("podcast_episodes").insert({
      podcast_id: podcast.id, title: epTitle, description: epDesc, audio_url: epAudioUrl,
      episode_number: epNumber, is_members_only: epMembersOnly,
      is_published: publish, published_at: publish ? new Date().toISOString() : null,
    });
    if (error) { toast.error("Error", { description: error.message }); return; }
    toast.success(publish ? "Episode published!" : "Draft saved");
    setEpisodeDialogOpen(false);
    qc.invalidateQueries({ queryKey: ["podcast-episodes"] });
  };

  const rssUrl = `https://dbjlhmbgskvhuzqvqfrl.supabase.co/functions/v1/generate-rss-feed?username=${profile?.username}`;
  const copyRss = () => { navigator.clipboard.writeText(rssUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  if (isLoading) return <AppLayout><div className="p-4"><BackNav label="Podcast" /><div className="skeleton h-48 mt-4 rounded-xl" /></div></AppLayout>;

  // Setup flow
  if (!podcast) {
    const steps = [
      <div key="0" className="space-y-3">
        <h3 className="font-semibold">Name your podcast</h3>
        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Podcast title" />
        <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What's your podcast about?" rows={4} />
      </div>,
      <div key="1" className="space-y-3">
        <h3 className="font-semibold">Upload artwork</h3>
        {artworkUrl && <img src={artworkUrl} className="w-32 h-32 rounded-xl object-cover mx-auto" alt="Artwork" loading="lazy" />}
        <Input type="file" accept="image/*" onChange={e => e.target.files?.[0] && uploadArtwork(e.target.files[0])} />
      </div>,
      <div key="2" className="space-y-3">
        <h3 className="font-semibold">Category & Language</h3>
        <Select value={category} onValueChange={setCategory}><SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger><SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
        <Select value={language} onValueChange={setLanguage}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="en">English</SelectItem><SelectItem value="es">Spanish</SelectItem><SelectItem value="fr">French</SelectItem></SelectContent></Select>
      </div>,
      <div key="3" className="space-y-3">
        <h3 className="font-semibold">Privacy</h3>
        <div className="flex items-center justify-between"><span className="text-sm">Explicit content</span><Switch checked={isExplicit} onCheckedChange={setIsExplicit} /></div>
        <div className="flex items-center justify-between"><span className="text-sm">Private podcast</span><Switch checked={isPrivate} onCheckedChange={setIsPrivate} /></div>
      </div>,
    ];

    return (
      <AppLayout>
        <SEOHead title="Podcast" description="Host your podcast on UPLY" />
        <div className="max-w-md mx-auto px-4 py-8 pb-24">
          <BackNav label="Create Podcast" />
          <Card className="mt-4 border-border"><CardContent className="p-6">
            <div className="flex gap-1 mb-6">{[0,1,2,3].map(i => <div key={i} className={`h-1 flex-1 rounded-full ${i <= setupStep ? "bg-primary" : "bg-border"}`} />)}</div>
            {steps[setupStep]}
            <div className="flex gap-2 mt-6">
              {setupStep > 0 && <Button variant="outline" onClick={() => setSetupStep(s => s - 1)}>Back</Button>}
              {setupStep < 3 ? (
                <Button className="flex-1" onClick={() => setSetupStep(s => s + 1)} disabled={setupStep === 0 && !title.trim()}>Next</Button>
              ) : (
                <Button className="flex-1" onClick={createPodcast}>Create Podcast</Button>
              )}
            </div>
          </CardContent></Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <SEOHead title="Podcast" description="Manage your podcast episodes" />
      <div className="max-w-4xl mx-auto px-4 py-4 pb-24">
        <BackNav label="Podcast" />

        {/* Header */}
        <div className="flex items-center gap-4 mt-4">
          {podcast.artwork_url && <img src={podcast.artwork_url} className="w-16 h-16 rounded-xl object-cover" alt={podcast.title || ""} loading="lazy" />}
          <div className="flex-1">
            <h2 className="font-bold text-lg">{podcast.title}</h2>
            <p className="text-xs text-muted-foreground">{podcast.subscriber_count} subscribers · {podcast.total_plays} plays</p>
          </div>
        </div>

        {/* Distribution */}
        <Card className="mt-4 border-border"><CardContent className="p-4">
          <h3 className="font-semibold text-sm mb-2">RSS Feed</h3>
          <div className="flex gap-2">
            <Input value={rssUrl} readOnly className="text-xs" />
            <Button variant="outline" size="sm" onClick={copyRss}>{copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}</Button>
          </div>
          <div className="flex gap-2 mt-3">
            <a href="https://podcasters.spotify.com/pod/submit" target="_blank" rel="noopener"><Badge variant="outline" className="cursor-pointer">Submit to Spotify ↗</Badge></a>
            <a href="https://podcastsconnect.apple.com" target="_blank" rel="noopener"><Badge variant="outline" className="cursor-pointer">Apple Podcasts ↗</Badge></a>
          </div>
        </CardContent></Card>

        {/* Episodes */}
        <div className="flex items-center justify-between mt-6 mb-3">
          <h3 className="font-semibold">Episodes</h3>
          <Button size="sm" onClick={() => { setEpTitle(""); setEpDesc(""); setEpAudioUrl(""); setEpNumber(episodes.length + 1); setEpMembersOnly(false); setEpisodeDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-1" /> New Episode
          </Button>
        </div>
        <div className="space-y-2">
          {episodes.length === 0 ? (
            <div className="text-center py-8"><Headphones className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" /><p className="text-sm text-muted-foreground">No episodes yet</p></div>
          ) : episodes.map((ep: any) => (
            <Card key={ep.id} className="border-border"><CardContent className="p-3 flex items-center gap-3">
              <span className="text-sm font-bold text-muted-foreground w-6 text-center">#{ep.episode_number}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{ep.title}</p>
                <p className="text-xs text-muted-foreground">{ep.play_count} plays{ep.is_members_only && " · Members only"}</p>
              </div>
              <Badge variant={ep.is_published ? "default" : "outline"}>{ep.is_published ? "Published" : "Draft"}</Badge>
            </CardContent></Card>
          ))}
        </div>
      </div>

      {/* New Episode Dialog */}
      <Dialog open={episodeDialogOpen} onOpenChange={setEpisodeDialogOpen}>
        <DialogContent className="max-w-lg"><DialogHeader><DialogTitle>New Episode</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input value={epTitle} onChange={e => setEpTitle(e.target.value)} placeholder="Episode title" />
            <Textarea value={epDesc} onChange={e => setEpDesc(e.target.value)} placeholder="Description" rows={3} />
            <div><label className="text-xs text-muted-foreground">Audio file</label><Input type="file" accept="audio/*" onChange={e => e.target.files?.[0] && uploadAudio(e.target.files[0])} /></div>
            {uploading && <p className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />Uploading...</p>}
            {epAudioUrl && <p className="text-xs text-primary">✓ Audio uploaded</p>}
            <div className="flex items-center gap-4">
              <div className="flex-1"><label className="text-xs text-muted-foreground">Episode #</label><Input type="number" value={epNumber} onChange={e => setEpNumber(Number(e.target.value))} /></div>
              <div className="flex items-center gap-2"><span className="text-sm">Members only</span><Switch checked={epMembersOnly} onCheckedChange={setEpMembersOnly} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => publishEpisode(false)} disabled={!epTitle.trim() || !epAudioUrl}>Save Draft</Button>
            <Button onClick={() => publishEpisode(true)} disabled={!epTitle.trim() || !epAudioUrl}>Publish</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
