import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Suggestion {
  user_id: string;
  username: string | null;
  display_name: string;
  avatar_url: string | null;
}

interface Props {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  /** Called with the user_ids of every @mention currently in the value */
  onMentionsChange?: (userIds: string[]) => void;
  textarea?: boolean;
}

/**
 * Lightweight @-mention autocomplete for post/comment/DM composers.
 * Drop-in replacement for an <input>/<textarea>: pass value/onChange.
 */
export default function MentionAutocomplete({
  value,
  onChange,
  placeholder,
  rows = 3,
  className = "",
  onMentionsChange,
  textarea = true,
}: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);
  const [resolved, setResolved] = useState<Map<string, string>>(new Map()); // username → user_id

  // Detect "@query" being typed near the cursor
  const detectQuery = (text: string, cursor: number): string | null => {
    const before = text.slice(0, cursor);
    const m = before.match(/@([a-zA-Z0-9_]{1,30})$/);
    return m ? m[1] : null;
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    const next = e.target.value;
    onChange(next);
    const q = detectQuery(next, e.target.selectionStart ?? next.length);
    if (q !== null) {
      setOpen(true);
      void loadSuggestions(q);
    } else {
      setOpen(false);
    }
  };

  const loadSuggestions = async (q: string) => {
    if (!q) {
      setSuggestions([]);
      return;
    }
    const { data } = await supabase
      .from("profiles_public")
      .select("user_id, username, display_name, avatar_url")
      .or(`username.ilike.${q}%,display_name.ilike.${q}%`)
      .limit(6);
    setSuggestions((data as any[]) ?? []);
    setActiveIdx(0);
  };

  const insertMention = (s: Suggestion) => {
    const el = inputRef.current;
    if (!el) return;
    const cursor = el.selectionStart ?? value.length;
    const before = value.slice(0, cursor).replace(/@([a-zA-Z0-9_]{1,30})$/, "");
    const after = value.slice(cursor);
    const handle = s.username ?? s.display_name.replace(/\s+/g, "");
    const next = `${before}@${handle} ${after}`;
    onChange(next);
    setResolved((prev) => new Map(prev).set(handle, s.user_id));
    setOpen(false);
  };

  // Bubble up resolved mention user_ids when value changes
  useEffect(() => {
    if (!onMentionsChange) return;
    const handles = Array.from(value.matchAll(/@([a-zA-Z0-9_]+)/g)).map((m) => m[1]);
    const ids = handles.map((h) => resolved.get(h)).filter(Boolean) as string[];
    onMentionsChange(ids);
  }, [value, resolved, onMentionsChange]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      insertMention(suggestions[activeIdx]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const Field: any = textarea ? "textarea" : "input";

  return (
    <div className="relative">
      <Field
        ref={inputRef as any}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKey}
        placeholder={placeholder}
        rows={textarea ? rows : undefined}
        className={`w-full resize-none rounded-xl bg-muted border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary ${className}`}
      />

      {open && suggestions.length > 0 && (
        <ul className="absolute z-30 left-0 right-0 mt-1 max-h-60 overflow-auto rounded-xl bg-popover border border-border shadow-lg">
          {suggestions.map((s, i) => (
            <li key={s.user_id}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  insertMention(s);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-accent ${
                  i === activeIdx ? "bg-accent" : ""
                }`}
              >
                <Avatar className="w-7 h-7">
                  <AvatarImage src={s.avatar_url ?? undefined} />
                  <AvatarFallback className="text-xs">{s.display_name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{s.display_name}</p>
                  {s.username && <p className="text-xs text-muted-foreground truncate">@{s.username}</p>}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Helper: persist a list of mentions for a given content source.
 */
export async function recordMentions(opts: {
  actorId: string;
  mentionedUserIds: string[];
  sourceType: string;
  sourceId: string;
  preview?: string;
  link?: string;
}) {
  const { actorId, mentionedUserIds, sourceType, sourceId, preview, link } = opts;
  const unique = [...new Set(mentionedUserIds)].filter((id) => id && id !== actorId);
  if (unique.length === 0) return;
  await supabase.from("mentions").insert(
    unique.map((mentioned_user_id) => ({
      mentioned_user_id,
      actor_id: actorId,
      source_type: sourceType,
      source_id: sourceId,
      preview: preview?.slice(0, 200) ?? null,
      link: link ?? null,
    }))
  );
}
