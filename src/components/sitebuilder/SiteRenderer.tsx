// Pure presentational renderer for a creator Website (sections + theme).
// Used by BOTH the builder live preview and the public site view.
// Square tokens (0px radius), responsive, theme-aware via inline styles so the
// rendered site is independent of the surrounding app's light/dark theme.
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Package, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import type { SiteSection, SiteTheme, SiteButton } from "./types";

interface Palette {
  bg: string;
  surface: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
  onAccent: string;
}

function buildPalette(theme: SiteTheme): Palette {
  const accent = theme.accent || "#7C3AED";
  if (theme.mode === "dark") {
    return {
      bg: "#0A0A0A",
      surface: "#161616",
      border: "#262626",
      text: "#FAFAFA",
      muted: "#A1A1AA",
      accent,
      onAccent: "#FFFFFF",
    };
  }
  return {
    bg: "#FFFFFF",
    surface: "#F7F7F8",
    border: "#E5E7EB",
    text: "#0A0A0A",
    muted: "#6B7280",
    accent,
    onAccent: "#FFFFFF",
  };
}

interface SiteRendererProps {
  sections: SiteSection[];
  theme: SiteTheme;
  /** products.user_id — enables the auto-pulled Products section. */
  productsUserId?: string;
  displayName?: string;
  avatarUrl?: string;
  className?: string;
}

export default function SiteRenderer({
  sections,
  theme,
  productsUserId,
  displayName,
  avatarUrl,
  className,
}: SiteRendererProps) {
  const p = useMemo(() => buildPalette(theme), [theme]);
  const visible = sections.filter((s) => s.visible);

  return (
    <div
      className={className}
      style={{ background: p.bg, color: p.text, minHeight: "100%", width: "100%" }}
    >
      {visible.length === 0 ? (
        <div style={{ padding: "64px 24px", textAlign: "center", color: p.muted }}>
          <p style={{ fontSize: 14 }}>No sections yet — add one to build your site.</p>
        </div>
      ) : (
        visible.map((section) => (
          <SectionView
            key={section.id}
            section={section}
            palette={p}
            productsUserId={productsUserId}
            displayName={displayName}
            avatarUrl={avatarUrl}
          />
        ))
      )}

      <footer
        style={{
          padding: "24px",
          textAlign: "center",
          borderTop: `1px solid ${p.border}`,
          color: p.muted,
          fontSize: 11,
          letterSpacing: "0.02em",
        }}
      >
        Powered by <span style={{ fontWeight: 800, color: p.text }}>UPLY</span>
      </footer>
    </div>
  );
}

function SectionView({
  section,
  palette: p,
  productsUserId,
  displayName,
  avatarUrl,
}: {
  section: SiteSection;
  palette: Palette;
  productsUserId?: string;
  displayName?: string;
  avatarUrl?: string;
}) {
  const props = section.props || {};
  const wrap: React.CSSProperties = { padding: "48px 24px", maxWidth: 960, margin: "0 auto" };

  switch (section.kind) {
    case "hero":
      return (
        <section style={{ ...wrap, textAlign: "center" }}>
          {(props.imageUrl || avatarUrl) && (
            <img
              src={props.imageUrl || avatarUrl}
              alt={displayName || "Hero"}
              style={{
                width: props.imageUrl ? "100%" : 96,
                height: props.imageUrl ? "auto" : 96,
                maxHeight: props.imageUrl ? 360 : 96,
                objectFit: "cover",
                margin: "0 auto 24px",
                display: "block",
                border: `1px solid ${p.border}`,
              }}
            />
          )}
          <h1 style={{ fontSize: 34, fontWeight: 800, lineHeight: 1.1, margin: 0 }}>
            {props.headline}
          </h1>
          {props.subhead && (
            <p style={{ fontSize: 16, color: p.muted, marginTop: 12, maxWidth: 560, marginInline: "auto" }}>
              {props.subhead}
            </p>
          )}
          <ButtonRow buttons={props.buttons || []} palette={p} center />
        </section>
      );

    case "about":
      return (
        <section style={{ ...wrap }}>
          <div style={{ display: "flex", gap: 32, flexWrap: "wrap", alignItems: "center" }}>
            {props.imageUrl && (
              <img
                src={props.imageUrl}
                alt={props.heading || "About"}
                style={{
                  flex: "1 1 240px",
                  maxWidth: 380,
                  width: "100%",
                  objectFit: "cover",
                  border: `1px solid ${p.border}`,
                }}
              />
            )}
            <div style={{ flex: "1 1 320px", minWidth: 240 }}>
              {props.heading && (
                <h2 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 12px" }}>{props.heading}</h2>
              )}
              <p style={{ fontSize: 15, lineHeight: 1.7, color: p.muted, whiteSpace: "pre-wrap", margin: 0 }}>
                {props.body}
              </p>
            </div>
          </div>
        </section>
      );

    case "links":
      return (
        <section style={{ ...wrap, maxWidth: 560 }}>
          {props.heading && (
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 16px", textAlign: "center" }}>
              {props.heading}
            </h2>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {(props.items || []).map((item: SiteButton, i: number) => (
              <a
                key={i}
                href={item.url || "#"}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 16px",
                  border: `1px solid ${p.border}`,
                  background: p.surface,
                  color: p.text,
                  textDecoration: "none",
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                <span style={{ flex: 1 }}>{item.label || "Untitled link"}</span>
                <ArrowRight style={{ width: 16, height: 16, color: p.accent }} />
              </a>
            ))}
          </div>
        </section>
      );

    case "products":
      return <ProductsSection heading={props.heading} userId={productsUserId} palette={p} />;

    case "gallery":
      return (
        <section style={{ ...wrap }}>
          {props.heading && (
            <h2 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 20px" }}>{props.heading}</h2>
          )}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
              gap: 12,
            }}
          >
            {(props.images || []).filter(Boolean).map((src: string, i: number) => (
              <img
                key={i}
                src={src}
                alt=""
                loading="lazy"
                style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "cover", border: `1px solid ${p.border}` }}
              />
            ))}
            {(!props.images || props.images.filter(Boolean).length === 0) && (
              <p style={{ color: p.muted, fontSize: 14 }}>No images added yet.</p>
            )}
          </div>
        </section>
      );

    case "cta":
      return (
        <section style={{ ...wrap, textAlign: "center", background: p.surface, maxWidth: "100%" }}>
          <div style={{ maxWidth: 640, margin: "0 auto" }}>
            <h2 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>{props.headline}</h2>
            {props.subhead && (
              <p style={{ fontSize: 15, color: p.muted, marginTop: 10 }}>{props.subhead}</p>
            )}
            <ButtonRow buttons={props.button ? [props.button] : []} palette={p} center />
          </div>
        </section>
      );

    case "embed":
      return (
        <section style={{ ...wrap }}>
          {props.heading && (
            <h2 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 16px" }}>{props.heading}</h2>
          )}
          <EmbedView url={props.url} palette={p} />
        </section>
      );

    default:
      return null;
  }
}

function ButtonRow({
  buttons,
  palette: p,
  center,
}: {
  buttons: SiteButton[];
  palette: Palette;
  center?: boolean;
}) {
  const valid = (buttons || []).filter((b) => b && (b.label || b.url));
  if (valid.length === 0) return null;
  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        marginTop: 24,
        flexWrap: "wrap",
        justifyContent: center ? "center" : "flex-start",
      }}
    >
      {valid.map((b, i) => {
        const primary = i === 0;
        return (
          <a
            key={i}
            href={b.url || "#"}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: "12px 24px",
              fontWeight: 700,
              fontSize: 14,
              textDecoration: "none",
              border: `1px solid ${p.accent}`,
              background: primary ? p.accent : "transparent",
              color: primary ? p.onAccent : p.accent,
            }}
          >
            {b.label || "Learn more"}
          </a>
        );
      })}
    </div>
  );
}

function toEmbedUrl(raw: string): string | null {
  if (!raw) return null;
  const url = raw.trim();
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  if (/^https?:\/\//i.test(url)) return url;
  return null;
}

function EmbedView({ url, palette: p }: { url: string; palette: Palette }) {
  const embed = toEmbedUrl(url);
  if (!embed) {
    return <p style={{ color: p.muted, fontSize: 14 }}>Add a video or page URL to embed.</p>;
  }
  return (
    <div style={{ position: "relative", width: "100%", paddingTop: "56.25%", border: `1px solid ${p.border}` }}>
      <iframe
        src={embed}
        title="Embedded content"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
      />
    </div>
  );
}

interface StoreProduct {
  id: string;
  name: string;
  description: string | null;
  type: string;
  price: number;
  image_url: string | null;
}

function ProductsSection({
  heading,
  userId,
  palette: p,
}: {
  heading?: string;
  userId?: string;
  palette: Palette;
}) {
  // Same query shape as SpaceStoreTab — active products for this creator.
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["site-products", userId],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, description, type, price, image_url")
        .eq("user_id", userId!)
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as StoreProduct[];
    },
  });

  const wrap: React.CSSProperties = { padding: "48px 24px", maxWidth: 960, margin: "0 auto" };

  return (
    <section style={wrap}>
      {heading && <h2 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 20px" }}>{heading}</h2>}
      {!userId ? (
        <p style={{ color: p.muted, fontSize: 14 }}>Products will appear here once your site is live.</p>
      ) : isLoading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="rounded-none" style={{ height: 220 }} />
          ))}
        </div>
      ) : products.length === 0 ? (
        <p style={{ color: p.muted, fontSize: 14 }}>No products yet.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
          {products.map((prod) => {
            const price = Number(prod.price) || 0;
            const isFree = price <= 0;
            return (
              <div key={prod.id} style={{ border: `1px solid ${p.border}`, background: p.surface, display: "flex", flexDirection: "column" }}>
                <div style={{ position: "relative", width: "100%", aspectRatio: "1 / 1", background: p.bg }}>
                  {prod.image_url ? (
                    <img src={prod.image_url} alt={prod.name} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Package style={{ width: 32, height: 32, color: p.muted }} />
                    </div>
                  )}
                </div>
                <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0, lineHeight: 1.3 }}>{prod.name}</h3>
                  {prod.description && (
                    <p style={{ fontSize: 12, color: p.muted, margin: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {prod.description}
                    </p>
                  )}
                  <div style={{ marginTop: "auto", paddingTop: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>{isFree ? "Free" : `$${price.toFixed(2)}`}</span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700, color: p.accent }}>
                      View <ExternalLink style={{ width: 12, height: 12 }} />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
