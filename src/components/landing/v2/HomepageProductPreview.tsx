import { useState } from "react";
import SectionShell from "./SectionShell";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { FileText, Sparkles, Tag, Users, Check, Info } from "lucide-react";

/**
 * Homepage product preview — a STATIC, read-only walkthrough of a workflow UPLY
 * actually supports today. Everything rendered here is illustrative sample data
 * held in this file: the demo performs no network calls, no writes, and no sends.
 *
 * Accuracy notes (verified in code, Sep 2026):
 *  - ARIA's repurposing endpoint (supabase/functions/aria-content-repurpose)
 *    accepts a title + transcript/notes TEXT input and returns shorts ideas,
 *    4 social posts, 1 email, an X thread and title ideas. It does NOT ingest or
 *    transcribe a video file, so the demo shows the real text input.
 *  - Offers (products, courses, tickets) and lead capture + admin follow-up are
 *    existing product surfaces; the cards below mirror them with sample rows.
 */

type StepKey = "input" | "drafts" | "offer" | "leads";

const STEPS: { key: StepKey; label: string; icon: typeof FileText }[] = [
  { key: "input", label: "1. Your content", icon: FileText },
  { key: "drafts", label: "2. AI drafts", icon: Sparkles },
  { key: "offer", label: "3. Your offer", icon: Tag },
  { key: "leads", label: "4. Follow-up", icon: Users },
];

function SampleTag({ children = "Sample data — illustrative" }: { children?: string }) {
  return (
    <Badge variant="outline" className="rounded-sm border-gold-hairline text-[10px] font-bold uppercase tracking-[0.14em] text-gold">
      {children}
    </Badge>
  );
}

function HumanStep({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm text-foreground/70">
      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
      <span>{children}</span>
    </li>
  );
}

export default function HomepageProductPreview() {
  const [step, setStep] = useState<StepKey>("input");

  return (
    <SectionShell id="product-preview" className="bg-background">
      <div className="text-center max-w-3xl mx-auto mb-8">
        <p className="eyebrow-gold mb-4">See the product</p>
        <h2 className="type-display-lg text-foreground mb-4">
          One workflow, <span className="italic text-gold font-normal">start to finish.</span>
        </h2>
        <p className="text-foreground/70 text-base sm:text-lg">
          A read-only walkthrough of what UPLY supports today — from the notes you paste in, to
          drafts you review, to the offer you publish and the leads you follow up.
        </p>
      </div>

      {/* Step switcher */}
      <div
        role="tablist"
        aria-label="Product workflow steps"
        className="mx-auto mb-6 flex max-w-4xl flex-wrap justify-center gap-2"
      >
        {STEPS.map((s) => {
          const Icon = s.icon;
          const active = step === s.key;
          return (
            <button
              key={s.key}
              role="tab"
              id={`preview-tab-${s.key}`}
              aria-selected={active}
              aria-controls={`preview-panel-${s.key}`}
              onClick={() => setStep(s.key)}
              className={`inline-flex min-h-[44px] items-center gap-2 rounded-sm border px-3.5 text-xs sm:text-sm font-bold transition-colors ${
                active
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-card/40 text-foreground/60 hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {s.label}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`preview-panel-${step}`}
        aria-labelledby={`preview-tab-${step}`}
        className="card-editorial mx-auto max-w-4xl rounded-md p-5 sm:p-7"
      >
        {step === "input" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-bold text-foreground">What you give ARIA</h3>
              <SampleTag />
            </div>
            <div className="rounded-sm border border-border bg-background/60 p-4 space-y-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Title</p>
                <p className="text-sm text-foreground">How I filled a 200-seat room with no ad spend</p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  Transcript or notes (text)
                </p>
                <p className="text-sm leading-relaxed text-foreground/75">
                  “We announced the date six weeks out to the email list first, opened a $25 early tier
                  for 48 hours, then sold general admission. The community thread did more than the ads…”
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-sm border border-border bg-card/40 p-3 text-xs text-foreground/70">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden />
              <p>
                <strong className="text-foreground">Current limitation:</strong> ARIA works from text you
                provide — a pasted transcript, notes, or an outline. It does not watch or transcribe an
                uploaded video file today. Video hosting and live streaming are separate features.
              </p>
            </div>
          </div>
        )}

        {step === "drafts" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-bold text-foreground">What comes back — as drafts</h3>
              <SampleTag>Sample output — illustrative</SampleTag>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-sm border border-border bg-background/60 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground mb-2">
                  Short-form clip ideas
                </p>
                <p className="text-sm text-foreground">“The 48-hour early tier trick”</p>
                <p className="mt-1 text-xs text-foreground/60">Hook: “Six weeks out, I sent one email.”</p>
              </div>
              <div className="rounded-sm border border-border bg-background/60 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground mb-2">
                  Social posts (4 platforms)
                </p>
                <p className="text-sm text-foreground/80">
                  Instagram, TikTok, X and LinkedIn captions written from the same notes.
                </p>
              </div>
              <div className="rounded-sm border border-border bg-background/60 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground mb-2">
                  Email draft
                </p>
                <p className="text-sm text-foreground">Subject: “Doors open Friday — early tier closes tonight”</p>
              </div>
              <div className="rounded-sm border border-border bg-background/60 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground mb-2">
                  Thread + title ideas
                </p>
                <p className="text-sm text-foreground/80">A 3–5 post thread and five alternative titles.</p>
              </div>
            </div>
            <div className="rounded-sm border border-border bg-card/40 p-4">
              <p className="text-sm font-bold text-foreground mb-2">What you still do yourself</p>
              <ul className="space-y-1.5">
                <HumanStep>Read and edit every draft — nothing publishes or sends on its own.</HumanStep>
                <HumanStep>Choose and cut the actual clip from your footage.</HumanStep>
                <HumanStep>Approve the email and pick the audience before it goes out.</HumanStep>
                <HumanStep>Set the price and terms on any offer the copy points to.</HumanStep>
              </ul>
              <p className="mt-3 text-xs text-foreground/60">
                This replaces the blank page and the first draft. We don't publish time-saving numbers
                because we haven't measured them.
              </p>
            </div>
          </div>
        )}

        {step === "offer" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-bold text-foreground">Publish the offer it points to</h3>
              <SampleTag />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { name: "Early-bird ticket", price: "$25", meta: "Event ticket · QR check-in" },
                { name: "Room-filling playbook", price: "$97", meta: "Course · classroom module" },
                { name: "Inner circle", price: "$19 / mo", meta: "Community subscription" },
              ].map((o) => (
                <div key={o.name} className="rounded-sm border border-border bg-background/60 p-4">
                  <p className="text-sm font-bold text-foreground">{o.name}</p>
                  <p className="mt-1 text-2xl font-bold text-gold">{o.price}</p>
                  <p className="mt-1 text-xs text-foreground/60">{o.meta}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-foreground/60">
              Tickets, courses and community subscriptions are live product surfaces. Payments run through
              your own connected Stripe account.
            </p>
          </div>
        )}

        {step === "leads" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-bold text-foreground">Then follow up with the people who raised a hand</h3>
              <SampleTag />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <caption className="sr-only">Sample lead list — illustrative data only</caption>
                <thead>
                  <tr className="border-b border-border text-left text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                    <th scope="col" className="py-2 pr-3 font-bold">Name</th>
                    <th scope="col" className="py-2 pr-3 font-bold">Source</th>
                    <th scope="col" className="py-2 pr-3 font-bold">Status</th>
                    <th scope="col" className="py-2 font-bold">Next action</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { n: "Sample Lead A", s: "profile", st: "New", a: "Reply with ticket link" },
                    { n: "Sample Lead B", s: "links", st: "Contacted", a: "Send course details" },
                    { n: "Sample Lead C", s: "community", st: "Qualified", a: "Book a call" },
                  ].map((r) => (
                    <tr key={r.n} className="border-b border-border/60">
                      <td className="py-2.5 pr-3 font-semibold text-foreground">{r.n}</td>
                      <td className="py-2.5 pr-3 text-foreground/70">{r.s}</td>
                      <td className="py-2.5 pr-3 text-foreground/70">{r.st}</td>
                      <td className="py-2.5 text-foreground/70">{r.a}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-foreground/60">
              Leads captured on your pages land in one list you can filter, update and export. Outreach is
              sent by you — this preview never writes or sends anything.
            </p>
          </div>
        )}
      </div>

      <p className="mx-auto mt-5 max-w-4xl text-center text-xs text-foreground/50">
        Read-only preview. All names, numbers and copy above are illustrative sample data, not customer data.{" "}
        <Link to="/pricing" className="underline underline-offset-4 hover:text-foreground/80">
          See what's included on each plan
        </Link>
        .
      </p>
    </SectionShell>
  );
}
