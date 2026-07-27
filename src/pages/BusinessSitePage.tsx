import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Phone, MapPin, Clock, Star, Mail, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { z } from "zod";

interface BusinessProfileLite {
  id: string;
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  business_status: string | null;
}

interface BusinessDetails {
  id: string;
  profile_id: string;
  business_name: string;
  category: string | null;
  tagline: string | null;
  address: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  hours: Record<string, string> | null;
  services: Array<{ title: string; description?: string; price?: string }> | null;
  testimonials: Array<{ author: string; text: string; rating?: number }> | null;
  google_rating: number | null;
  google_reviews_count: number | null;
  google_maps_url: string | null;
  hero_image_url: string | null;
  logo_url: string | null;
  links: Array<{ label: string; url: string }> | null;
}

const leadSchema = z.object({
  name: z.string().trim().min(1, "Name required").max(100),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  email: z.string().trim().email("Invalid email").max(255).optional().or(z.literal("")),
  message: z.string().trim().max(1000).optional().or(z.literal("")),
});

/**
 * Public business profile page served through the /:username catch-all.
 * Renders when a profile has account_type='business'. Falls back to the
 * standard creator flow otherwise (handled in UsernameRedirect).
 */
export default function BusinessSitePage({ profile }: { profile: BusinessProfileLite }) {
  const isLive = profile.business_status === "live";
  const [me, setMe] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, []);
  const isOwner = me === profile.user_id;

  const { data: biz, isLoading } = useQuery({
    queryKey: ["business-details", profile.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_details" as never)
        .select("*")
        .eq("profile_id", profile.id)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as BusinessDetails | null;
    },
  });

  const { data: posts } = useQuery({
    queryKey: ["business-posts", profile.user_id],
    queryFn: async () => {
      const { data } = await (supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (col: string, val: string) => {
              order: (o: string, opts: { ascending: boolean }) => {
                limit: (n: number) => Promise<{ data: Array<{ id: string; content: string; created_at: string }> | null }>;
              };
            };
          };
        };
      })
        .from("posts")
        .select("id, content, created_at")
        .eq("user_id", profile.user_id)
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  // Log page view once
  useEffect(() => {
    if (!biz?.id || !isLive) return;
    (supabase as unknown as { from: (t: string) => { insert: (r: unknown) => Promise<unknown> } })
      .from("business_page_events")
      .insert({ business_id: biz.id, event_type: "view" });
  }, [biz?.id, isLive]);

  // Non-live pages must never be indexed by search engines.
  useEffect(() => {
    if (isLive) return;
    const tag = document.createElement("meta");
    tag.name = "robots";
    tag.content = "noindex";
    document.head.appendChild(tag);
    return () => {
      document.head.removeChild(tag);
    };
  }, [isLive]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background grid place-items-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!biz) {
    return (
      <div className="min-h-screen bg-background grid place-items-center p-6 text-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Business profile not set up yet</h1>
          <p className="text-muted-foreground mt-2">The owner hasn't added their business details.</p>
        </div>
      </div>
    );
  }

  const showDraftBanner = !isLive;
  const canSubmitLead = isLive;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {showDraftBanner && <DraftBanner status={profile.business_status ?? "draft"} isOwner={isOwner} username={profile.username} />}


      <Hero biz={biz} />
      <QuickActions biz={biz} />

      {biz.links && biz.links.length > 0 && <LinksSection links={biz.links} businessId={biz.id} />}

      {biz.services && biz.services.length > 0 && <Services services={biz.services} />}
      {biz.testimonials && biz.testimonials.length > 0 && <Testimonials items={biz.testimonials} />}
      <HoursAndMap biz={biz} />

      {posts && posts.length > 0 && <BlogSection posts={posts} username={profile.username} businessId={biz.id} />}

      <LeadForm businessId={biz.id} businessName={biz.business_name} disabled={!canSubmitLead} />

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground space-y-2">
        <Link to={`/${profile.username}/links`} className="text-[#6B5BFF] hover:underline">
          View links page →
        </Link>
        <div>
          <Link to="/" className="hover:text-foreground transition-colors">Powered by UPLY</Link>
        </div>
      </footer>
    </div>
  );
}

function DraftBanner({ status, isOwner, username }: { status: string; isOwner: boolean; username: string }) {
  return (
    <div className="w-full bg-[#6B5BFF]/10 border-b border-[#6B5BFF]/30 px-4 py-2 text-center text-sm">
      <span className="text-foreground/80">
        {status === "draft" ? "Preview" : "Claim ready"} —{" "}
        {isOwner ? (
          <Link to="/dashboard" className="text-[#6B5BFF] font-semibold underline">
            Publish this page
          </Link>
        ) : (
          <Link to={`/claim/${username}`} className="text-[#6B5BFF] font-semibold underline">
            claim this page
          </Link>
        )}
        <span className="mx-2 text-muted-foreground">·</span>
        <a href="mailto:remove@uply.tv?subject=Takedown%20request" className="text-muted-foreground hover:text-foreground underline">
          Not your business?
        </a>
      </span>
    </div>
  );
}

function Hero({ biz }: { biz: BusinessDetails }) {
  return (
    <section className="relative overflow-hidden border-b border-border">
      {biz.hero_image_url && (
        <div className="absolute inset-0 opacity-25">
          <img src={biz.hero_image_url} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      <div className="relative max-w-5xl mx-auto px-4 py-14 sm:py-20">
        {biz.category && (
          <p className="text-xs uppercase tracking-widest text-[#6B5BFF] font-bold mb-3">{biz.category}</p>
        )}
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">{biz.business_name}</h1>
        {biz.tagline && <p className="mt-3 text-lg text-muted-foreground max-w-2xl">{biz.tagline}</p>}
        {biz.google_rating && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 border border-border">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="font-semibold">{biz.google_rating.toFixed(1)}</span>
            {biz.google_reviews_count != null && (
              <span className="text-muted-foreground text-sm">({biz.google_reviews_count} reviews)</span>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function QuickActions({ biz }: { biz: BusinessDetails }) {
  const logEvent = async (event_type: "call_tap" | "maps_tap") => {
    await (supabase as unknown as { from: (t: string) => { insert: (r: unknown) => Promise<unknown> } })
      .from("business_page_events")
      .insert({ business_id: biz.id, event_type });
  };
  return (
    <section className="max-w-5xl mx-auto px-4 py-6 flex flex-wrap gap-3">
      {biz.phone && (
        <a
          href={`tel:${biz.phone}`}
          onClick={() => logEvent("call_tap")}
          className="inline-flex items-center gap-2 bg-[#6B5BFF] hover:bg-[#5A4BEF] text-white px-5 py-3 rounded-lg font-semibold min-h-[44px]"
        >
          <Phone className="w-4 h-4" /> Call {biz.phone}
        </a>
      )}
      {biz.google_maps_url && (
        <a
          href={biz.google_maps_url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => logEvent("maps_tap")}
          className="inline-flex items-center gap-2 border border-border hover:bg-white/5 px-5 py-3 rounded-lg font-semibold min-h-[44px]"
        >
          <MapPin className="w-4 h-4" /> Directions
        </a>
      )}
    </section>
  );
}

function Services({ services }: { services: BusinessDetails["services"] }) {
  return (
    <section className="max-w-5xl mx-auto px-4 py-10">
      <h2 className="text-2xl font-bold mb-6">Services</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {services!.map((s, i) => (
          <div key={i} className="rounded-xl p-5 bg-white/[0.03] border border-border">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-bold text-lg">{s.title}</h3>
              {s.price && <span className="text-[#6B5BFF] font-semibold shrink-0">{s.price}</span>}
            </div>
            {s.description && <p className="text-muted-foreground text-sm mt-2">{s.description}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

function Testimonials({ items }: { items: NonNullable<BusinessDetails["testimonials"]> }) {
  return (
    <section className="max-w-5xl mx-auto px-4 py-10 border-t border-border">
      <h2 className="text-2xl font-bold mb-6">What customers say</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((t, i) => (
          <div key={i} className="rounded-xl p-5 bg-white/[0.03] border border-border">
            {t.rating != null && (
              <div className="flex gap-0.5 mb-2">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star key={j} className={`w-4 h-4 ${j < (t.rating ?? 0) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`} />
                ))}
              </div>
            )}
            <p className="text-foreground/90">"{t.text}"</p>
            <p className="text-sm text-muted-foreground mt-2">— {t.author}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function HoursAndMap({ biz }: { biz: BusinessDetails }) {
  const hourEntries = biz.hours ? Object.entries(biz.hours) : [];
  return (
    <section className="max-w-5xl mx-auto px-4 py-10 border-t border-border grid gap-8 sm:grid-cols-2">
      {hourEntries.length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Clock className="w-5 h-5" /> Hours</h2>
          <ul className="space-y-1 text-sm">
            {hourEntries.map(([day, hrs]) => (
              <li key={day} className="flex justify-between">
                <span className="capitalize text-foreground/80">{day}</span>
                <span className="text-muted-foreground">{hrs}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {(biz.address || biz.city) && (
        <div>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><MapPin className="w-5 h-5" /> Location</h2>
          <p className="text-foreground/90">{biz.address}</p>
          {biz.city && <p className="text-muted-foreground">{biz.city}</p>}
          {biz.google_maps_url && (
            <a href={biz.google_maps_url} target="_blank" rel="noopener noreferrer" className="text-[#6B5BFF] hover:underline text-sm mt-2 inline-flex items-center gap-1">
              Open in Maps <ArrowRight className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      )}
    </section>
  );
}

function BlogSection({ posts, username, businessId }: { posts: Array<{ id: string; content: string; created_at: string }>; username: string; businessId: string }) {
  const logView = async (post_id: string) => {
    await (supabase as unknown as { from: (t: string) => { insert: (r: unknown) => Promise<unknown> } })
      .from("business_page_events")
      .insert({ business_id: businessId, event_type: "blog_view", metadata: { post_id } });
  };
  return (
    <section className="max-w-5xl mx-auto px-4 py-10 border-t border-border">
      <h2 className="text-2xl font-bold mb-6">Latest updates</h2>
      <div className="space-y-4">
        {posts.map((p) => (
          <Link
            key={p.id}
            to={`/@${username}?post=${p.id}`}
            onClick={() => logView(p.id)}
            className="block rounded-xl p-5 bg-white/[0.03] border border-border hover:border-[#6B5BFF]/40 transition-colors"
          >
            <p className="text-foreground/90 line-clamp-3">{p.content}</p>
            <p className="text-xs text-muted-foreground mt-2">{new Date(p.created_at).toLocaleDateString()}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function LeadForm({ businessId, businessName, disabled }: { businessId: string; businessName: string; disabled: boolean }) {
  const [form, setForm] = useState({ name: "", phone: "", email: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled) return;
    const parsed = leadSchema.safeParse(form);
    if (!parsed.success) {
      toast({ title: "Check the form", description: parsed.error.issues[0]?.message, variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await (supabase as unknown as {
        from: (t: string) => {
          insert: (r: unknown) => {
            select: (s: string) => { single: () => Promise<{ data: { id: string } | null; error: { message: string } | null }> };
          };
        };
      })
        .from("business_leads")
        .insert({
          business_id: businessId,
          name: form.name,
          phone: form.phone || null,
          email: form.email || null,
          message: form.message || null,
          source: "profile",
        })
        .select("id")
        .single();

      if (error) throw error;
      await (supabase as unknown as { from: (t: string) => { insert: (r: unknown) => Promise<unknown> } })
        .from("business_page_events")
        .insert({ business_id: businessId, event_type: "lead_submit" });

      if (data?.id) {
        await supabase.functions.invoke("notify-business-lead", { body: { lead_id: data.id } });
      }
      setDone(true);
      toast({ title: "Sent!", description: `${businessName} will get back to you shortly.` });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast({ title: "Couldn't send", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <section className="max-w-2xl mx-auto px-4 py-12">
        <div className="rounded-2xl p-8 bg-[#6B5BFF]/10 border border-[#6B5BFF]/30 text-center">
          <h2 className="text-2xl font-bold mb-2">Thanks!</h2>
          <p className="text-muted-foreground">{businessName} received your message.</p>
        </div>
      </section>
    );
  }

  return (
    <section id="quote" className="max-w-2xl mx-auto px-4 py-12 border-t border-border">
      <h2 className="text-2xl font-bold mb-2">Request a quote</h2>
      <p className="text-muted-foreground mb-6">Send a quick note and {businessName} will follow up.</p>
      <form onSubmit={submit} className="space-y-4">
        <Input placeholder="Your name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={100} className="min-h-[44px] text-base" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} maxLength={30} className="min-h-[44px] text-base" />
          <Input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength={255} className="min-h-[44px] text-base" />
        </div>
        <Textarea placeholder="What do you need?" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} maxLength={1000} rows={4} className="text-base" />
        <Button type="submit" disabled={submitting || disabled} className="bg-[#6B5BFF] hover:bg-[#5A4BEF] text-white w-full min-h-[48px] font-semibold">
          {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending…</> : <><Mail className="w-4 h-4 mr-2" />Request a quote</>}
        </Button>
        {disabled && <p className="text-xs text-muted-foreground text-center">This page is in preview. Leads open once it's published.</p>}
      </form>
    </section>
  );
}

function LinksSection({ links, businessId }: { links: Array<{ label: string; url: string }>; businessId: string }) {
  const logTap = async (label: string) => {
    await (supabase as unknown as { from: (t: string) => { insert: (r: unknown) => Promise<unknown> } })
      .from("business_page_events")
      .insert({ business_id: businessId, event_type: "link_tap", metadata: { label } });
  };
  return (
    <section className="max-w-2xl mx-auto px-4 py-8">
      <h2 className="text-xl font-bold mb-4">Links</h2>
      <div className="grid gap-3">
        {links.map((l, i) => (
          <a
            key={i}
            href={l.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => logTap(l.label)}
            className="block w-full text-center rounded-xl px-5 py-4 bg-white/[0.04] border border-border hover:border-[#6B5BFF]/60 hover:bg-white/[0.06] transition-colors font-semibold min-h-[52px]"
          >
            {l.label}
          </a>
        ))}
      </div>
    </section>
  );
}
