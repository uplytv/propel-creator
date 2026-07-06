// Per-section field editor for the Website builder. Renders the right inputs
// for each section kind and reports prop changes upward.
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { SiteSection, SiteButton } from "./types";
import { SECTION_META } from "./types";

interface Props {
  section: SiteSection;
  onChange: (props: Record<string, any>) => void;
}

export default function SectionEditor({ section, onChange }: Props) {
  const props = section.props || {};
  const set = (key: string, value: any) => onChange({ ...props, [key]: value });

  const meta = SECTION_META[section.kind];

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{meta.description}</p>

      {section.kind === "hero" && (
        <>
          <Field label="Headline">
            <Input value={props.headline || ""} onChange={(e) => set("headline", e.target.value)} placeholder="Your headline" />
          </Field>
          <Field label="Subheadline">
            <Textarea value={props.subhead || ""} onChange={(e) => set("subhead", e.target.value)} rows={2} placeholder="Supporting sentence" />
          </Field>
          <Field label="Image URL (optional)">
            <Input value={props.imageUrl || ""} onChange={(e) => set("imageUrl", e.target.value)} placeholder="https://…" />
          </Field>
          <ButtonListEditor
            label="Buttons"
            max={2}
            items={props.buttons || []}
            onChange={(buttons) => set("buttons", buttons)}
          />
        </>
      )}

      {section.kind === "about" && (
        <>
          <Field label="Heading">
            <Input value={props.heading || ""} onChange={(e) => set("heading", e.target.value)} placeholder="About" />
          </Field>
          <Field label="Body">
            <Textarea value={props.body || ""} onChange={(e) => set("body", e.target.value)} rows={5} placeholder="Tell your story…" />
          </Field>
          <Field label="Image URL (optional)">
            <Input value={props.imageUrl || ""} onChange={(e) => set("imageUrl", e.target.value)} placeholder="https://…" />
          </Field>
        </>
      )}

      {section.kind === "links" && (
        <>
          <Field label="Heading (optional)">
            <Input value={props.heading || ""} onChange={(e) => set("heading", e.target.value)} placeholder="Links" />
          </Field>
          <ButtonListEditor
            label="Links"
            items={props.items || []}
            onChange={(items) => set("items", items)}
          />
        </>
      )}

      {section.kind === "products" && (
        <>
          <Field label="Heading (optional)">
            <Input value={props.heading || ""} onChange={(e) => set("heading", e.target.value)} placeholder="Shop" />
          </Field>
          <p className="text-xs text-muted-foreground">
            This section automatically shows your active products. Manage them from the Products page.
          </p>
        </>
      )}

      {section.kind === "gallery" && (
        <>
          <Field label="Heading (optional)">
            <Input value={props.heading || ""} onChange={(e) => set("heading", e.target.value)} placeholder="Gallery" />
          </Field>
          <ImageListEditor images={props.images || []} onChange={(images) => set("images", images)} />
        </>
      )}

      {section.kind === "cta" && (
        <>
          <Field label="Headline">
            <Input value={props.headline || ""} onChange={(e) => set("headline", e.target.value)} placeholder="Ready to join?" />
          </Field>
          <Field label="Subheadline (optional)">
            <Input value={props.subhead || ""} onChange={(e) => set("subhead", e.target.value)} placeholder="Supporting text" />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Button label">
              <Input
                value={props.button?.label || ""}
                onChange={(e) => set("button", { ...(props.button || {}), label: e.target.value })}
                placeholder="Join now"
              />
            </Field>
            <Field label="Button URL">
              <Input
                value={props.button?.url || ""}
                onChange={(e) => set("button", { ...(props.button || {}), url: e.target.value })}
                placeholder="https://…"
              />
            </Field>
          </div>
        </>
      )}

      {section.kind === "embed" && (
        <>
          <Field label="Heading (optional)">
            <Input value={props.heading || ""} onChange={(e) => set("heading", e.target.value)} placeholder="Watch" />
          </Field>
          <Field label="Video / page URL">
            <Input value={props.url || ""} onChange={(e) => set("url", e.target.value)} placeholder="YouTube, Vimeo or any URL" />
          </Field>
        </>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function ButtonListEditor({
  label,
  items,
  onChange,
  max,
}: {
  label: string;
  items: SiteButton[];
  onChange: (items: SiteButton[]) => void;
  max?: number;
}) {
  const update = (i: number, patch: Partial<SiteButton>) =>
    onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const add = () => onChange([...items, { label: "", url: "" }]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        {(max === undefined || items.length < max) && (
          <Button size="sm" variant="outline" className="h-7" onClick={add}>
            <Plus className="w-3 h-3 mr-1" /> Add
          </Button>
        )}
      </div>
      {items.length === 0 && <p className="text-xs text-muted-foreground">None yet.</p>}
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2 border border-border p-2">
          <div className="flex-1 space-y-1">
            <Input
              value={item.label}
              onChange={(e) => update(i, { label: e.target.value })}
              placeholder="Label"
              className="h-8 text-sm"
            />
            <Input
              value={item.url}
              onChange={(e) => update(i, { url: e.target.value })}
              placeholder="https://…"
              className="h-8 text-sm"
            />
          </div>
          <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => remove(i)}>
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      ))}
    </div>
  );
}

function ImageListEditor({ images, onChange }: { images: string[]; onChange: (images: string[]) => void }) {
  const update = (i: number, value: string) => onChange(images.map((im, idx) => (idx === i ? value : im)));
  const remove = (i: number) => onChange(images.filter((_, idx) => idx !== i));
  const add = () => onChange([...images, ""]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">Images</Label>
        <Button size="sm" variant="outline" className="h-7" onClick={add}>
          <Plus className="w-3 h-3 mr-1" /> Add image
        </Button>
      </div>
      {images.length === 0 && <p className="text-xs text-muted-foreground">No images yet.</p>}
      {images.map((im, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            value={im}
            onChange={(e) => update(i, e.target.value)}
            placeholder="https://image-url…"
            className="h-8 text-sm"
          />
          <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => remove(i)}>
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      ))}
    </div>
  );
}
