import { useEffect } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { AnoushaShell, CTA, Display, LeadForm, Reveal, gold, ink, sans, serif } from "./shell";
import { BRAND, IMAGES, POSTS } from "./content";

function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default function AnoushaBlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const post = POSTS.find((p) => p.slug === slug);

  useEffect(() => window.scrollTo({ top: 0 }), [slug]);

  if (!post) return <Navigate to="/anousha/blog" replace />;

  const related = POSTS.filter((p) => p.slug !== post.slug).slice(0, 2);
  const mid = Math.ceil(post.body.length / 2);

  return (
    <AnoushaShell overHero sticky={<CTA to="/anousha#work" className="w-full">Work with Anousha</CTA>}>
      <SEOHead
        title={post.title}
        description={post.dek}
        image={post.image}
        type="article"
        canonicalUrl={`https://uply.tv/anousha/blog/${post.slug}`}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: post.title,
          description: post.dek,
          datePublished: post.date,
          author: { "@type": "Person", name: BRAND.name },
        }}
      />

      {/* hero */}
      <section className="relative -mt-[72px]">
        <div className="relative h-[62vh] min-h-[420px] overflow-hidden">
          <img src={post.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(20,17,14,.55) 0%, rgba(20,17,14,.35) 45%, rgba(20,17,14,.85) 100%)" }} />
          <div className="relative h-full max-w-[820px] mx-auto px-5 sm:px-8 flex flex-col justify-end pb-14">
            <p className="text-[11px] tracking-[0.24em] uppercase mb-4" style={{ ...sans, color: "#E6D2AE" }}>
              {post.tag} · {post.readTime}
            </p>
            <h1 className="text-[30px] sm:text-[46px] leading-[1.08]" style={{ ...serif, color: "#FBF7F1" }}>{post.title}</h1>
            <p className="mt-4 text-[15px] max-w-2xl" style={{ ...sans, color: "rgba(251,247,241,.78)" }}>{post.dek}</p>
          </div>
        </div>
      </section>

      {/* author */}
      <div className="max-w-[820px] mx-auto px-5 sm:px-8 py-8 flex items-center gap-4 border-b border-[#14110E]/10">
        <span className="h-12 w-12 shrink-0 inline-flex items-center justify-center border" style={{ borderColor: gold, color: gold, ...serif }}>AN</span>
        <div>
          <p className="text-[16px]" style={{ ...serif, color: ink }}>{BRAND.name}</p>
          <p className="text-[11px] tracking-[0.14em] uppercase mt-0.5" style={{ ...sans, color: "#8A8078" }}>
            {BRAND.role} · {fmt(post.date)}
          </p>
        </div>
      </div>

      {/* body */}
      <article className="max-w-[720px] mx-auto px-5 sm:px-8 py-12">
        {post.body.slice(0, mid).map((p, i) => (
          <p
            key={i}
            className="text-[18px] leading-[1.85] mb-7"
            style={{ ...sans, color: "#3A332C" }}
          >
            {p}
          </p>
        ))}

        {/* inline CTA */}
        <Reveal>
          <div className="my-12 p-8 border-l-2" style={{ borderColor: gold, background: "#F3EDE4" }}>
            <Display className="text-[24px]">Thinking of buying in the DMV? Let's talk.</Display>
            <p className="mt-2 text-[15px]" style={{ ...sans, color: "#4A423A" }}>
              No pressure, no drip campaign — just a straight read on your numbers.
            </p>
            <CTA to="/anousha#work" className="mt-6">Start the conversation</CTA>
          </div>
        </Reveal>

        {post.body.slice(mid).map((p, i) => (
          <p key={`b${i}`} className="text-[18px] leading-[1.85] mb-7" style={{ ...sans, color: "#3A332C" }}>{p}</p>
        ))}

        <p className="mt-10 pt-6 border-t border-[#14110E]/10 text-[12px] leading-relaxed" style={{ ...sans, color: "#8A8078" }}>
          {BRAND.disclosure}
        </p>
      </article>

      {/* end-of-post lead capture */}
      <section className="max-w-[860px] mx-auto px-5 sm:px-8 pb-16">
        <Reveal>
          <LeadForm
            source={`anousha-blog-${post.slug}`}
            heading="Let's talk about your next move"
            sub="Buying, selling, or underwriting your first investment — tell me where you are."
          />
        </Reveal>
      </section>

      {/* related */}
      <section className="border-t border-[#14110E]/10" style={{ background: "#F3EDE4" }}>
        <div className="max-w-[1240px] mx-auto px-5 sm:px-8 py-20">
          <p className="text-[11px] tracking-[0.24em] uppercase mb-8" style={{ ...sans, color: gold }}>Keep reading</p>
          <div className="grid gap-10 md:grid-cols-2">
            {related.map((r) => (
              <Link key={r.slug} to={`/anousha/blog/${r.slug}`} className="group block">
                <div className="aspect-[16/9] overflow-hidden">
                  <img src={r.image} alt={r.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-[1200ms] group-hover:scale-105" />
                </div>
                <Display className="text-[22px] mt-5 group-hover:opacity-70 transition-opacity">{r.title}</Display>
              </Link>
            ))}
          </div>
          <Link to="/anousha/blog" className="mt-10 inline-flex items-center gap-2 text-[12px] tracking-[0.16em] uppercase hover:opacity-60 transition" style={{ ...sans, color: ink }}>
            <ArrowLeft className="h-4 w-4" /> All articles
          </Link>
        </div>
      </section>
    </AnoushaShell>
  );
}
