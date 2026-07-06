// Starter templates for the Website builder — one per creator persona.
// Each template stores section kinds + props only; fresh ids are generated
// at apply time so applying twice never collides.
import { Megaphone, Briefcase, Music, GraduationCap, Users, type LucideIcon } from "lucide-react";
import { makeSection, type SectionKind, type SiteSection, type SiteTheme } from "./types";

export interface SiteTemplate {
  id: string;
  name: string;
  forWho: string;
  description: string;
  icon: LucideIcon;
  theme: SiteTheme;
  sections: { kind: SectionKind; props: Record<string, any> }[];
}

export const SITE_TEMPLATES: SiteTemplate[] = [
  {
    id: "launch",
    name: "Launch",
    forWho: "Marketing & offers",
    description: "A conversion page: bold promise, proof, one offer, urgency.",
    icon: Megaphone,
    theme: { accent: "#EA580C", mode: "light" },
    sections: [
      {
        kind: "hero",
        props: {
          headline: "Double your reach in 30 days",
          subhead: "The exact system I use to turn content into customers — without paid ads or burnout.",
          imageUrl: "",
          buttons: [
            { label: "Get the system", url: "" },
            { label: "See how it works", url: "" },
          ],
        },
      },
      {
        kind: "about",
        props: {
          heading: "Why this works",
          body: "Most creators post more and earn less. This flips it: one offer, one funnel, one weekly rhythm. I'll show you the numbers behind every step — what I tested, what flopped, and what finally compounded.",
          imageUrl: "",
        },
      },
      { kind: "products", props: { heading: "The offer" } },
      {
        kind: "cta",
        props: {
          headline: "Doors close Friday",
          subhead: "Join now and get the launch checklist free.",
          button: { label: "Claim your spot", url: "" },
        },
      },
      {
        kind: "links",
        props: {
          heading: "Free resources",
          items: [
            { label: "Free swipe file", url: "" },
            { label: "Case study: 0 → 10k", url: "" },
          ],
        },
      },
    ],
  },
  {
    id: "studio",
    name: "Studio",
    forWho: "Business & consulting",
    description: "A clean professional presence: positioning, credentials, services, booking.",
    icon: Briefcase,
    theme: { accent: "#1D4ED8", mode: "light" },
    sections: [
      {
        kind: "hero",
        props: {
          headline: "Strategy that pays for itself",
          subhead: "I help founders and teams find the growth lever they're standing on — then pull it.",
          imageUrl: "",
          buttons: [{ label: "Book a call", url: "" }],
        },
      },
      {
        kind: "about",
        props: {
          heading: "Who you're working with",
          body: "Ten years operating, three exits advised, one obsession: clarity. I work with a small number of clients at a time so every engagement gets real attention — not a slide deck and a goodbye.",
          imageUrl: "",
        },
      },
      { kind: "products", props: { heading: "Services & programs" } },
      {
        kind: "cta",
        props: {
          headline: "Let's talk about your next quarter",
          subhead: "A 20-minute intro call. No pitch, just a diagnosis.",
          button: { label: "Book your intro call", url: "" },
        },
      },
      {
        kind: "links",
        props: {
          heading: "Elsewhere",
          items: [
            { label: "LinkedIn", url: "" },
            { label: "Newsletter", url: "" },
          ],
        },
      },
    ],
  },
  {
    id: "amplify",
    name: "Amplify",
    forWho: "Artists & music",
    description: "A dark stage for your sound: video up front, visuals, every platform one tap away.",
    icon: Music,
    theme: { accent: "#A855F7", mode: "dark" },
    sections: [
      {
        kind: "hero",
        props: {
          headline: "New single out now",
          subhead: "Stream it everywhere — and catch the story behind the record below.",
          imageUrl: "",
          buttons: [
            { label: "Listen now", url: "" },
            { label: "Book me", url: "" },
          ],
        },
      },
      { kind: "embed", props: { heading: "Latest video", url: "" } },
      { kind: "gallery", props: { heading: "On stage", images: [] } },
      {
        kind: "links",
        props: {
          heading: "Listen everywhere",
          items: [
            { label: "Spotify", url: "" },
            { label: "Apple Music", url: "" },
            { label: "YouTube", url: "" },
            { label: "SoundCloud", url: "" },
          ],
        },
      },
      {
        kind: "cta",
        props: {
          headline: "Join the inner circle",
          subhead: "Unreleased tracks, first ticket access, and the group chat.",
          button: { label: "Join the community", url: "" },
        },
      },
    ],
  },
  {
    id: "academy",
    name: "Academy",
    forWho: "Teaching & courses",
    description: "An outcome-first course page: the promise, a preview lesson, your courses, enrollment.",
    icon: GraduationCap,
    theme: { accent: "#0369A1", mode: "light" },
    sections: [
      {
        kind: "hero",
        props: {
          headline: "Learn it in weeks, not years",
          subhead: "Step-by-step courses that skip the fluff and get you to your first real result fast.",
          imageUrl: "",
          buttons: [{ label: "Browse courses", url: "" }],
        },
      },
      { kind: "embed", props: { heading: "Watch a free lesson", url: "" } },
      { kind: "products", props: { heading: "Courses" } },
      {
        kind: "about",
        props: {
          heading: "Your instructor",
          body: "I've taught this to hundreds of students — and made every mistake so you don't have to. Each course is built from real questions students actually asked, not a syllabus written in a vacuum.",
          imageUrl: "",
        },
      },
      {
        kind: "cta",
        props: {
          headline: "Start learning today",
          subhead: "Lifetime access. Learn at your own pace.",
          button: { label: "Enroll now", url: "" },
        },
      },
    ],
  },
  {
    id: "inner-circle",
    name: "Inner Circle",
    forWho: "Community & membership",
    description: "A membership pitch: what's inside, life in the community, one clear join button.",
    icon: Users,
    theme: { accent: "#B45309", mode: "light" },
    sections: [
      {
        kind: "hero",
        props: {
          headline: "You're one room away",
          subhead: "A private community of people building the same thing you are — with the playbooks to prove it.",
          imageUrl: "",
          buttons: [{ label: "Join the community", url: "" }],
        },
      },
      {
        kind: "about",
        props: {
          heading: "What's inside",
          body: "Weekly live calls, a searchable library of everything we've figured out, and a feed where your questions actually get answered. No lurking algorithms — just people who show up.",
          imageUrl: "",
        },
      },
      { kind: "gallery", props: { heading: "Life in the community", images: [] } },
      { kind: "products", props: { heading: "Membership & extras" } },
      {
        kind: "cta",
        props: {
          headline: "Ready to stop building alone?",
          subhead: "Join today — leave whenever you want.",
          button: { label: "Become a member", url: "" },
        },
      },
    ],
  },
];

/** Instantiate a template into fresh sections (new ids every time). */
export function applyTemplate(template: SiteTemplate): { sections: SiteSection[]; theme: SiteTheme } {
  const sections = template.sections.map(({ kind, props }) => {
    const s = makeSection(kind);
    return { ...s, props: { ...s.props, ...props } };
  });
  return { sections, theme: { ...template.theme } };
}
