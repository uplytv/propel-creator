export interface MockStream {
  id: string;
  creatorName: string;
  creatorAvatar: string;
  creatorTier: number;
  creatorTierName: string;
  title: string;
  category: string;
  viewers: number;
  isLive: boolean;
  isPublic: boolean;
  thumbnailGradient: string;
  communityPrice: number;
  startedAt: string;
  description: string;
  muxPlaybackId?: string | null;
}

export const categories = [
  "Business Strategy",
  "Fitness & Nutrition",
  "Music Production",
  "Photography",
  "UX Design",
  "Web Development",
  "Marketing",
  "Writing",
  "Finance",
  "AI & Tech",
];

export const mockStreams: MockStream[] = [
  {
    id: "stream-1",
    creatorName: "Sarah Chen",
    creatorAvatar: "SC",
    creatorTier: 4,
    creatorTierName: "Elite",
    title: "Building a $50K/month Fitness Empire — Live Q&A",
    category: "Fitness & Nutrition",
    viewers: 2847,
    isLive: true,
    isPublic: true,
    thumbnailGradient: "from-emerald-900/80 via-teal-900/60 to-background",
    communityPrice: 29,
    startedAt: "45 min ago",
    description: "Join me as I break down my exact strategy for scaling a fitness community to $50K MRR. Live Q&A — ask me anything!",
  },
  {
    id: "stream-2",
    creatorName: "Marcus Rivera",
    creatorAvatar: "MR",
    creatorTier: 3,
    creatorTierName: "Scaling",
    title: "Mastering Street Photography — Real-time Editing Session",
    category: "Photography",
    viewers: 1523,
    isLive: true,
    isPublic: true,
    thumbnailGradient: "from-primary/30 via-primary/15 to-background",
    communityPrice: 19,
    startedAt: "1h 12m ago",
    description: "Watch me edit my latest street photography series in Lightroom. Tips, tricks, and honest feedback on your submissions.",
  },
  {
    id: "stream-3",
    creatorName: "Aisha Patel",
    creatorAvatar: "AP",
    creatorTier: 3,
    creatorTierName: "Scaling",
    title: "From Zero to $10K MRR — The Exact Playbook",
    category: "Business Strategy",
    viewers: 3201,
    isLive: true,
    isPublic: true,
    thumbnailGradient: "from-amber-900/80 via-orange-900/60 to-background",
    communityPrice: 39,
    startedAt: "23 min ago",
    description: "I'm revealing the exact steps I used to grow from zero to $10K/month. No fluff, just actionable strategy.",
  },
  {
    id: "stream-4",
    creatorName: "Jake Morrison",
    creatorAvatar: "JM",
    creatorTier: 2,
    creatorTierName: "Rising",
    title: "Live Beat Making — Lo-fi Hip Hop Session",
    category: "Music Production",
    viewers: 891,
    isLive: true,
    isPublic: true,
    thumbnailGradient: "from-rose-900/80 via-pink-900/60 to-background",
    communityPrice: 15,
    startedAt: "2h ago",
    description: "Making beats live! Drop your sample suggestions in chat. Members get the stems for free.",
  },
  {
    id: "stream-5",
    creatorName: "Luna Zhang",
    creatorAvatar: "LZ",
    creatorTier: 2,
    creatorTierName: "Rising",
    title: "Redesigning a SaaS Dashboard — UX Critique",
    category: "UX Design",
    viewers: 1105,
    isLive: true,
    isPublic: true,
    thumbnailGradient: "from-cyan-900/80 via-blue-900/60 to-background",
    communityPrice: 24,
    startedAt: "35 min ago",
    description: "Submit your SaaS dashboards for a live UX review. Learn design thinking in real-time.",
  },
  {
    id: "stream-6",
    creatorName: "David Kim",
    creatorAvatar: "DK",
    creatorTier: 4,
    creatorTierName: "Elite",
    title: "AI Automation for Creators — Build Your First Agent",
    category: "AI & Tech",
    viewers: 4120,
    isLive: true,
    isPublic: true,
    thumbnailGradient: "from-indigo-900/80 via-blue-900/60 to-background",
    communityPrice: 49,
    startedAt: "10 min ago",
    description: "I'm building an AI agent live that automates content repurposing. Follow along and build yours too.",
  },
  {
    id: "stream-7",
    creatorName: "Emma Torres",
    creatorAvatar: "ET",
    creatorTier: 1,
    creatorTierName: "Starter",
    title: "SEO Deep Dive — Ranking Your Content in 2025",
    category: "Marketing",
    viewers: 432,
    isLive: true,
    isPublic: true,
    thumbnailGradient: "from-green-900/80 via-emerald-900/60 to-background",
    communityPrice: 12,
    startedAt: "55 min ago",
    description: "Breaking down the latest SEO strategies that actually work. Bring your URLs for a live audit!",
  },
  {
    id: "stream-8",
    creatorName: "Ryan Foster",
    creatorAvatar: "RF",
    creatorTier: 2,
    creatorTierName: "Rising",
    title: "Building a Full-Stack App with React & Supabase",
    category: "Web Development",
    viewers: 1890,
    isLive: true,
    isPublic: true,
    thumbnailGradient: "from-sky-900/80 via-cyan-900/60 to-background",
    communityPrice: 19,
    startedAt: "1h 30m ago",
    description: "Code-along session: building a real-time collaboration app from scratch. Beginner-friendly!",
  },
];

export const mockChatMessages = [
  { id: "1", user: "Alex M.", message: "This is incredible, never thought of it that way 🔥", isMember: true, timestamp: "2m ago" },
  { id: "2", user: "Jordan K.", message: "Can you show that setup again?", isMember: false, timestamp: "2m ago" },
  { id: "3", user: "Casey R.", message: "Just joined the community! So worth it", isMember: true, timestamp: "1m ago" },
  { id: "4", user: "Morgan P.", message: "What tools are you using for this?", isMember: false, timestamp: "1m ago" },
  { id: "5", user: "Sam W.", message: "Been a member for 3 months, this content keeps getting better", isMember: true, timestamp: "45s ago" },
  { id: "6", user: "Riley J.", message: "How do I get started as a complete beginner?", isMember: false, timestamp: "30s ago" },
  { id: "7", user: "Taylor B.", message: "The members-only resources are amazing btw", isMember: true, timestamp: "15s ago" },
  { id: "8", user: "Avery N.", message: "Just clicked join, best decision ever 💪", isMember: true, timestamp: "just now" },
];
