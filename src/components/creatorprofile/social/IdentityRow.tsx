import { Link } from "react-router-dom";
import { BadgeCheck, MapPin, MessageCircle, UserPlus, Sparkles, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  displayName: string;
  username?: string | null;
  isVerified?: boolean;
  location?: string | null;
  layoutLabel?: string | null;
  isOwner: boolean;
  hasSubscribe?: boolean;
  subscribePriceLabel?: string | null;
  onSubscribe?: () => void;
  onFollow?: () => void;
  isFollowing?: boolean;
  messageHref?: string;
  onShare?: () => void;
}

export default function IdentityRow({
  displayName,
  username,
  isVerified,
  location,
  layoutLabel,
  isOwner,
  hasSubscribe,
  subscribePriceLabel,
  onSubscribe,
  onFollow,
  isFollowing,
  messageHref,
  onShare,
}: Props) {
  return (
    <section className="max-w-[1100px] mx-auto px-4 sm:px-6 mt-3">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground inline-flex items-center gap-2 min-w-0">
              <span className="truncate">{displayName}</span>
              {isVerified && <BadgeCheck className="h-5 w-5 text-primary shrink-0" />}
            </h1>
            {onShare && (
              <button
                type="button"
                onClick={onShare}
                aria-label="Share profile"
                className="shrink-0 h-11 w-11 -mt-1 rounded-full border border-border/60 bg-card/60 text-foreground flex items-center justify-center hover:bg-card transition active:scale-95"
              >
                <Share2 className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {username && <span className="font-mono">@{username}</span>}
            {location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {location}
              </span>
            )}
            {layoutLabel && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border/60 px-2 py-0.5 text-[11px] uppercase tracking-wide">
                <Sparkles className="h-3 w-3" />
                {layoutLabel}
              </span>
            )}
          </div>
        </div>

        {!isOwner && (
          <div className="flex items-center gap-2">
            {hasSubscribe && (
              <Button
                onClick={onSubscribe}
                className="bg-gradient-to-r from-primary to-primary/70 text-primary-foreground min-h-[44px] px-4 font-semibold"
              >
                Subscribe{subscribePriceLabel ? ` · ${subscribePriceLabel}` : ""}
              </Button>
            )}
            <Button
              onClick={onFollow}
              variant={isFollowing ? "secondary" : "default"}
              className="min-h-[44px] px-4"
            >
              <UserPlus className="h-4 w-4 mr-1.5" />
              {isFollowing ? "Following" : "Follow"}
            </Button>
            {messageHref && (
              <Button asChild variant="outline" className="min-h-[44px] min-w-[44px] px-3">
                <Link to={messageHref} aria-label="Message">
                  <MessageCircle className="h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
