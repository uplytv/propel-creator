import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import PageHero from "@/components/layout/PageHero";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles, Loader2, Copy, Film, Mail, MessageSquare, Hash, Lightbulb, Check } from "lucide-react";

interface Pack {
  shorts?: { title: string; hook: string; clip_idea: string; caption: string }[];
  social_posts?: { platform: string; caption: string; hashtags: string[] }[];
  email?: { subject: string; preview: string; body: string };
  thread?: string[];
  title_ideas?: string[];
}

function CopyBtn({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); }}
      className="shrink-0 inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
      aria-label="Copy to clipboard"
    >
      {done ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />} {done ? "Copied" : "Copy"}
    </button>
  );
}

function Section({ icon: Icon, title, children }: any) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </div>
      {children}
    </div>
  );
}

export default function Repurpose() {
  const [title, setTitle] = useState("");
  const [source, setSource] = useState("");
  const [busy, setBusy] = useState(false);
  const [pack, setPack] = useState<Pack | null>(null);

  const run = async () => {
    if (!title.trim() && source.trim().length < 20) {
      toast.error("Add a title and paste your transcript or notes first");
      return;
    }
    setBusy(true);
    setPack(null);
    try {
      const { data, error } = await supabase.functions.invoke("aria-content-repurpose", {
        body: { title: title.trim(), source: source.trim(), content_type: "video" },
      });
      if (error) throw error;
      setPack((data as any)?.package ?? null);
      if (!(data as any)?.package) toast.error("ARIA couldn't parse a package — try again");
    } catch (e: any) {
      toast.error("Repurpose failed", { description: e?.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppLayout>
      <SEOHead title="Repurpose · ARIA" description="Turn one video into a week of content." />
      <PageHero
        eyebrow="Content"
        title="Repurpose with"
        gradientWord="ARIA"
        subtitle="One video → a week of Shorts, posts, an email & a thread."
      />
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="mt-5 space-y-3">
          <Input placeholder="Content title (e.g. 'How I grew to 100k')" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea
            rows={6}
            placeholder="Paste your transcript, show notes, or a description of the content…"
            value={source}
            onChange={(e) => setSource(e.target.value)}
          />
          <Button onClick={run} disabled={busy} className="w-full gap-2">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {busy ? "ARIA is working…" : "Repurpose"}
          </Button>
        </div>

        {pack && (
          <div className="mt-6 space-y-4">
            {!!pack.shorts?.length && (
              <Section icon={Film} title={`${pack.shorts.length} Shorts`}>
                <div className="space-y-3">
                  {pack.shorts.map((s, i) => (
                    <div key={i} className="rounded-lg bg-muted/30 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-foreground">{s.title}</p>
                        <CopyBtn text={`${s.title}\n\nHook: ${s.hook}\nClip: ${s.clip_idea}\n\n${s.caption}`} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1"><span className="font-medium text-foreground">Hook:</span> {s.hook}</p>
                      <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">Clip:</span> {s.clip_idea}</p>
                      {s.caption && <p className="text-xs text-muted-foreground mt-1">{s.caption}</p>}
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {!!pack.social_posts?.length && (
              <Section icon={MessageSquare} title="Social posts">
                <div className="space-y-3">
                  {pack.social_posts.map((p, i) => (
                    <div key={i} className="rounded-lg bg-muted/30 p-3">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-primary">{p.platform}</span>
                        <CopyBtn text={`${p.caption}\n\n${(p.hashtags || []).map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")}`} />
                      </div>
                      <p className="text-sm text-foreground whitespace-pre-wrap">{p.caption}</p>
                      {!!p.hashtags?.length && (
                        <p className="text-xs text-primary mt-1.5">{p.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")}</p>
                      )}
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {pack.email && (
              <Section icon={Mail} title="Email">
                <div className="rounded-lg bg-muted/30 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">{pack.email.subject}</p>
                    <CopyBtn text={`Subject: ${pack.email.subject}\n\n${pack.email.body}`} />
                  </div>
                  {pack.email.preview && <p className="text-xs text-muted-foreground italic mt-0.5">{pack.email.preview}</p>}
                  <p className="text-sm text-foreground whitespace-pre-wrap mt-2">{pack.email.body}</p>
                </div>
              </Section>
            )}

            {!!pack.thread?.length && (
              <Section icon={Hash} title="X / threads">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-xs text-muted-foreground">{pack.thread.length} posts</span>
                  <CopyBtn text={pack.thread.join("\n\n")} />
                </div>
                <ol className="space-y-2">
                  {pack.thread.map((t, i) => (
                    <li key={i} className="rounded-lg bg-muted/30 p-3 text-sm text-foreground whitespace-pre-wrap">{i + 1}. {t}</li>
                  ))}
                </ol>
              </Section>
            )}

            {!!pack.title_ideas?.length && (
              <Section icon={Lightbulb} title="Title ideas">
                <ul className="space-y-1.5">
                  {pack.title_ideas.map((t, i) => (
                    <li key={i} className="flex items-center justify-between gap-2 text-sm text-foreground">
                      <span>{t}</span>
                      <CopyBtn text={t} />
                    </li>
                  ))}
                </ul>
              </Section>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
