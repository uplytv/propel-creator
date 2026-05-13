import { useRef, useState } from "react";
import { Pencil, Settings2, Upload, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useUpsertArtistProfile } from "@/features/music/hooks/useArtistProfile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const sb = supabase as unknown as any;

interface Props {
  initial: {
    header_image_url?: string | null;
    artist_bio?: string | null;
    tagline?: string | null;
    cta_label?: string | null;
    cta_url?: string | null;
  };
  /** When true, show edit affordance buttons inline. */
  ownerMode: boolean;
  /** Owner's user id — used to deep-link the advanced editor. */
  userId?: string | null;
}

/**
 * Owner-only inline edit cluster.
 * - Cover sheet (URL upload field; the actual storage upload UX lives in
 *   /artist-page-editor advanced view).
 * - Bio + CTA sheet.
 * - "Advanced settings" link to the existing accordion editor.
 *
 * Keeps things minimal — power editing remains in /artist-page-editor.
 */
export default function InlineEditMenu({ initial, ownerMode, userId }: Props) {
  const [openCover, setOpenCover] = useState(false);
  const [openBio, setOpenBio] = useState(false);
  const upsert = useUpsertArtistProfile();

  const [coverUrl, setCoverUrl] = useState(initial.header_image_url || "");
  const [bio, setBio] = useState(initial.artist_bio || "");
  const [tagline, setTagline] = useState(initial.tagline || "");
  const [ctaLabel, setCtaLabel] = useState(initial.cta_label || "");
  const [ctaUrl, setCtaUrl] = useState(initial.cta_url || "");

  if (!ownerMode) return null;

  async function saveCover() {
    try {
      await upsert.mutateAsync({ header_image_url: coverUrl || null } as any);
      toast.success("Cover updated");
      setOpenCover(false);
    } catch (e: any) {
      toast.error(e?.message || "Could not save");
    }
  }

  async function saveBio() {
    try {
      await upsert.mutateAsync({
        artist_bio: bio || null,
        tagline: tagline || null,
        cta_label: ctaLabel || null,
        cta_url: ctaUrl || null,
      } as any);
      toast.success("Profile updated");
      setOpenBio(false);
    } catch (e: any) {
      toast.error(e?.message || "Could not save");
    }
  }

  return (
    <>
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 mt-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setOpenCover(true)} className="min-h-[40px]">
            <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit cover
          </Button>
          <Button size="sm" variant="outline" onClick={() => setOpenBio(true)} className="min-h-[40px]">
            <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit bio
          </Button>
          {userId && (
            <Button asChild size="sm" variant="ghost" className="min-h-[40px] text-muted-foreground">
              <Link to={`/music/artist/${userId}/edit/advanced`}>
                <Settings2 className="h-3.5 w-3.5 mr-1.5" /> Advanced settings
              </Link>
            </Button>
          )}
        </div>
      </div>

      <Sheet open={openCover} onOpenChange={setOpenCover}>
        <SheetContent side="bottom" className="max-h-[80vh]">
          <SheetHeader>
            <SheetTitle>Cover image</SheetTitle>
            <SheetDescription>
              Paste an image URL. Leave blank to fall back to your latest post.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            <Label htmlFor="cover-url">Image URL</Label>
            <Input
              id="cover-url"
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
              placeholder="https://…"
            />
            <Button onClick={saveCover} disabled={upsert.isPending} className="w-full min-h-[44px]">
              Save
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={openBio} onOpenChange={setOpenBio}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Bio &amp; call-to-action</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="tagline">Tagline</Label>
              <Input
                id="tagline"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="One line that describes you"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={5}
                placeholder="Tell people what you make"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="cta-label">CTA label</Label>
                <Input
                  id="cta-label"
                  value={ctaLabel}
                  onChange={(e) => setCtaLabel(e.target.value)}
                  placeholder="Book a session"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cta-url">CTA URL</Label>
                <Input
                  id="cta-url"
                  value={ctaUrl}
                  onChange={(e) => setCtaUrl(e.target.value)}
                  placeholder="https://…"
                />
              </div>
            </div>
            <Button onClick={saveBio} disabled={upsert.isPending} className="w-full min-h-[44px]">
              Save
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
