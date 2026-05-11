import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Video, Music, Disc3, MessageSquare, Radio,
  Calendar, ListMusic, ShoppingBag, Briefcase
} from "lucide-react";

type Tile = { icon: React.ElementType; title: string; desc: string; to: string };
type Group = { label: string; tiles: Tile[] };

const groups: Group[] = [
  {
    label: "Share",
    tiles: [
      { icon: Video, title: "Video", desc: "Upload a video to your channel", to: "/camera" },
      { icon: Music, title: "Track", desc: "Drop a single — Mux-powered", to: "/music/upload" },
      { icon: Disc3, title: "Album", desc: "Release a full project", to: "/music/upload?type=album" },
      { icon: MessageSquare, title: "Post", desc: "Write to your community", to: "/create/post/editor" },
    ],
  },
  {
    label: "Go Live",
    tiles: [
      { icon: Radio, title: "Live stream", desc: "Start broadcasting now", to: "/go-live" },
    ],
  },
  {
    label: "Plan",
    tiles: [
      { icon: Calendar, title: "Event", desc: "Schedule a virtual or IRL event", to: "/events/create" },
      { icon: ListMusic, title: "Playlist", desc: "Curate a new playlist", to: "/music/library" },
    ],
  },
  {
    label: "Earn",
    tiles: [
      { icon: ShoppingBag, title: "Product / drop", desc: "Sell merch, beats, or files", to: "/products" },
      { icon: Briefcase, title: "Job listing", desc: "Hire from the talent network", to: "/post-job" },
    ],
  },
];

export default function CreateSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const go = (to: string) => { onClose(); navigate(to); };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="bottom"
        className="bg-[#0A0A0A] border-t border-white/10 text-white p-0 max-h-[85vh] overflow-y-auto rounded-t-2xl"
      >
        <SheetHeader className="px-5 pt-5 pb-2">
          <SheetTitle className="text-white text-lg font-bold tracking-tight">Create</SheetTitle>
        </SheetHeader>
        <div className="px-4 pb-8 space-y-5">
          {groups.map((g) => (
            <div key={g.label}>
              <p className="text-[11px] font-bold uppercase tracking-widest text-white/40 px-2 mb-2">
                {g.label}
              </p>
              <div className="space-y-2">
                {g.tiles.map((t) => (
                  <button
                    key={t.title}
                    onClick={() => go(t.to)}
                    className="w-full min-h-[64px] flex items-center gap-3 px-4 rounded-2xl border border-white/5 hover:border-white/10 transition-colors text-left"
                    style={{
                      background:
                        "linear-gradient(90deg, rgba(61,124,255,0.10), rgba(176,37,255,0.10))",
                    }}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 flex-shrink-0">
                      <t.icon className="w-5 h-5" style={{ color: "#B025FF" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{t.title}</p>
                      <p className="text-[11px] text-white/50 truncate">{t.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
