import { ExternalLink, ArrowRight } from "lucide-react";

interface Props {
  displayName: string;
  avatarUrl: string;
  tagline: string;
  bgColor: string;
  accentColor: string;
  links: { id: string; title: string; url: string; icon?: string; link_type: string }[];
}

export default function LinkInBioRenderer({ displayName, avatarUrl, tagline, bgColor, accentColor, links }: Props) {
  return (
    <div className="min-h-[500px] flex flex-col items-center py-10 px-6" style={{ background: bgColor, color: "#fff" }}>
      <img src={avatarUrl || "/favicon.png"} alt={displayName} className="w-20 h-20 rounded-full object-cover mb-3 border-2" style={{ borderColor: accentColor }} />
      <h1 className="text-xl font-extrabold tracking-tight">{displayName}</h1>
      {tagline && <p className="text-sm text-gray-400 mt-1 text-center max-w-xs">{tagline}</p>}

      <div className="w-full max-w-sm mt-6 space-y-3">
        {links.map((link) => (
          <a
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 w-full px-4 py-3 rounded-lg border transition-all hover:scale-[1.02]"
            style={{ borderColor: `${accentColor}30`, background: `${accentColor}08` }}
          >
            {link.icon && <span className="text-lg">{link.icon}</span>}
            <span className="flex-1 text-sm font-semibold text-white">{link.title}</span>
            <ArrowRight className="w-4 h-4" style={{ color: accentColor }} />
          </a>
        ))}
      </div>

      <div className="mt-auto pt-8 flex items-center gap-1 opacity-40">
        <span className="text-[10px]">Powered by</span>
        <span className="text-[10px] font-bold">UPLY</span>
      </div>
    </div>
  );
}
