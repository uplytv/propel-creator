import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Instagram, Youtube, Twitter, Linkedin, Mic, Mail, Globe } from "lucide-react";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  instagram: Instagram,
  youtube: Youtube,
  twitter: Twitter,
  x: Twitter,
  linkedin: Linkedin,
  podcast: Mic,
  newsletter: Mail,
  website: Globe,
  // tiktok via inline svg
};

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 11-2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.48v-7.15a8.16 8.16 0 005.58 2.18v-3.45a4.85 4.85 0 01-3.77-1.81V6.69h3.77z" />
  </svg>
);

export default function SocialIconsRow({ userId }: { userId: string }) {
  const { data: links = [] } = useQuery({
    queryKey: ["creator-social-links", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("social_links")
        .select("id,platform,url")
        .eq("user_id", userId);
      return (data as Array<{ id: string; platform: string; url: string }>) || [];
    },
    staleTime: 60_000,
  });

  if (!links.length) return null;

  return (
    <div className="flex justify-center gap-3 mt-4 px-4">
      {links.map((link) => {
        const key = (link.platform || "").toLowerCase();
        const Icon = key === "tiktok" ? TikTokIcon : ICONS[key] || Globe;
        return (
          <a
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={link.platform}
            className="w-11 h-11 min-w-[44px] rounded-full flex items-center justify-center bg-secondary text-muted-foreground hover:text-primary hover:bg-secondary/80 transition-colors"
          >
            <Icon className="w-4 h-4" />
          </a>
        );
      })}
    </div>
  );
}
