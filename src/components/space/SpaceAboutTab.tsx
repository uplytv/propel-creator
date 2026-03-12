import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useCreatorSpace, useUpdateSpace } from "@/hooks/useCreatorSpace";
import { useMemberCount, useIsMember, useJoinCommunity } from "@/hooks/useCommunityMembers";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Users, Lock, Globe, Tag, CheckCircle, Play, Star,
  Pencil, X, Check, ImagePlus, Loader2, Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { UPLYMuxPlayer } from "@/components/MuxPlayer";

interface Props {
  creatorId: string;
  isOwner: boolean;
}

export default function SpaceAboutTab({ creatorId, isOwner }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: space } = useCreatorSpace(creatorId);
  const { data: memberCount = 0 } = useMemberCount(creatorId);
  const { data: isMember = false } = useIsMember(creatorId);
  const joinCommunity = useJoinCommunity();
  const updateSpace = useUpdateSpace();
  const [activeThumb, setActiveThumb] = useState(0);
  const [editingPrice, setEditingPrice] = useState(false);
  const [priceInput, setPriceInput] = useState("");

  // Inline editing state
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [editingDesc, setEditingDesc] = useState(false);
  const [descInput, setDescInput] = useState("");

  // Media upload/playback state
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);

  const isVideoFileUrl = (url?: string | null) => {
    if (!url) return false;
    const clean = url.split("?")[0].toLowerCase();
    return [".mp4", ".webm", ".mov", ".m4v", ".ogg"].some((ext) => clean.endsWith(ext));
  };

  const { data: creatorProfile } = useQuery({
    queryKey: ["creator-profile-about", creatorId],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", creatorId).maybeSingle();
      return data;
    },
  });

  // Fetch content assets (videos/images) for the thumbnail strip
  const { data: contentAssets = [] } = useQuery({
    queryKey: ["space-content-assets", creatorId],
    queryFn: async () => {
      const { data } = await supabase
        .from("mux_assets")
        .select("id, mux_playback_id, thumbnail_url, title, duration")
        .eq("user_id", creatorId)
        .eq("status", "ready")
        .order("created_at", { ascending: false })
        .limit(6);
      return data || [];
    },
  });

  const handleJoin = async () => {
    if (!user) return;
    try {
      await joinCommunity.mutateAsync(creatorId);
      toast({ title: "Welcome to the community! 🎉" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const spaceName = space?.name || creatorProfile?.display_name || "Community";
  const coverImage = space?.cover_image_url;
  const avatar = space?.avatar_url || creatorProfile?.avatar_url;
  const bio = space?.description || creatorProfile?.bio || "";
  const isPublic = space?.is_public !== false;
  const isFree = space?.is_free !== false;

  // Save name
  const handleSaveName = () => {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    updateSpace.mutate({ name: trimmed }, {
      onSuccess: () => {
        toast({ title: "Name updated ✏️" });
        setEditingName(false);
      },
    });
  };

  // Save description
  const handleSaveDesc = () => {
    updateSpace.mutate({ description: descInput.trim() }, {
      onSuccess: () => {
        toast({ title: "Description updated ✏️" });
        setEditingDesc(false);
      },
    });
  };

  // Upload cover image or photo
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isOwner) return;

    setUploadingCover(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      let activeSession = sessionData.session;

      if (!activeSession) {
        const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) throw refreshError;
        activeSession = refreshed.session;
      }

      if (!activeSession?.user?.id) {
        throw new Error("Please sign in to upload photos or videos.");
      }

      const ownerId = activeSession.user.id;
      const rawExt = file.name.split(".").pop()?.toLowerCase() || "bin";
      const ext = rawExt.replace(/[^a-z0-9]/g, "") || "bin";
      const path = `${ownerId}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("covers")
        .upload(path, file, { upsert: true, contentType: file.type || undefined });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("covers").getPublicUrl(path);

      const { error: updateError } = await supabase
        .from("creator_spaces")
        .update({ cover_image_url: urlData.publicUrl } as any)
        .eq("creator_id", ownerId);
      if (updateError) throw updateError;

      queryClient.invalidateQueries({ queryKey: ["creator-space", creatorId] });
      toast({ title: "Cover updated 📸" });
    } catch (err: any) {
      const message = String(err?.message || "Upload failed");
      const friendly = message.toLowerCase().includes("row-level security")
        ? "You need an active account session in preview. Please sign in again, then retry upload."
        : message;
      toast({ title: "Upload failed", description: friendly, variant: "destructive" });
    } finally {
      setUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  };

  // Build thumbnail list from content assets + cover
  const thumbnails = contentAssets.length > 0
    ? contentAssets.map(a => ({
        id: a.id,
        src: a.thumbnail_url || (a.mux_playback_id ? `https://image.mux.com/${a.mux_playback_id}/thumbnail.png?time=2` : null),
        playbackId: a.mux_playback_id,
        duration: a.duration,
        isVideo: !!a.mux_playback_id,
      }))
    : coverImage
      ? [{ id: "cover", src: coverImage, playbackId: null, duration: null, isVideo: isVideoFileUrl(coverImage) }]
      : [];

  const activeAsset = thumbnails[activeThumb] || thumbnails[0];

  useEffect(() => {
    setIsPlayingVideo(false);
  }, [activeAsset?.id]);

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const formatMemberCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
    return count.toString();
  };

  return (
    <div className="pb-6">
      {/* Community Name — editable for owner */}
      <div className="px-4 pt-4 pb-3">
        {editingName && isOwner ? (
          <div className="flex items-center gap-2">
            <Input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              className="text-lg font-bold h-9 flex-1"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
            />
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={handleSaveName}>
              <Check className="w-4 h-4 text-primary" />
            </Button>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setEditingName(false)}>
              <X className="w-4 h-4 text-muted-foreground" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 group">
            <h2 className="text-xl font-bold text-foreground">{spaceName}</h2>
            {isOwner && (
              <button
                onClick={() => { setNameInput(spaceName); setEditingName(true); }}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-secondary/50"
              >
                <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main Video / Cover — with upload overlay for owner */}
      <div className="px-4 mb-3">
        <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-secondary/30 group">
          {activeAsset?.src ? (
            <>
              {activeAsset.isVideo && isPlayingVideo ? (
                activeAsset.playbackId ? (
                  <UPLYMuxPlayer playbackId={activeAsset.playbackId} autoPlay className="h-full" />
                ) : (
                  <video
                    src={activeAsset.src}
                    controls
                    autoPlay
                    playsInline
                    className="w-full h-full object-contain bg-black"
                  />
                )
              ) : activeAsset.isVideo && !activeAsset.playbackId ? (
                <video
                  src={activeAsset.src}
                  muted
                  playsInline
                  preload="metadata"
                  className="w-full h-full object-cover"
                />
              ) : (
                <img src={activeAsset.src} alt="" className="w-full h-full object-cover" />
              )}

              {activeAsset.isVideo && !isPlayingVideo && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsPlayingVideo(true)}
                    className="w-16 h-16 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center cursor-pointer shadow-lg"
                  >
                    <Play className="w-7 h-7 text-foreground ml-1" fill="currentColor" />
                  </motion.button>
                </div>
              )}

              {activeAsset.duration && (
                <span className="absolute bottom-3 right-3 px-2 py-0.5 rounded-md bg-background/80 backdrop-blur-sm text-xs font-medium text-foreground">
                  {formatDuration(activeAsset.duration)}
                </span>
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-secondary/50 to-secondary/20">
              {isOwner ? (
                <button
                  onClick={() => coverInputRef.current?.click()}
                  className="flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {uploadingCover ? (
                    <Loader2 className="w-8 h-8 animate-spin" />
                  ) : (
                    <>
                      <ImagePlus className="w-10 h-10" />
                      <span className="text-sm font-medium">Add cover photo or video</span>
                    </>
                  )}
                </button>
              ) : (
                <span className="text-5xl">🚀</span>
              )}
            </div>
          )}

          {/* Owner overlay button to change cover */}
          {isOwner && activeAsset?.src && (
            <button
              onClick={() => coverInputRef.current?.click()}
              className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm rounded-lg px-3 py-1.5 flex items-center gap-1.5 text-xs font-medium text-foreground hover:bg-background/90"
            >
              {uploadingCover ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <ImagePlus className="w-3.5 h-3.5" />
                  Change
                </>
              )}
            </button>
          )}

          <input
            ref={coverInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={handleCoverUpload}
          />
        </div>
      </div>

      {/* Thumbnail Strip + Add Media button for owner */}
      <div className="px-4 mb-4">
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
          {thumbnails.map((thumb, i) => (
            <button
              key={thumb.id}
              onClick={() => setActiveThumb(i)}
              className={`relative flex-shrink-0 w-20 h-14 rounded-lg overflow-hidden transition-all ${
                activeThumb === i
                  ? "ring-2 ring-primary ring-offset-1 ring-offset-background"
                  : "opacity-60 hover:opacity-100"
              }`}
            >
              {thumb.src ? (
                thumb.isVideo && !thumb.playbackId ? (
                  <video src={thumb.src} muted playsInline preload="metadata" className="w-full h-full object-cover" />
                ) : (
                  <img src={thumb.src} alt="" className="w-full h-full object-cover" />
                )
              ) : (
                <div className="w-full h-full bg-secondary/40" />
              )}
              {thumb.isVideo && activeThumb !== i && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Play className="w-4 h-4 text-foreground" fill="currentColor" />
                </div>
              )}
            </button>
          ))}
          {/* Add media button for owner */}
          {isOwner && (
            <button
              onClick={() => coverInputRef.current?.click()}
              className="flex-shrink-0 w-20 h-14 rounded-lg border-2 border-dashed border-border hover:border-primary/40 flex items-center justify-center transition-colors"
            >
              <Plus className="w-5 h-5 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Metadata Row */}
      <div className="px-4 mb-4">
        <div className="grid grid-cols-2 gap-3">
          {/* Private / Public */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {isOwner ? (
              <button
                onClick={() => {
                  updateSpace.mutate({ is_public: !isPublic }, {
                    onSuccess: () => toast({ title: isPublic ? "Set to Private 🔒" : "Set to Public 🌐" }),
                  });
                }}
                className="flex items-center gap-2 px-2 py-1 -mx-2 rounded-md hover:bg-secondary/50 transition-colors"
              >
                {isPublic ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                <span>{isPublic ? "Public" : "Private"}</span>
                <Switch checked={isPublic} className="scale-75 ml-1" />
              </button>
            ) : (
              <>
                {isPublic ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                <span>{isPublic ? "Public" : "Private"}</span>
              </>
            )}
          </div>
          {/* Members */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>{formatMemberCount(memberCount)} members</span>
          </div>
          {/* Price */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {isOwner ? (
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-2 px-2 py-1 -mx-2 rounded-md">
                  <Tag className="w-4 h-4" />
                  <span>{isFree && !editingPrice ? "Free" : `$${space?.price || 0}/mo`}</span>
                  <Switch
                    checked={!isFree}
                    className="scale-75 ml-1"
                    onCheckedChange={(checked) => {
                      if (!checked) {
                        updateSpace.mutate({ is_free: true, price: 0 }, {
                          onSuccess: () => {
                            toast({ title: "Set to Free ✨" });
                            setEditingPrice(false);
                            setPriceInput("");
                          },
                        });
                      } else {
                        setEditingPrice(true);
                        setPriceInput(String(space?.price || ""));
                      }
                    }}
                  />
                </div>
                {editingPrice && (
                  <form
                    className="flex items-center gap-1"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const price = parseFloat(priceInput);
                      if (price > 0) {
                        updateSpace.mutate({ is_free: false, price }, {
                          onSuccess: () => {
                            toast({ title: `Set to $${price}/mo 💰` });
                            setEditingPrice(false);
                          },
                          onError: () => {
                            toast({ title: "Failed to update price", variant: "destructive" });
                          },
                        });
                      } else {
                        toast({ title: "Enter a price greater than 0", variant: "destructive" });
                      }
                    }}
                  >
                    <span className="text-xs text-muted-foreground">$</span>
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      placeholder="49"
                      value={priceInput}
                      onChange={(e) => setPriceInput(e.target.value)}
                      className="w-16 h-7 text-xs"
                      autoFocus
                    />
                    <Button type="submit" size="sm" variant="ghost" className="h-7 px-2 text-xs">
                      {updateSpace.isPending ? "…" : "✓"}
                    </Button>
                  </form>
                )}
              </div>
            ) : (
              <>
                <Tag className="w-4 h-4" />
                <span>{isFree ? "Free" : `$${space?.price || 0}/mo`}</span>
              </>
            )}
          </div>
          {/* Creator */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {avatar ? (
              <img src={avatar} alt="" className="w-5 h-5 rounded-full object-cover" />
            ) : (
              <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                {spaceName.charAt(0)}
              </div>
            )}
            <span className="truncate">By {creatorProfile?.display_name || "Creator"}</span>
            <Star className="w-3.5 h-3.5 text-warning flex-shrink-0" />
          </div>
        </div>
      </div>

      {/* Join Button */}
      {!isOwner && user && (
        <div className="px-4 mb-5">
          {isMember ? (
            <div className="flex items-center gap-2 text-sm text-primary">
              <CheckCircle className="w-4 h-4" /> Member
            </div>
          ) : (
            <Button onClick={handleJoin} className="w-full font-semibold" size="lg">
              Join Community
            </Button>
          )}
        </div>
      )}

      {/* Separator */}
      <div className="mx-4 border-t border-border mb-5" />

      {/* Description / Bio — editable for owner */}
      <div className="px-4">
        {editingDesc && isOwner ? (
          <div className="space-y-2">
            <Textarea
              value={descInput}
              onChange={(e) => setDescInput(e.target.value)}
              rows={4}
              className="text-sm resize-none"
              placeholder="Tell people what your community is about…"
              autoFocus
            />
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleSaveDesc} disabled={updateSpace.isPending}>
                {updateSpace.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Check className="w-3.5 h-3.5 mr-1" />}
                Save
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditingDesc(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="group">
            {bio ? (
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {bio}
              </p>
            ) : isOwner ? (
              <p className="text-sm text-muted-foreground/50 italic">
                No description yet. Click to add one.
              </p>
            ) : null}
            {isOwner && (
              <button
                onClick={() => { setDescInput(bio); setEditingDesc(true); }}
                className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Pencil className="w-3 h-3" />
                {bio ? "Edit description" : "Add description"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
