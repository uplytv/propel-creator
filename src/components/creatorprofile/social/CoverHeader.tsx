import { useEffect, useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  manualCoverUrl?: string | null;
  fallbackCoverUrl?: string | null;
  /** When manual is missing, derive from the user's most recent post media. */
  creatorUserId?: string;
  avatarUrl?: string | null;
  displayName: string;
  hasStoryRing?: boolean;
  /** When true, tapping cover/avatar opens the file picker. */
  isOwner?: boolean;
}

const sb = supabase as unknown as any;

/**
 * Instagram-style cover + overlapping avatar.
 * Owner: one-tap upload on cover OR avatar (no menu needed).
 */
export default function CoverHeader({
  manualCoverUrl,
  fallbackCoverUrl,
  creatorUserId,
  avatarUrl,
  displayName,
  hasStoryRing,
  isOwner,
}: Props) {
  const [autoCover, setAutoCover] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (manualCoverUrl || fallbackCoverUrl || !creatorUserId) return;
    let cancelled = false;
    (async () => {
      const { data } = await sb
        .from("posts")
        .select("media_url")
        .eq("user_id", creatorUserId)
        .not("media_url", "is", null)
        .order("created_at", { ascending: false })
        .limit(1);
      if (!cancelled && data?.[0]?.media_url) setAutoCover(data[0].media_url as string);
    })();
    return () => {
      cancelled = true;
    };
  }, [manualCoverUrl, fallbackCoverUrl, creatorUserId]);

  const cover = coverPreview || manualCoverUrl || fallbackCoverUrl || autoCover;
  const avatar = avatarPreview || avatarUrl;

  async function uploadAndSet(kind: "cover" | "avatar", file: File) {
    if (!creatorUserId) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be under 10MB");
      return;
    }
    const setBusy = kind === "cover" ? setUploadingCover : setUploadingAvatar;
    const setPreview = kind === "cover" ? setCoverPreview : setAvatarPreview;
    const bucket = kind === "cover" ? "covers" : "avatars";
    try {
      setBusy(true);
      setPreview(URL.createObjectURL(file));
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${creatorUserId}/${kind}-${Date.now()}.${ext}`;
      const { error: upErr } = await sb.storage
        .from(bucket)
        .upload(path, file, { upsert: true, cacheControl: "3600", contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = sb.storage.from(bucket).getPublicUrl(path);
      const url = pub?.publicUrl as string;

      if (kind === "cover") {
        // Persist on artist_profiles.header_image_url (creates row if missing)
        const { error: aErr } = await sb
          .from("artist_profiles")
          .upsert({ user_id: creatorUserId, header_image_url: url }, { onConflict: "user_id" });
        if (aErr) throw aErr;
      } else {
        const { error: pErr } = await sb
          .from("profiles")
          .update({ avatar_url: url })
          .eq("user_id", creatorUserId);
        if (pErr) throw pErr;
      }

      toast.success(kind === "cover" ? "Cover updated" : "Profile photo updated");
      queryClient.invalidateQueries({ queryKey: ["social-creator"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    } catch (e: any) {
      setPreview(null);
      toast.error(e?.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  const coverInteractive = isOwner;

  return (
    <header className="relative">
      {/* Hidden inputs */}
      {isOwner && (
        <>
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadAndSet("cover", f);
              e.target.value = "";
            }}
          />
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadAndSet("avatar", f);
              e.target.value = "";
            }}
          />
        </>
      )}

      {/* Cover */}
      <button
        type="button"
        disabled={!coverInteractive || uploadingCover}
        onClick={() => coverInputRef.current?.click()}
        aria-label={coverInteractive ? "Change cover photo" : undefined}
        className={
          "group relative block w-full h-[180px] sm:h-[240px] md:h-[300px] overflow-hidden " +
          (coverInteractive ? "cursor-pointer" : "cursor-default")
        }
        style={
          cover
            ? {
                backgroundImage: `linear-gradient(rgba(0,0,0,0.15),rgba(0,0,0,0.55)), url(${cover})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : {
                background:
                  "linear-gradient(135deg, hsl(var(--muted) / 0.4), hsl(var(--background)))",
              }
        }
      >
        {coverInteractive && (
          <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-black/55 backdrop-blur-md text-white text-xs px-3 py-1.5 opacity-90">
            {uploadingCover ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…</>
            ) : (
              <><Camera className="h-3.5 w-3.5" /> Change cover</>
            )}
          </span>
        )}
      </button>

      <div className="max-w-[1100px] mx-auto px-4 sm:px-6">
        <div className="-mt-12 sm:-mt-14 flex items-end gap-4">
          <div
            className={
              "relative rounded-full p-[3px] " +
              (hasStoryRing
                ? "bg-gradient-to-tr from-primary via-fuchsia-500 to-amber-400"
                : "bg-background")
            }
          >
            <button
              type="button"
              disabled={!isOwner || uploadingAvatar}
              onClick={() => avatarInputRef.current?.click()}
              aria-label={isOwner ? "Change profile photo" : displayName}
              className={
                "block rounded-full bg-background p-[2px] " +
                (isOwner ? "cursor-pointer" : "cursor-default")
              }
            >
              {avatar ? (
                <img
                  src={avatar}
                  alt={displayName}
                  className="block h-[88px] w-[88px] sm:h-24 sm:w-24 rounded-full object-cover"
                />
              ) : (
                <div className="h-[88px] w-[88px] sm:h-24 sm:w-24 rounded-full bg-muted flex items-center justify-center text-2xl font-heading font-bold text-foreground">
                  {displayName.slice(0, 1).toUpperCase()}
                </div>
              )}
            </button>
            {isOwner && (
              <span
                className="pointer-events-none absolute bottom-0 right-0 h-7 w-7 rounded-full bg-primary text-primary-foreground border-2 border-background flex items-center justify-center shadow-md"
                aria-hidden="true"
              >
                {uploadingAvatar ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Camera className="h-3.5 w-3.5" />
                )}
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
