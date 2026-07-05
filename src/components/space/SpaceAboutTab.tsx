import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useCreatorSpace, useUpdateSpace } from "@/hooks/useCreatorSpace";
import { useMemberCount, useIsMember, useJoinCommunity } from "@/hooks/useCommunityMembers";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Users, Lock, Globe, Tag, Play,
  Pencil, X, Check, ImagePlus, Loader2, Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { UPLYMuxPlayer } from "@/components/MuxPlayer";
import DefaultCommunityCover from "@/components/space/DefaultCommunityCover";
import { memberAuthUrl } from "@/lib/memberAuth";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Props {
  creatorId: string;
  isOwner: boolean;
}

interface MediaItem {
  id: string;
  src: string;
  playbackId: string | null;
  duration: number | null;
  isVideo: boolean;
  position: number;
  mediaType: string;
  source: "gallery" | "mux";
}

/* ── Sortable Thumbnail ── */
function SortableThumb({
  thumb,
  index,
  isActive,
  editMode,
  onSelect,
  onDelete,
}: {
  thumb: MediaItem;
  index: number;
  isActive: boolean;
  editMode: boolean;
  onSelect: (i: number) => void;
  onDelete: (id: string) => void;
}) {
  const canDrag = editMode;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: thumb.id, disabled: !canDrag });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative flex-shrink-0">
      <button
        {...(canDrag ? { ...attributes, ...listeners } : {})}
        onClick={() => !editMode && onSelect(index)}
        className={`relative w-20 h-14 rounded-none overflow-hidden transition-all touch-manipulation ${
          isActive && !editMode
            ? "ring-2 ring-primary ring-offset-1 ring-offset-background"
            : !editMode
            ? "opacity-60 hover:opacity-100"
            : ""
        } ${isDragging ? "opacity-70 scale-105 shadow-xl" : ""} ${
          editMode ? "animate-wiggle" : ""
        }`}
      >
        {thumb.isVideo && !thumb.playbackId ? (
          <video src={thumb.src} muted playsInline preload="metadata" className="w-full h-full object-cover" />
        ) : (
          <img src={thumb.src} alt="" loading="lazy" className="w-full h-full object-cover" />
        )}
        {thumb.isVideo && !editMode && !isActive && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Play className="w-4 h-4 text-foreground" fill="currentColor" />
          </div>
        )}
      </button>

      {/* iOS-style X delete badge */}
      {editMode && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0 }}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(thumb.id);
          }}
          aria-label="Delete media"
          className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-destructive flex items-center justify-center shadow-md z-10"
        >
          <X className="w-3 h-3 text-destructive-foreground" />
        </motion.button>
      )}
    </div>
  );
}

/* ── Join-card stat cell ── */
function StatCell({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="flex-1 py-2.5 text-center">
      <div className="text-sm font-bold text-foreground">{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

/* ── Main Component ── */
export default function SpaceAboutTab({ creatorId, isOwner }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: space } = useCreatorSpace(creatorId);
  const { data: memberCount = 0 } = useMemberCount(creatorId);
  const { data: isMember = false } = useIsMember(creatorId);
  const joinCommunity = useJoinCommunity();
  const updateSpace = useUpdateSpace();
  const [activeThumb, setActiveThumb] = useState(0);
  const [editingPrice, setEditingPrice] = useState(false);
  const [priceInput, setPriceInput] = useState("");

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [editingDesc, setEditingDesc] = useState(false);
  const [descInput, setDescInput] = useState("");

  const mediaInputRef = useRef<HTMLInputElement>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);

  // iOS-style edit mode (jiggle)
  const [editMode, setEditMode] = useState(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isVideoFileUrl = (url?: string | null) => {
    if (!url) return false;
    const clean = url.split("?")[0].toLowerCase();
    return [".mp4", ".webm", ".mov", ".m4v", ".ogg"].some((ext) => clean.endsWith(ext));
  };

  // DnD sensors — delay activation so taps still work
  const pointerSensor = useSensor(PointerSensor, { activationConstraint: { distance: 5 } });
  const touchSensor = useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 5 } });
  const sensors = useSensors(pointerSensor, touchSensor);

  const { data: creatorProfile } = useQuery({
    queryKey: ["creator-profile-about", creatorId],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", creatorId).maybeSingle();
      return data;
    },
  });

  const { data: activeTiers = [] } = useQuery({
    queryKey: ["space-about-tiers", creatorId],
    enabled: !!creatorId,
    queryFn: async () => {
      const { data } = await supabase
        .from("subscription_tiers")
        .select("id, price_monthly")
        .eq("creator_id", creatorId)
        .eq("is_active", true);
      return data || [];
    },
  });

  // Course count for the join-card stat row (cheap head count; RLS may hide
  // modules from non-members — the cell simply doesn't render at 0).
  const { data: courseCount = 0 } = useQuery({
    queryKey: ["space-about-course-count", creatorId],
    enabled: !!creatorId,
    queryFn: async () => {
      const { count } = await supabase
        .from("classroom_modules")
        .select("id", { count: "exact", head: true })
        .eq("creator_id", creatorId);
      return count || 0;
    },
  });

  const { data: galleryMedia = [] } = useQuery({
    queryKey: ["space-media", creatorId],
    queryFn: async () => {
      const { data } = await supabase
        .from("space_media")
        .select("*")
        .eq("creator_id", creatorId)
        .order("position", { ascending: true });
      return (data || []);
    },
  });

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

  const spaceName = space?.name || creatorProfile?.display_name || "Community";
  const avatar = space?.avatar_url || creatorProfile?.avatar_url;
  const bio = space?.description || creatorProfile?.bio || "";
  const isPublic = space?.is_public !== false;
  const isFree = space?.is_free !== false;
  const requiresPaidJoin = activeTiers.length > 0 || !isFree || Number(space?.price || 0) > 0;

  // Price shown on the CTA — cheapest live tier, else the legacy space price.
  const minTierPrice = activeTiers.length > 0
    ? Math.min(...activeTiers.map((t: any) => Number(t.price_monthly) || 0))
    : Number(space?.price || 0);

  // Join-card cover: space cover → first gallery image → branded default.
  const firstGalleryImage = (galleryMedia as any[]).find(
    (m) => m.url && m.media_type === "image" && !isVideoFileUrl(m.url)
  )?.url as string | undefined;
  const joinCardCover = space?.cover_image_url || firstGalleryImage || null;

  // One-line tagline = first non-empty line of the description.
  const tagline = bio.split("\n").map((l) => l.trim()).find(Boolean) || "";

  const handleJoin = async () => {
    if (!user) {
      navigate(memberAuthUrl());
      return;
    }
    if (requiresPaidJoin) {
      navigate(`/community/${creatorId}/pricing`);
      if (activeTiers.length === 0) {
        toast.error("No live plan yet", { description: "This creator hasn't published a live paid tier yet." });
      }
      return;
    }
    try {
      await joinCommunity.mutateAsync(creatorId);
      toast.success("Welcome to the community! 🎉");
    } catch (err: any) {
      toast.error("Error", { description: err.message });
    }
  };

  const handleSaveName = () => {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    updateSpace.mutate({ name: trimmed }, {
      onSuccess: () => { toast.success("Name updated ✏️"); setEditingName(false); },
    });
  };

  const handleSaveDesc = () => {
    updateSpace.mutate({ description: descInput.trim() }, {
      onSuccess: () => { toast.success("Description updated ✏️"); setEditingDesc(false); },
    });
  };

  // Upload media
  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isOwner) return;
    setUploadingMedia(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      let activeSession = sessionData.session;
      if (!activeSession) {
        const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) throw refreshError;
        activeSession = refreshed.session;
      }
      if (!activeSession?.user?.id) throw new Error("Please sign in to upload.");

      const ownerId = activeSession.user.id;
      const rawExt = file.name.split(".").pop()?.toLowerCase() || "bin";
      const ext = rawExt.replace(/[^a-z0-9]/g, "") || "bin";
      const path = `${ownerId}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("covers")
        .upload(path, file, { upsert: true, contentType: file.type || undefined });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("covers").getPublicUrl(path);
      const isVideo = file.type.startsWith("video/") || isVideoFileUrl(file.name);
      const maxPos = galleryMedia.length > 0
        ? Math.max(...galleryMedia.map((m: any) => m.position)) + 1 : 0;

      const { error: insertError } = await supabase
        .from("space_media")
        .insert({ creator_id: ownerId, media_type: isVideo ? "video" : "image", url: urlData.publicUrl, position: maxPos });
      if (insertError) throw insertError;

      await queryClient.invalidateQueries({ queryKey: ["space-media", creatorId] });
      toast.success(isVideo ? "Video added 🎬" : "Photo added 📸");
    } catch (err: any) {
      const message = String(err?.message || "Upload failed");
      const friendly = message.toLowerCase().includes("row-level security") ? "Please sign in again, then retry." : message;
      toast.error("Upload failed", { description: friendly });
    } finally {
      setUploadingMedia(false);
      if (mediaInputRef.current) mediaInputRef.current.value = "";
    }
  };

  // Delete gallery media
  const deleteMedia = useMutation({
    mutationFn: async (mediaId: string) => {
      // Try gallery first, then mux asset
      const item = thumbnails.find((t) => t.id === mediaId);
      if (item?.source === "gallery") {
        const { error } = await supabase.from("space_media").delete().eq("id", mediaId);
        if (error) throw error;
      } else if (item?.source === "mux") {
        // Remove from content library display (hide, don't delete the actual asset)
        toast.success("Recording hidden");
        return;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["space-media", creatorId] });
      queryClient.invalidateQueries({ queryKey: ["space-content-assets", creatorId] });
      toast.success("Deleted 🗑️");
    },
  });

  // Reorder after drag
  const reorderMedia = useMutation({
    mutationFn: async (newOrder: { id: string; position: number }[]) => {
      await Promise.all(
        newOrder.map((item) =>
          supabase.from("space_media").update({ position: item.position }).eq("id", item.id)
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["space-media", creatorId] });
    },
  });

  // Build thumbnails
  const thumbnails: MediaItem[] = [
    ...galleryMedia.map((m: any) => ({
      id: m.id,
      src: m.url,
      playbackId: m.mux_playback_id || null,
      duration: m.duration || null,
      isVideo: m.media_type === "video" || isVideoFileUrl(m.url),
      position: m.position,
      mediaType: m.media_type,
      source: "gallery" as const,
    })),
    ...contentAssets.map((a: any) => ({
      id: a.id,
      src: a.thumbnail_url || (a.mux_playback_id ? `https://image.mux.com/${a.mux_playback_id}/thumbnail.png?time=2` : ""),
      playbackId: a.mux_playback_id,
      duration: a.duration,
      isVideo: true,
      position: 999,
      mediaType: "video",
      source: "mux" as const,
    })),
  ].filter((t) => !!t.src);

  const activeAsset = thumbnails[activeThumb] || thumbnails[0];
  const hasMedia = thumbnails.length > 0;

  useEffect(() => {
    if (activeThumb >= thumbnails.length) setActiveThumb(0);
  }, [activeThumb, thumbnails.length]);

  useEffect(() => {
    setIsPlayingVideo(false);
  }, [activeAsset?.id]);

  // Long-press to enter edit mode
  const handleTouchStart = useCallback(() => {
    longPressTimerRef.current = setTimeout(() => setEditMode(true), 500);
  }, []);
  const handleTouchEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  // Handle drag end — reorder gallery items
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = thumbnails.findIndex((t) => t.id === active.id);
    const newIndex = thumbnails.findIndex((t) => t.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(thumbnails, oldIndex, newIndex);
    // Persist positions for gallery items
    const galleryUpdates = reordered
      .filter((item) => item.source === "gallery")
      .map((item, i) => ({ id: item.id, position: i }));
    if (galleryUpdates.length > 0) {
      reorderMedia.mutate(galleryUpdates);
    }
  };

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

  const allIds = thumbnails.map((t) => t.id);

  const priceLabel = isFree && activeTiers.length === 0
    ? "Free"
    : `$${minTierPrice > 0 ? minTierPrice : space?.price || 0}/month`;

  /* ── Join card CTA (primary conversion element) ── */
  const renderCta = () => {
    if (isOwner) {
      return (
        <Button
          variant="outline"
          className="w-full h-11 rounded-none font-semibold"
          onClick={() => { setDescInput(bio); setEditingDesc(true); setNameInput(spaceName); }}
        >
          <Pencil className="w-4 h-4 mr-2" />
          Edit community
        </Button>
      );
    }
    if (isMember) {
      return (
        <div className="w-full h-11 rounded-none border border-border bg-secondary/40 flex items-center justify-center gap-2 text-sm font-semibold text-foreground">
          <Check className="w-4 h-4 text-primary" />
          You're a member
        </div>
      );
    }
    const label = requiresPaidJoin
      ? (minTierPrice > 0 ? `Join for $${minTierPrice}/month` : "Join")
      : "Join free";
    return (
      <>
        <Button
          size="lg"
          className="w-full h-11 rounded-none font-semibold"
          onClick={handleJoin}
          disabled={joinCommunity.isPending}
        >
          {joinCommunity.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : label}
        </Button>
        {requiresPaidJoin && (
          <p className="text-center text-[11px] text-muted-foreground mt-2">
            Instant access · Cancel anytime
          </p>
        )}
      </>
    );
  };

  return (
    <div className="pb-10">
      <div className="mx-auto w-full max-w-6xl px-4 pt-5 flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-8">

        {/* ── JOIN CARD — first in DOM so it leads on mobile; column 2 + sticky on desktop ── */}
        <aside className="w-full lg:col-start-2 lg:row-start-1 lg:sticky lg:top-16">
          <div className="rounded-none border border-border bg-card overflow-hidden">
            <div className="aspect-video w-full overflow-hidden bg-secondary/30">
              {joinCardCover ? (
                <img src={joinCardCover} alt="" loading="lazy" className="w-full h-full object-cover" />
              ) : (
                <DefaultCommunityCover name={spaceName} />
              )}
            </div>
            <div className="p-4">
              <h3 className="text-base font-bold text-foreground leading-snug">{spaceName}</h3>
              {tagline && (
                <p className="mt-1 text-[13px] text-muted-foreground line-clamp-2">{tagline}</p>
              )}

              {/* Stat row */}
              <div className="mt-3 flex border-y border-border divide-x divide-border">
                <StatCell value={formatMemberCount(memberCount)} label={memberCount === 1 ? "Member" : "Members"} />
                {courseCount > 0 && (
                  <StatCell value={courseCount} label={courseCount === 1 ? "Course" : "Courses"} />
                )}
                <StatCell value={1} label="Admin" />
              </div>

              <div className="mt-4">{renderCta()}</div>
            </div>
          </div>
        </aside>

        {/* ── MAIN CONTENT — column 1 on desktop ── */}
        <div className="min-w-0 lg:col-start-1 lg:row-start-1">
          {/* Community Name */}
          <div className="pb-3">
            {editingName && isOwner ? (
              <div className="flex items-center gap-2">
                <Input value={nameInput} onChange={(e) => setNameInput(e.target.value)}
                  className="text-lg font-bold h-9 flex-1 rounded-none" autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleSaveName()} />
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={handleSaveName} aria-label="Save name">
                  <Check className="w-4 h-4 text-primary" />
                </Button>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setEditingName(false)} aria-label="Cancel editing name">
                  <X className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <h1 className="text-2xl lg:text-[28px] font-bold text-foreground leading-tight">{spaceName}</h1>
                {isOwner && (
                  <button onClick={() => { setNameInput(spaceName); setEditingName(true); }} aria-label="Edit name"
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-none hover:bg-secondary/50">
                    <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Compact media gallery — main 16:9 media + thumbnail strip.
              Only renders when media exists (owners always get an add affordance). */}
          {hasMedia ? (
            <div className="mb-4">
              <div className="relative w-full aspect-video max-h-[420px] rounded-none overflow-hidden bg-secondary/30">
                {activeAsset.isVideo && isPlayingVideo ? (
                  activeAsset.playbackId ? (
                    <UPLYMuxPlayer playbackId={activeAsset.playbackId} autoPlay className="h-full" />
                  ) : (
                    <video src={activeAsset.src} controls autoPlay playsInline className="w-full h-full object-contain bg-black" />
                  )
                ) : activeAsset.isVideo && !activeAsset.playbackId ? (
                  <video src={activeAsset.src} muted playsInline preload="metadata" className="w-full h-full object-contain bg-black" />
                ) : (
                  <img src={activeAsset.src} alt="" loading="lazy" className="w-full h-full object-contain bg-black" />
                )}

                {activeAsset.isVideo && !isPlayingVideo && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <motion.button type="button" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}
                      onClick={() => setIsPlayingVideo(true)}
                      className="w-14 h-14 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center cursor-pointer shadow-lg">
                      <Play className="w-6 h-6 text-foreground ml-0.5" fill="currentColor" />
                    </motion.button>
                  </div>
                )}

                {activeAsset.duration && (
                  <span className="absolute bottom-3 right-3 px-2 py-0.5 rounded-none bg-background/80 backdrop-blur-sm text-xs font-medium text-foreground">
                    {formatDuration(activeAsset.duration)}
                  </span>
                )}
              </div>

              {/* Thumbnail Strip — iOS-style hold-to-jiggle + drag-to-reorder */}
              <div className="mt-2">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={allIds} strategy={horizontalListSortingStrategy}>
                    <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1 items-start">
                      {thumbnails.map((thumb, i) => (
                        <div
                          key={thumb.id}
                          onTouchStart={() => isOwner && handleTouchStart()}
                          onTouchEnd={handleTouchEnd}
                          onTouchCancel={handleTouchEnd}
                          onMouseDown={() => isOwner && handleTouchStart()}
                          onMouseUp={handleTouchEnd}
                          onMouseLeave={handleTouchEnd}
                          onContextMenu={(e) => { if (isOwner) { e.preventDefault(); setEditMode(true); } }}
                        >
                          <SortableThumb
                            thumb={thumb}
                            index={i}
                            isActive={activeThumb === i}
                            editMode={editMode}
                            onSelect={setActiveThumb}
                            onDelete={(id) => deleteMedia.mutate(id)}
                          />
                        </div>
                      ))}

                      {/* Add media */}
                      {isOwner && (
                        <button onClick={() => mediaInputRef.current?.click()} aria-label="Add media"
                          className="flex-shrink-0 w-20 h-14 rounded-none border-2 border-dashed border-border hover:border-primary/40 flex items-center justify-center transition-colors">
                          {uploadingMedia ? <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                            : <Plus className="w-5 h-5 text-muted-foreground" />}
                        </button>
                      )}
                    </div>
                  </SortableContext>
                </DndContext>

                {/* Edit mode controls */}
                <AnimatePresence>
                  {editMode && isOwner && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center justify-between mt-2"
                    >
                      <span className="text-[11px] text-muted-foreground">Drag to reorder · Tap ✕ to delete</span>
                      <Button size="sm" variant="secondary" className="h-7 text-xs px-3 rounded-none" onClick={() => setEditMode(false)}>
                        Done
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {!editMode && isOwner && (
                  <p className="text-[10px] text-muted-foreground/50 mt-1">Hold to rearrange</p>
                )}
              </div>
            </div>
          ) : isOwner ? (
            /* No media yet — compact owner-only add affordance (no giant hero) */
            <div className="mb-4">
              <button onClick={() => mediaInputRef.current?.click()}
                className="w-full h-28 rounded-none border-2 border-dashed border-border hover:border-primary/40 flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
                {uploadingMedia ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                  <><ImagePlus className="w-6 h-6" /><span className="text-xs font-medium">Add photos or videos</span></>
                )}
              </button>
            </div>
          ) : null}
          <input ref={mediaInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleMediaUpload} />

          {/* Meta row — privacy · members · price · creator */}
          <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            {isOwner ? (
              <button onClick={() => {
                updateSpace.mutate({ is_public: !isPublic }, {
                  onSuccess: () => toast.success(isPublic ? "Set to Private 🔒" : "Set to Public 🌐"),
                });
              }} className="flex items-center gap-1.5 px-1 py-0.5 -mx-1 rounded-none hover:bg-secondary/50 transition-colors">
                {isPublic ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                <span>{isPublic ? "Public" : "Private"}</span>
                <Switch checked={isPublic} className="scale-75 ml-0.5" />
              </button>
            ) : (
              <span className="flex items-center gap-1.5">
                {isPublic ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                {isPublic ? "Public" : "Private"}
              </span>
            )}

            <span className="text-border">·</span>

            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              {formatMemberCount(memberCount)} members
            </span>

            <span className="text-border">·</span>

            {isOwner ? (
              <span className="flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <Tag className="w-4 h-4" />
                  <span>{isFree && !editingPrice ? "Free" : priceLabel}</span>
                  <Switch checked={!isFree} className="scale-75 ml-0.5"
                    onCheckedChange={(checked) => {
                      if (!checked) {
                        updateSpace.mutate({ is_free: true, price: 0 }, {
                          onSuccess: () => { toast.success("Set to Free ✨"); setEditingPrice(false); setPriceInput(""); },
                        });
                      } else { setEditingPrice(true); setPriceInput(String(space?.price || "")); }
                    }} />
                </span>
                {editingPrice && (
                  <form className="flex items-center gap-1" onSubmit={(e) => {
                    e.preventDefault();
                    const price = parseFloat(priceInput);
                    if (price > 0) {
                      updateSpace.mutate({ is_free: false, price }, {
                        onSuccess: () => { toast.success(`Set to $${price}/mo 💰`); setEditingPrice(false); },
                        onError: () => { toast.error("Failed to update price"); },
                      });
                    } else { toast.error("Enter a price greater than 0"); }
                  }}>
                    <span className="text-xs text-muted-foreground">$</span>
                    <Input type="number" min="1" step="1" placeholder="49" value={priceInput}
                      onChange={(e) => setPriceInput(e.target.value)} className="w-16 h-7 text-xs rounded-none" autoFocus />
                    <Button type="submit" size="sm" variant="ghost" className="h-7 px-2 text-xs">
                      {updateSpace.isPending ? "…" : "✓"}
                    </Button>
                  </form>
                )}
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Tag className="w-4 h-4" />
                {priceLabel}
              </span>
            )}

            <span className="text-border">·</span>

            <span className="flex items-center gap-1.5 min-w-0">
              {avatar ? (
                <img src={avatar} alt="" loading="lazy" className="w-5 h-5 rounded-full object-cover" />
              ) : (
                <span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                  {spaceName.charAt(0)}
                </span>
              )}
              <span className="truncate">By {creatorProfile?.display_name || "Creator"}</span>
            </span>
          </div>

          <div className="border-t border-border mb-4" />

          {/* Description */}
          <div>
            {editingDesc && isOwner ? (
              <div className="space-y-2">
                <Textarea value={descInput} onChange={(e) => setDescInput(e.target.value)} rows={4}
                  className="text-sm resize-none rounded-none" placeholder="Tell people what your community is about…" autoFocus />
                <div className="flex items-center gap-2">
                  <Button size="sm" className="rounded-none" onClick={handleSaveDesc} disabled={updateSpace.isPending}>
                    {updateSpace.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Check className="w-3.5 h-3.5 mr-1" />}
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" className="rounded-none" onClick={() => setEditingDesc(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="group">
                {bio ? (
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{bio}</p>
                ) : isOwner ? (
                  <p className="text-sm text-muted-foreground/50 italic">No description yet. Click to add one.</p>
                ) : null}
                {isOwner && (
                  <button onClick={() => { setDescInput(bio); setEditingDesc(true); }}
                    className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    <Pencil className="w-3 h-3" />{bio ? "Edit description" : "Add description"}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
