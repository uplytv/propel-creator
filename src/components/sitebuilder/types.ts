// Section model for the no-code creator Website builder (Phase 1).
// Content is stored in creator_pages.content (jsonb) with page_type = 'website'
// as { sections: SiteSection[]; theme: SiteTheme }.
import { Sparkles, User, Link2, Package, Images, Megaphone, PlaySquare, type LucideIcon } from "lucide-react";

export type SectionKind = "hero" | "about" | "links" | "products" | "gallery" | "cta" | "embed";

export interface SiteButton {
  label: string;
  url: string;
}

export interface SiteSection {
  id: string;
  kind: SectionKind;
  visible: boolean;
  props: Record<string, any>;
}

export interface SiteTheme {
  /** Accent hex — defaults to UPLY brand purple. */
  accent: string;
  /** Site colour mode, independent of the app's theme. */
  mode: "light" | "dark";
}

export interface SiteContent {
  sections: SiteSection[];
  theme: SiteTheme;
}

/** UPLY brand purple — matches --primary (262 83% 58%). */
export const DEFAULT_ACCENT = "#7C3AED";

export const DEFAULT_THEME: SiteTheme = { accent: DEFAULT_ACCENT, mode: "light" };

export const SECTION_KINDS: SectionKind[] = [
  "hero",
  "about",
  "links",
  "products",
  "gallery",
  "cta",
  "embed",
];

export const SECTION_META: Record<SectionKind, { label: string; description: string; icon: LucideIcon }> = {
  hero: { label: "Hero", description: "Big headline, image & call-to-action", icon: Sparkles },
  about: { label: "About", description: "Your story with an image", icon: User },
  links: { label: "Links", description: "A list of link buttons", icon: Link2 },
  products: { label: "Products", description: "Auto-pulls your active products", icon: Package },
  gallery: { label: "Gallery", description: "A grid of images", icon: Images },
  cta: { label: "Call to action", description: "A headline + single button", icon: Megaphone },
  embed: { label: "Embed", description: "Embed a video or page by URL", icon: PlaySquare },
};

export function defaultProps(kind: SectionKind): Record<string, any> {
  switch (kind) {
    case "hero":
      return {
        headline: "Your headline goes here",
        subhead: "A short sentence about what you do and who it's for.",
        imageUrl: "",
        buttons: [{ label: "Get started", url: "" }] as SiteButton[],
      };
    case "about":
      return {
        heading: "About",
        body: "Tell your story here. What do you make, and why does it matter?",
        imageUrl: "",
      };
    case "links":
      return {
        heading: "Links",
        items: [{ label: "My community", url: "" }] as SiteButton[],
      };
    case "products":
      return { heading: "Shop" };
    case "gallery":
      return { heading: "Gallery", images: [] as string[] };
    case "cta":
      return {
        headline: "Ready to get started?",
        subhead: "",
        button: { label: "Join now", url: "" } as SiteButton,
      };
    case "embed":
      return { heading: "", url: "" };
    default:
      return {};
  }
}

function makeId(kind: SectionKind): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  } catch {
    /* ignore */
  }
  return `${kind}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function makeSection(kind: SectionKind): SiteSection {
  return { id: makeId(kind), kind, visible: true, props: defaultProps(kind) };
}

/** A sensible starter site for creators who open the builder for the first time. */
export function starterSections(): SiteSection[] {
  return [makeSection("hero"), makeSection("about"), makeSection("products")];
}

/** Section title shown in the builder list (falls back to the kind label). */
export function sectionTitle(section: SiteSection): string {
  const meta = SECTION_META[section.kind];
  const p = section.props || {};
  const custom = p.headline || p.heading;
  if (custom && typeof custom === "string" && custom.trim()) return custom.trim();
  return meta.label;
}
