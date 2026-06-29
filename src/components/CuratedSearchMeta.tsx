import { BadgeCheck } from "lucide-react";
import CuratedFollowButton from "@/components/CuratedFollowButton";

interface Props {
  title: string;
  verified?: boolean;
  followKey?: string;
  size?: "sm" | "md";
}

/**
 * Shared verified-badge + follow-button renderer used by both the main
 * Search page (`useSearch`) and the global search engine results
 * (`useSearchEngine`) so curated entries (Arya XO, etc.) look and behave
 * identically wherever they surface.
 */
export function VerifiedTitleBadge({ verified }: { verified?: boolean }) {
  if (!verified) return null;
  return (
    <BadgeCheck
      className="w-4 h-4 text-primary shrink-0 fill-primary/20"
      aria-label="Verified artist"
    />
  );
}

export default function CuratedSearchMeta({ title, verified, followKey, size = "sm" }: Props) {
  if (!followKey) return null;
  return (
    <CuratedFollowButton followKey={followKey} displayName={title} size={size} />
  );
}
