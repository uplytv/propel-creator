import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Instagram, ArrowRight, Check, Sparkles, GraduationCap, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import SEOHead from "@/components/SEOHead";

interface CreatorProfileLite {
  id: string;
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio?: string | null;
  business_status: string | null;
}

interface TenantDetails {
  id: string;
  business_name: string;
  category: string | null;
  tagline: string | null;
  city: string | null;
  hero_image_url: string | null;
  links: Array<{ label: string; url: string }> | null;
}

interface Tier {
  id: string;
  name: string;
  description: string | null;
  price_monthly: number | null;
  tier_rank: number | null;
}

interface ModuleRow {
  id: string;
  title: string;
  description: string | null;
  position: number | null;
}

interface LessonRow {
  id: string;
  module_id: string;
  title: string;
  position: number | null;
}

const ACCENT = "#6B5BFF";

/** Per-creator SEO overrides. */
const SEO: Record<string, { title: string; description: string }> = {
  anousha: {
    title: "Anousha Nikjouian — DMV Real Estate, Defined",
    description:
      "DMV-native REALTOR® licensed in DC, MD & VA. Guidance for first-time buyers and investors, plus The Defined Circle community and The Blueprint classroom on UPLY.",
  },
};

/** Per-creator legal/compliance disclosure shown in the page footer. */
const DISCLOSURES: Record<string, string> = {
  anousha:
    "Anousha Nikjouian, REALTOR® — licensed in DC, MD & VA. [Brokerage name pending]. Equal Housing Opportunity. Educational content only — not legal, tax, or financial advice.",
};

/** Splits "Title\n\nBody" blog content into a heading + body. */
function splitPost(content: string) {
  const [first, ...rest] = content.split("\n\n");
  const body = rest.join("\n\n").trim();
  return body ? { title: first.trim(), body } : { title: null as string | null, body: content };
}

/**
 * Premium public page for creator tenants (account_type='creator' with a
 * business_status of draft/claimed/live). Mirrors the business tenant
 * draft → preview → claim pattern, with community tiers, a classroom
 * outline and a blog instead of hours/services.
 */
export default function CreatorTenantPage({ profile }: { profile: CreatorProfileLite }) {
  const isLive = profile.business_status === "live";
  const [me, setMe] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, []);
  const isOwner = me === profile.user_id;

  const { data: details, isLoading } = useQuery({
    queryKey: ["creator-tenant-details", profile.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("business_details" as never)
        .select("id, business_name, category, tagline, city, hero_image_url, links")
        .eq("profile_id", profile.id)
        .maybeSingle();
      return (data as unknown as TenantDetails | null) ?? null;
    },
  });

  const { data: space } = useQuery({
    queryKey: ["creator-tenant-space", profile.user_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("creator_spaces")
        .select("id, name, description")
        .eq("creator_id", profile.user_id)
        .maybeSingle();
      return data as { id: string; name: string; description: string | null } | null;
    },
  });

  const { data: tiers = [] } = useQuery({
    queryKey: ["creator-tenant-tiers", profile.user_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("subscription_tiers")
        .select("id, name, description, price_monthly, tier_rank")
        .eq("creator_id", profile.user_id)
        .eq("is_active", true)
        .order("tier_rank");
      return (data ?? []) as Tier[];
    },
  });

  const { data: modules = [] } = useQuery({
    queryKey: ["creator-tenant-modules", profile.user_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("classroom_modules")
        .select("id, title, description, position")
        .eq("creator_id", profile.user_id)
        .order("position");
      return (data ?? []) as ModuleRow[];
    },
  });

  const { data: lessons = [] } = useQuery({
    queryKey: ["creator-tenant-lessons", profile.user_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("classroom_lessons")
        .select("id, module_id, title, position")
        .eq("creator_id", profile.user_id)
        .order("position");
      return (data ?? []) as LessonRow[];
    },
  });

  const { data: posts = [] } = useQuery({
    queryKey: ["creator-tenant-posts", profile.user_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("posts")
        .select("id, content, created_at")
        .eq("user_id", profile.user_id)
        .order("created_at", { ascending: false })
        .limit(6);
      return (data ?? []) as Array<{ id: string; content: string; created_at: string }>;
    },
  });

  // Non-live pages must never be indexed.
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

  const name = details?.business_name || profile.display_name || profile.username;
  const instagram = details?.links?.find((l) => /instagram/i.test(l.label))?.url;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead
        title={SEO[profile.username]?.title ?? `${name} on UPLY`}
        description={SEO[profile.username]?.description ?? details?.tagline ?? `${name} on UPLY.`}
        noindex={!isLive}
      />

      {!isLive && (
        <div className="w-full bg-[#6B5BFF]/10 border-b border-[#6B5BFF]/30 px-4 py-2 text-center text-sm">
          <span className="text-foreground/80">
            {profile.business_status === "draft" ? "Preview" : "Claim ready"} —{" "}
            {isOwner ? (
              <Link to="/dashboard" className="text-[#6B5BFF] font-semibold underline">
                Publish this page
              </Link>
            ) : (
              <Link to={`/claim/${profile.username}`} className="text-[#6B5BFF] font-semibold underline">
                claim this page
              </Link>
            )}
            <span className="mx-2 text-muted-foreground">·</span>
            <a
              href="mailto:remove@uply.tv?subject=Takedown%20request"
              className="text-muted-foreground hover:text-foreground underline"
            >
              Not you?
            </a>
          </span>
        </div>
      )}

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        {details?.hero_image_url ? (
          <div className="absolute inset-0">
            <img src={details.hero_image_url} alt="" className="w-full h-full object-cover opacity-30" />
            <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(107,91,255,0.25),_transparent_60%)]" />
        )}
        <div className="relative max-w-5xl mx-auto px-5 sm:px-6 pt-16 pb-14 sm:pt-24 sm:pb-20">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={name}
              className="h-20 w-20 rounded-full object-cover border border-white/15 mb-6"
            />
          ) : (
            <div className="h-20 w-20 rounded-full mb-6 grid place-items-center border border-white/10 bg-white/[0.04] text-2xl font-serif">
              {name.slice(0, 1)}
            </div>
          )}
          {details?.category && (
            <p className="text-[11px] uppercase tracking-[0.28em] text-[#6B5BFF] font-bold mb-4">
              {details.category}
            </p>
          )}
          <h1 className="font-serif text-5xl sm:text-7xl leading-[1.02] tracking-tight font-semibold">{name}</h1>
          {details?.tagline && (
            <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-xl leading-relaxed">
              {details.tagline}
            </p>
          )}
          {details?.city && (
            <p className="mt-3 text-sm text-muted-foreground/80 tracking-wide">{details.city}</p>
          )}
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#community"
              className="inline-flex items-center gap-2 min-h-[48px] px-6 rounded-xl bg-[#6B5BFF] hover:bg-[#5A4BEF] text-white font-semibold"
            >
              Join the community <ArrowRight className="w-4 h-4" />
            </a>
            <Link
              to={`/${profile.username}/links`}
              className="inline-flex items-center gap-2 min-h-[48px] px-6 rounded-xl border border-border bg-white/[0.03] hover:bg-white/[0.06] font-semibold"
            >
              All links
            </Link>
            {instagram && (
              <a
                href={instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 min-h-[48px] px-5 rounded-xl border border-border bg-white/[0.03] hover:bg-white/[0.06] font-semibold"
              >
                <Instagram className="w-4 h-4" /> Instagram
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Bio */}
      {profile.bio && (
        <section className="max-w-3xl mx-auto px-5 sm:px-6 py-14">
          <p className="text-lg sm:text-xl leading-relaxed text-foreground/90 font-light">{profile.bio}</p>
        </section>
      )}

      {/* Community + tiers */}
      {space && (
        <section id="community" className="border-t border-border scroll-mt-4">
          <div className="max-w-5xl mx-auto px-5 sm:px-6 py-14">
            <p className="text-[11px] uppercase tracking-[0.28em] text-[#6B5BFF] font-bold mb-3 inline-flex items-center gap-2">
              <Users className="w-3.5 h-3.5" /> Community
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl font-semibold">{space.name}</h2>
            {space.description && (
              <p className="mt-4 text-muted-foreground max-w-2xl leading-relaxed">{space.description}</p>
            )}

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {tiers.map((t) => {
                const featured = t.tier_rank === 2;
                return (
                  <div
                    key={t.id}
                    className={`relative rounded-2xl p-6 border flex flex-col ${
                      featured
                        ? "border-[#6B5BFF]/60 bg-[#6B5BFF]/[0.07] shadow-[0_20px_60px_-30px_rgba(107,91,255,0.8)]"
                        : "border-border bg-white/[0.03]"
                    }`}
                  >
                    {featured && (
                      <span className="absolute -top-3 left-6 rounded-full bg-[#6B5BFF] text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1">
                        Most popular
                      </span>
                    )}
                    <h3 className="font-serif text-2xl font-semibold">{t.name}</h3>
                    <p className="mt-2 text-3xl font-bold">
                      ${t.price_monthly}
                      <span className="text-sm font-normal text-muted-foreground">/mo</span>
                    </p>
                    {t.description && (
                      <p className="mt-4 text-sm text-muted-foreground leading-relaxed flex-1">{t.description}</p>
                    )}
                    <Link
                      to={`/community/${profile.user_id}`}
                      className={`mt-6 inline-flex items-center justify-center min-h-[48px] rounded-xl font-semibold ${
                        featured
                          ? "bg-[#6B5BFF] hover:bg-[#5A4BEF] text-white"
                          : "border border-border hover:bg-white/[0.06]"
                      }`}
                    >
                      Join {t.name}
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Classroom */}
      {modules.length > 0 && (
        <section id="classroom" className="border-t border-border scroll-mt-4">
          <div className="max-w-5xl mx-auto px-5 sm:px-6 py-14">
            <p className="text-[11px] uppercase tracking-[0.28em] text-[#6B5BFF] font-bold mb-3 inline-flex items-center gap-2">
              <GraduationCap className="w-3.5 h-3.5" /> Classroom
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl font-semibold">The Blueprint</h2>
            <p className="mt-4 text-muted-foreground max-w-2xl leading-relaxed">
              Six modules, {lessons.length} lessons — the full playbook, from first pre-approval to a written
              ten-year plan.
            </p>

            <div className="mt-10 grid gap-4 md:grid-cols-2">
              {modules.map((m) => (
                <div key={m.id} className="rounded-2xl p-6 border border-border bg-white/[0.03]">
                  <h3 className="font-semibold text-lg leading-snug">{m.title}</h3>
                  {m.description && (
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{m.description}</p>
                  )}
                  <ul className="mt-4 space-y-2">
                    {lessons
                      .filter((l) => l.module_id === m.id)
                      .map((l) => (
                        <li key={l.id} className="flex items-start gap-2 text-sm text-foreground/80">
                          <Check className="w-3.5 h-3.5 mt-1 shrink-0" style={{ color: ACCENT }} />
                          <span>{l.title}</span>
                        </li>
                      ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Blog */}
      {posts.length > 0 && (
        <section className="border-t border-border">
          <div className="max-w-3xl mx-auto px-5 sm:px-6 py-14">
            <p className="text-[11px] uppercase tracking-[0.28em] text-[#6B5BFF] font-bold mb-3 inline-flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5" /> Writing
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl font-semibold mb-8">Notes on the market</h2>
            <div className="space-y-6">
              {posts.map((p) => {
                const { title, body } = splitPost(p.content);
                return (
                  <article key={p.id} className="rounded-2xl p-6 border border-border bg-white/[0.03]">
                    {title && <h3 className="font-serif text-xl font-semibold leading-snug">{title}</h3>}
                    <p className="mt-3 text-foreground/85 leading-relaxed whitespace-pre-wrap">{body}</p>
                    <p className="mt-4 text-xs text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString()}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <footer className="border-t border-border py-10 pb-28 md:pb-10 px-5 text-center text-xs text-muted-foreground space-y-3">
        {DISCLOSURES[profile.username] && (
          <p className="max-w-2xl mx-auto leading-relaxed">{DISCLOSURES[profile.username]}</p>
        )}
        <div>
          <Link to={`/${profile.username}/links`} className="text-[#6B5BFF] hover:underline">
            View links page →
          </Link>
        </div>
        <div>
          <Link to="/" className="hover:text-foreground transition-colors">
            Powered by UPLY
          </Link>
        </div>
      </footer>

      {!isLive && (
        <div className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur px-4 py-3">
          <Link
            to={`/claim/${profile.username}`}
            className="flex items-center justify-center w-full min-h-[52px] rounded-xl bg-[#6B5BFF] hover:bg-[#5b4bf0] text-white font-bold text-base"
          >
            Claim this page
          </Link>
        </div>
      )}
    </div>
  );
}
