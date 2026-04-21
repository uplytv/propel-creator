import type { LiveTileData } from "./tiles/LiveTile";
import type { SocialTileData } from "./tiles/SocialTile";
import type { EventTileData } from "./tiles/EventTile";
import type { CourseTileData } from "./tiles/CourseTile";
import type { ShortTileData } from "./tiles/ShortTile";

const img = (id: string, w = 800, h = 450) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&q=80`;

export const liveDemo: LiveTileData[] = [
  { id: "l1", title: "Studio Session: Building a Synth from Scratch", thumbnail: img("1493225457124-a3eb161ffa5f"), category: "Music", creator: "neonbeats", viewers: 8421, simulcastCount: 6 },
  { id: "l2", title: "Trading the Open: Live Charts + Q&A", thumbnail: img("1611974789855-9c2a0a7236a3"), category: "Finance", creator: "marketnoah", viewers: 12483, simulcastCount: 8 },
  { id: "l3", title: "Speedrunning Hollow Knight Any%", thumbnail: img("1542751371-adc38448a05e"), category: "Gaming", creator: "pixelghost", viewers: 4218, simulcastCount: 4, locked: true },
  { id: "l4", title: "Late Night Talk: Future of the Creator Economy", thumbnail: img("1505236858219-8359eb29e329"), category: "Talk", creator: "uplyoriginals", viewers: 22910, simulcastCount: 8 },
  { id: "l5", title: "Sunset Yoga Flow Live from Topanga", thumbnail: img("1544367567-0f2fcb009e0b"), category: "Wellness", creator: "lunaflow", viewers: 1872, simulcastCount: 5 },
  { id: "l6", title: "Cooking Korean Street Food Together", thumbnail: img("1504674900247-0877df9cc836"), category: "Food", creator: "chefhana", viewers: 6541, simulcastCount: 6 },
  { id: "l7", title: "Designing in Figma — Brand Refresh", thumbnail: img("1561070791-2526d30994b8"), category: "Design", creator: "studiomar", viewers: 3270, simulcastCount: 5 },
  { id: "l8", title: "AMA: Building a $10K/mo Newsletter", thumbnail: img("1499750310107-5fef28a66643"), category: "Business", creator: "scribekai", viewers: 5128, simulcastCount: 7 },
];

export const eventsDemo: EventTileData[] = [
  { id: "e1", title: "NEON HOURS // Live Tour — LA", image: img("1470229722913-7c0e2dbbafd3"), month: "MAY", day: "14", category: "CONCERT", venue: "The Wiltern, Los Angeles", going: 1284, price: "$28" },
  { id: "e2", title: "Creator Camp: Summer Festival 2025", image: img("1533174072545-7a4b6ad7a6c3"), month: "JUN", day: "21", category: "FESTIVAL", venue: "Joshua Tree, CA", going: 4810, price: "$120" },
  { id: "e3", title: "Founder Brunch — NYC Edition", image: img("1414235077428-338989a2e8c0"), month: "MAY", day: "03", category: "MEETUP", venue: "SoHo, New York", going: 92, price: "Free" },
  { id: "e4", title: "UPLY Conf 2025 — The Operating System", image: img("1540575467063-178a50c2df87"), month: "SEP", day: "12", category: "CONFERENCE", venue: "Mission Bay, SF", going: 2104, price: "$249" },
  { id: "e5", title: "Open Mic + Studio Day", image: img("1501386761578-eac5c94b800a"), month: "MAY", day: "28", category: "COMMUNITY", venue: "Echo Park, LA", going: 184, price: "$10" },
  { id: "e6", title: "Vinyl Night with neonbeats", image: img("1511671782779-c97d3d27a1d4"), month: "JUN", day: "07", category: "CONCERT", venue: "Berlin, DE", going: 612, price: "€18" },
  { id: "e7", title: "Trader Meetup: Pre-Market Coffee", image: img("1556761175-5973dc0f32e7"), month: "MAY", day: "16", category: "MEETUP", venue: "FiDi, NYC", going: 58, price: "Free" },
];

export const socialDemo: SocialTileData[] = [
  { id: "s1", username: "neonbeats", handle: "neonbeats", avatar: img("1539571696357-5a69c17a67c6", 80, 80), image: img("1493225457124-a3eb161ffa5f", 600, 600), likes: 12480, caption: "Studio glow at 3am. New EP drops Friday 🟢" },
  { id: "s2", username: "marketnoah", handle: "marketnoah", avatar: img("1500648767791-00dcc994a43e", 80, 80), image: img("1611974789855-9c2a0a7236a3", 600, 600), likes: 8421, caption: "Pre-market setup. SPY watching $510 reclaim 📈" },
  { id: "s3", username: "lunaflow", handle: "lunaflow", avatar: img("1544005313-94ddf0286df2", 80, 80), image: img("1544367567-0f2fcb009e0b", 600, 600), likes: 5210, caption: "Tonight's flow: hips + hamstrings. Rolling out the mat 🌅" },
  { id: "s4", username: "chefhana", handle: "chefhana", avatar: img("1487412720507-e7ab37603c6f", 80, 80), image: img("1504674900247-0877df9cc836", 600, 600), likes: 9810, caption: "Tteokbokki test #4. Spice level: dangerous 🔥" },
  { id: "s5", username: "pixelghost", handle: "pixelghost", avatar: img("1535713875002-d1d0cf377fde", 80, 80), image: img("1542751371-adc38448a05e", 600, 600), likes: 3120, caption: "New PB. The any% grind continues." },
  { id: "s6", username: "studiomar", handle: "studiomar", avatar: img("1438761681033-6461ffad8d80", 80, 80), image: img("1561070791-2526d30994b8", 600, 600), likes: 4421, caption: "Shipped a brand refresh today. The U was the easy part." },
  { id: "s7", username: "scribekai", handle: "scribekai", avatar: img("1500648767791-00dcc994a43e", 80, 80), image: img("1499750310107-5fef28a66643", 600, 600), likes: 2380, caption: "10K subs unlocked. Thank you to everyone reading. ✍️" },
];

export const coursesDemo: CourseTileData[] = [
  { id: "c1", title: "Build a Newsletter from $0 to $10K MRR", image: img("1499750310107-5fef28a66643"), instructor: "Kai Mendez", lessons: 18, durationLabel: "4h 12m", progress: 42 },
  { id: "c2", title: "Live Streaming Mastery: 8-Platform Simulcast", image: img("1505236858219-8359eb29e329"), instructor: "UPLY Originals", lessons: 24, durationLabel: "6h 30m", progress: 67 },
  { id: "c3", title: "Music Production: Synth Design from Scratch", image: img("1493225457124-a3eb161ffa5f"), instructor: "Neon Beats", lessons: 12, durationLabel: "3h 05m" },
  { id: "c4", title: "Trading Psychology: Edge in Volatile Markets", image: img("1611974789855-9c2a0a7236a3"), instructor: "Noah Marquez", lessons: 16, durationLabel: "5h 18m", progress: 12 },
  { id: "c5", title: "Yoga Teacher Training — Foundations", image: img("1544367567-0f2fcb009e0b"), instructor: "Luna Flow", lessons: 30, durationLabel: "9h 40m" },
  { id: "c6", title: "Brand Identity in Figma", image: img("1561070791-2526d30994b8"), instructor: "Studio Mar", lessons: 14, durationLabel: "3h 50m", progress: 88 },
  { id: "c7", title: "Speedrunning: Routing & Optimization", image: img("1542751371-adc38448a05e"), instructor: "Pixel Ghost", lessons: 9, durationLabel: "2h 22m", locked: true },
];

export const shortsDemo: ShortTileData[] = [
  { id: "sh1", image: img("1493225457124-a3eb161ffa5f", 360, 640), creator: "neonbeats", views: 2_400_000 },
  { id: "sh2", image: img("1542751371-adc38448a05e", 360, 640), creator: "pixelghost", views: 980_000 },
  { id: "sh3", image: img("1544367567-0f2fcb009e0b", 360, 640), creator: "lunaflow", views: 412_000 },
  { id: "sh4", image: img("1611974789855-9c2a0a7236a3", 360, 640), creator: "marketnoah", views: 1_200_000 },
  { id: "sh5", image: img("1504674900247-0877df9cc836", 360, 640), creator: "chefhana", views: 612_000 },
  { id: "sh6", image: img("1561070791-2526d30994b8", 360, 640), creator: "studiomar", views: 78_000 },
  { id: "sh7", image: img("1499750310107-5fef28a66643", 360, 640), creator: "scribekai", views: 145_000 },
  { id: "sh8", image: img("1505236858219-8359eb29e329", 360, 640), creator: "uplyoriginals", views: 3_100_000 },
];
