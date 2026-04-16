import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const MERGE_TAGS = [
  { tag: "{{name}}", desc: "Subscriber name" },
  { tag: "{{email}}", desc: "Email address" },
  { tag: "{{score}}", desc: "Lead score" },
  { tag: "{{source}}", desc: "Sign-up source" },
  { tag: "{{stage}}", desc: "Lifecycle stage" },
];

export function processMergeTags(
  html: string,
  subscriber: { name?: string | null; email: string; lead_score?: number; source?: string; lifecycle_stage?: string }
): string {
  return html
    .replace(/\{\{name\}\}/gi, subscriber.name || subscriber.email.split("@")[0])
    .replace(/\{\{email\}\}/gi, subscriber.email)
    .replace(/\{\{score\}\}/gi, String(subscriber.lead_score || 0))
    .replace(/\{\{source\}\}/gi, subscriber.source || "direct")
    .replace(/\{\{stage\}\}/gi, subscriber.lifecycle_stage || "new");
}

export default function MergeTagHelper() {
  const copyTag = (tag: string) => {
    navigator.clipboard.writeText(tag);
    toast.success(`Copied ${tag}`);
  };

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Merge Tags</p>
      <div className="flex flex-wrap gap-1">
        {MERGE_TAGS.map(({ tag, desc }) => (
          <Badge
            key={tag}
            variant="outline"
            className="text-[10px] px-2 py-0.5 cursor-pointer hover:bg-primary/10 transition-colors"
            onClick={() => copyTag(tag)}
            title={desc}
          >
            {tag}
          </Badge>
        ))}
      </div>
      <p className="text-[9px] text-muted-foreground">Click to copy. Paste into subject or body.</p>
    </div>
  );
}
