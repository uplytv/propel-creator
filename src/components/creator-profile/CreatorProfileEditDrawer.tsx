import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Upload } from "lucide-react";

const PLATFORMS = ["instagram", "tiktok", "youtube", "twitter", "linkedin", "podcast", "newsletter"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: any;
  socialLinks: any[];
}

export default function CreatorProfileEditDrawer({ open, onOpenChange, profile, socialLinks }: Props) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [username, setUsername] = useState((profile as any)?.username || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [creatorType, setCreatorType] = useState(profile?.creator_type || "");
  const [links, setLinks] = useState<{ platform: string; url: string; id?: string }[]>(
    socialLinks.length > 0 ? socialLinks.map((l: any) => ({ platform: l.platform, url: l.url, id: l.id })) : []
  );
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const path = `${profile.user_id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("user_id", profile.user_id);
      queryClient.invalidateQueries({ queryKey: ["creator-public-profile"] });
      toast.success("Avatar updated!");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverUploading(true);
    try {
      const path = `${profile.user_id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("covers").upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("covers").getPublicUrl(path);
      await supabase.from("profiles").update({ cover_image_url: publicUrl }).eq("user_id", profile.user_id);
      queryClient.invalidateQueries({ queryKey: ["creator-public-profile"] });
      toast.success("Cover updated!");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setCoverUploading(false);
    }
  };

  const addLink = () => {
    const used = links.map(l => l.platform);
    const available = PLATFORMS.find(p => !used.includes(p));
    if (available) setLinks([...links, { platform: available, url: "" }]);
  };

  const removeLink = (idx: number) => setLinks(links.filter((_, i) => i !== idx));

  const handleSave = async () => {
    setSaving(true);
    try {
      // Update profile
      await supabase.from("profiles").update({
        display_name: displayName,
        username: username as any,
        bio,
        creator_type: creatorType,
      }).eq("user_id", profile.user_id);

      // Upsert social links — delete all first, then insert
      await (supabase.from("social_links") as any).delete().eq("user_id", profile.user_id);
      const validLinks = links.filter(l => l.url.trim());
      if (validLinks.length > 0) {
        await (supabase.from("social_links") as any).insert(
          validLinks.map(l => ({ user_id: profile.user_id, platform: l.platform, url: l.url.trim() }))
        );
      }

      queryClient.invalidateQueries({ queryKey: ["creator-public-profile"] });
      queryClient.invalidateQueries({ queryKey: ["creator-social-links"] });
      toast.success("Profile saved!");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto" style={{ background: "hsl(var(--background))", borderColor: "hsl(var(--card))" }}>
        <SheetHeader>
          <SheetTitle className="text-white">Edit Profile</SheetTitle>
        </SheetHeader>
        <div className="space-y-5 mt-6">
          {/* Avatar */}
          <div>
            <Label className="text-muted-foreground text-xs mb-1.5">Avatar</Label>
            <label className="flex items-center gap-3 cursor-pointer">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} className="w-14 h-14 rounded-full object-cover" style={{ border: "2px solid #00FF85" }} alt={`${displayName} avatar`} loading="lazy" />
              ) : (
                <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "hsl(var(--card))", border: "2px solid #00FF85", color: "hsl(var(--primary))" }}>
                  {displayName.charAt(0) || "U"}
                </div>
              )}
              <span className="text-sm text-primary font-medium flex items-center gap-1">
                {avatarUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Change avatar
              </span>
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </label>
          </div>

          {/* Cover */}
          <div>
            <Label className="text-muted-foreground text-xs mb-1.5">Cover Image</Label>
            <label className="block cursor-pointer rounded-lg overflow-hidden h-20" style={{ background: "hsl(var(--background))", border: "1px dashed #1E1E1E" }}>
              {profile.cover_image_url ? (
                <img src={profile.cover_image_url} className="w-full h-full object-cover" alt="" loading="lazy" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                  {coverUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Click to upload cover"}
                </div>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
            </label>
          </div>

          {/* Fields */}
          <div>
            <Label className="text-muted-foreground text-xs">Display Name</Label>
            <Input value={displayName} onChange={e => setDisplayName(e.target.value)} className="mt-1" style={{ background: "hsl(var(--background))", borderColor: "hsl(var(--card))", color: "white" }} />
          </div>
          <div>
            <Label className="text-muted-foreground text-xs">Username</Label>
            <Input value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} className="mt-1" style={{ background: "hsl(var(--background))", borderColor: "hsl(var(--card))", color: "white" }} placeholder="your_username" />
          </div>
          <div>
            <Label className="text-muted-foreground text-xs">Bio</Label>
            <Textarea value={bio} onChange={e => setBio(e.target.value)} rows={4} className="mt-1" style={{ background: "hsl(var(--background))", borderColor: "hsl(var(--card))", color: "white" }} />
          </div>
          <div>
            <Label className="text-muted-foreground text-xs">Creator Type</Label>
            <Input value={creatorType} onChange={e => setCreatorType(e.target.value)} className="mt-1" style={{ background: "hsl(var(--background))", borderColor: "hsl(var(--card))", color: "white" }} placeholder="e.g. Fitness, Tech, Music" />
          </div>

          {/* Social Links */}
          <div>
            <Label className="text-muted-foreground text-xs mb-2 block">Social Links</Label>
            <div className="space-y-2">
              {links.map((link, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select
                    value={link.platform}
                    onChange={e => {
                      const updated = [...links];
                      updated[idx].platform = e.target.value;
                      setLinks(updated);
                    }}
                    className="rounded-md px-2 py-2 text-xs w-28 shrink-0"
                    style={{ background: "hsl(var(--background))", borderColor: "hsl(var(--card))", color: "white", border: "1px solid #1E1E1E" }}
                  >
                    {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <Input
                    value={link.url}
                    onChange={e => {
                      const updated = [...links];
                      updated[idx].url = e.target.value;
                      setLinks(updated);
                    }}
                    placeholder="https://..."
                    className="flex-1"
                    style={{ background: "hsl(var(--background))", borderColor: "hsl(var(--card))", color: "white" }}
                  />
                  <button onClick={() => removeLink(idx)} aria-label="Remove link" className="text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            {links.length < PLATFORMS.length && (
              <button onClick={addLink} className="flex items-center gap-1 text-primary text-sm mt-2 font-medium">
                <Plus className="w-4 h-4" /> Add link
              </button>
            )}
          </div>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full font-bold"
            style={{ background: "hsl(var(--primary))", color: "hsl(var(--background))" }}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Save Changes
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
