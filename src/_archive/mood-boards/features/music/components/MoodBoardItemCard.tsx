import { memo } from "react";
import { ImageIcon, Music2, Quote, LinkIcon } from "lucide-react";
import { type MoodBoardItem } from "../hooks/useMoodBoards";

interface Props {
  item: MoodBoardItem;
}

function MoodBoardItemCardImpl({ item }: Props) {
  if (item.kind === "image" && item.url) {
    return (
      <figure className="overflow-hidden rounded-xl border border-border bg-card/50">
        <img
          src={item.url}
          alt={item.caption ?? ""}
          loading="lazy"
          className="h-full w-full object-cover"
        />
        {item.caption && (
          <figcaption className="p-2 text-xs text-muted-foreground">{item.caption}</figcaption>
        )}
      </figure>
    );
  }

  if (item.kind === "quote") {
    return (
      <blockquote className="rounded-xl border border-border bg-card/50 p-4">
        <Quote className="mb-2 h-4 w-4 text-primary" aria-hidden />
        <p className="text-sm italic text-foreground/90">{item.caption ?? item.url}</p>
      </blockquote>
    );
  }

  const Icon = item.kind === "track" ? Music2 : item.kind === "link" ? LinkIcon : ImageIcon;
  return (
    <a
      href={item.url ?? "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-xl border border-border bg-card/50 p-3 transition hover:border-primary/40"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{item.caption ?? item.url}</p>
        {item.url && (
          <p className="truncate text-[11px] text-muted-foreground">{item.url}</p>
        )}
      </div>
    </a>
  );
}

export const MoodBoardItemCard = memo(MoodBoardItemCardImpl);
