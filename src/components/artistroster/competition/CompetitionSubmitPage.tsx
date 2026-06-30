import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ARTIST_ROSTER } from "@/data/artistRoster";
import ArtistSectionNav from "../ArtistSectionNav";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Upload, Loader2, CheckCircle2, ExternalLink } from "lucide-react";
import { useCompetitionBySlug, useMyEntry, useSubmitEntry, uploadCompetitionMedia } from "./useCompetition";
import { z } from "zod";

const schema = z.object({
  title: z.string().trim().min(2, "Title is required").max(120),
  description: z.string().trim().max(1000).optional(),
  external_url: z.string().trim().url("Must be a valid URL").max(500).optional().or(z.literal("")),
  contact_email: z.string().trim().email("Invalid email").max(255),
  country: z.string().trim().max(80).optional().or(z.literal("")),
});

export default function CompetitionSubmitPage() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const artist = ARTIST_ROSTER.find((a) => a.slug === slug || (a.aliases ?? []).includes(slug));
  const { data: challenge, isLoading: loadingChallenge } = useCompetitionBySlug(artist?.competitionSlug);
  const { data: existing } = useMyEntry(challenge?.id);
  const submitEntry = useSubmitEntry();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [email, setEmail] = useState(user?.email ?? "");
  const [country, setCountry] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (artist && challenge) document.title = `Submit · ${challenge.title} · UPLY`;
  }, [artist, challenge]);

  useEffect(() => { if (user?.email && !email) setEmail(user.email); }, [user]); // eslint-disable-line

  if (!artist) return <main className="min-h-screen flex items-center justify-center bg-background text-foreground p-6"><p className="opacity-60">Artist not found.</p></main>;
  if (loadingChallenge) return <main className="min-h-screen flex items-center justify-center bg-[#0A0A0A] text-white"><Loader2 className="w-6 h-6 animate-spin" /></main>;
  if (!challenge) return <main className="min-h-screen bg-[#0A0A0A] text-white"><ArtistSectionNav artist={artist} /><div className="max-w-2xl mx-auto px-6 py-24 text-center opacity-60">No active competition.</div></main>;

  if (!user) {
    return (
      <main className="min-h-screen bg-[#0A0A0A] text-white">
        <ArtistSectionNav artist={artist} />
        <div className="max-w-md mx-auto px-6 py-20 text-center">
          <h1 className="text-2xl font-bold mb-3" style={{ fontFamily: "Fraunces, Georgia, serif" }}>Sign in to submit</h1>
          <p className="opacity-70 mb-6 text-[14px]">You need an UPLY account to enter the competition.</p>
          <Link
            to={`/${artist.slug}/signin`}
            className="inline-block px-6 py-3 rounded-full font-semibold"
            style={{ background: artist.accent, color: "#0a0a0a" }}
          >
            Sign in to UPLY
          </Link>
        </div>
      </main>
    );
  }

  if (existing) {
    return (
      <main className="min-h-screen bg-[#0A0A0A] text-white">
        <ArtistSectionNav artist={artist} />
        <div className="max-w-xl mx-auto px-6 py-16">
          <div className="rounded-2xl p-8 bg-white/5 border border-white/10 text-center">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-3" style={{ color: artist.accent }} />
            <h1 className="text-2xl font-bold" style={{ fontFamily: "Fraunces, Georgia, serif" }}>You're in</h1>
            <p className="opacity-80 mt-2 text-[14px]">Your entry "{existing.title}" is <strong>{existing.moderation_status === "approved" ? "live on the leaderboard" : existing.moderation_status === "pending" ? "under review by our team" : "not approved"}</strong>.</p>
            <Link to={`/${artist.slug}/competition`} className="inline-block mt-6 px-5 py-2.5 rounded-full font-semibold" style={{ background: artist.accent, color: "#0a0a0a" }}>
              Back to competition
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({
      title, description, external_url: externalUrl, contact_email: email, country,
    });
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      toast({ title: "Check your entry", description: first.message, variant: "destructive" });
      return;
    }
    if (!file && !externalUrl) {
      toast({ title: "Add your performance", description: "Upload a file or paste a public link.", variant: "destructive" });
      return;
    }
    try {
      setUploading(true);
      let mediaUrl: string | null = null;
      if (file) {
        if (file.size > 200 * 1024 * 1024) throw new Error("File must be under 200 MB.");
        mediaUrl = await uploadCompetitionMedia(user.id, challenge.id, file);
      }
      await submitEntry.mutateAsync({
        challenge_id: challenge.id,
        title: parsed.data.title,
        description: parsed.data.description || undefined,
        media_url: mediaUrl,
        external_url: parsed.data.external_url || null,
        contact_email: parsed.data.contact_email,
        country: parsed.data.country || null,
      });
      toast({ title: "Submitted!", description: "We'll review it shortly. Once approved, it appears on the leaderboard." });
      navigate(`/${artist.slug}/competition`);
    } catch (err: any) {
      toast({ title: "Submission failed", description: err?.message ?? String(err), variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white">
      <ArtistSectionNav artist={artist} />
      <div className="max-w-xl mx-auto px-6 py-10">
        <Link to={`/${artist.slug}/competition`} className="text-[12px] uppercase tracking-[0.2em] opacity-60 hover:opacity-100">← Back</Link>
        <h1 className="mt-3 font-bold" style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: "clamp(32px, 5vw, 44px)" }}>
          Submit your talent
        </h1>
        <p className="mt-2 opacity-75 text-[14px]">{challenge.prompt}</p>

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <Field label="Entry title">
            <input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={120}
              className="w-full px-4 h-12 rounded-lg bg-black/40 border border-white/15 text-white text-[16px]" />
          </Field>

          <Field label="A short description (optional)">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} rows={3}
              className="w-full px-4 py-3 rounded-lg bg-black/40 border border-white/15 text-white text-[16px]" />
          </Field>

          <Field label="Upload your audio or video">
            <label className="flex items-center gap-3 px-4 py-3 rounded-lg bg-black/40 border border-dashed border-white/20 cursor-pointer hover:border-white/40">
              <Upload className="w-4 h-4 opacity-70" />
              <span className="text-[14px] opacity-85 truncate">{file ? file.name : "Choose a file (mp3, m4a, wav, mp4, mov — up to 200 MB)"}</span>
              <input type="file" accept="audio/*,video/*" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
          </Field>

          <div className="text-center text-[11px] uppercase tracking-[0.2em] opacity-50">— or —</div>

          <Field label={<span className="inline-flex items-center gap-1.5"><ExternalLink className="w-3.5 h-3.5" /> Public link (YouTube, Instagram, TikTok)</span>}>
            <input value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} placeholder="https://…"
              className="w-full px-4 h-12 rounded-lg bg-black/40 border border-white/15 text-white text-[16px]" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Contact email">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={255}
                className="w-full px-4 h-12 rounded-lg bg-black/40 border border-white/15 text-white text-[16px]" />
            </Field>
            <Field label="Country (optional)">
              <input value={country} onChange={(e) => setCountry(e.target.value)} maxLength={80}
                className="w-full px-4 h-12 rounded-lg bg-black/40 border border-white/15 text-white text-[16px]" />
            </Field>
          </div>

          <button
            type="submit"
            disabled={uploading || submitEntry.isPending}
            className="w-full px-6 py-3.5 rounded-full font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-40"
            style={{ background: artist.accent, color: "#0a0a0a" }}
          >
            {(uploading || submitEntry.isPending) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? "Uploading…" : submitEntry.isPending ? "Submitting…" : "Submit my entry"}
          </button>
          <p className="text-[11px] opacity-60 text-center">By submitting, you confirm you own the rights to this performance and agree to UPLY's terms.</p>
        </form>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[12px] uppercase tracking-[0.2em] opacity-70 mb-1.5">{label}</span>
      {children}
    </label>
  );
}
