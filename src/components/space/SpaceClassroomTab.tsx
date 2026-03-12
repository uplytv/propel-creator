import { useState, useCallback } from "react";
import { ChevronDown, ChevronRight, CheckCircle, Lock, Play, Plus, ArrowLeft, ArrowRight, GripVertical, Trash2, Pencil, Loader2, AlertCircle, BookOpen, Clock, Layers, ImagePlus, Menu } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { UPLYMuxPlayer } from "@/components/MuxPlayer";
import { useAuth } from "@/context/AuthContext";
import { useClassroomModules, useClassroomLessons, useLessonCompletions, useCompleteLesson, useCreateModule, useCreateLesson, useReorderModules, useReorderLessons, useDeleteModule, useDeleteLesson, useUpdateModule, useUpdateLesson } from "@/hooks/useClassroom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Props {
  creatorId: string;
  isOwner: boolean;
}

/* ── Sortable wrappers ── */
function SortableModule({ mod, children, isOwner }: { mod: any; children: React.ReactNode; isOwner: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: mod.id, disabled: !isOwner });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div className="flex items-center">
        {isOwner && (
          <div {...listeners} className="px-1.5 cursor-grab active:cursor-grabbing touch-none" style={{ color: "#555" }}>
            <GripVertical className="w-3.5 h-3.5" />
          </div>
        )}
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}

function SortableLesson({ lesson, children, isOwner }: { lesson: any; children: React.ReactNode; isOwner: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: lesson.id, disabled: !isOwner });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div ref={setNodeRef} style={style} className="flex items-center" {...attributes}>
      {isOwner && (
        <div {...listeners} className="px-1 cursor-grab active:cursor-grabbing touch-none" style={{ color: "#555" }}>
          <GripVertical className="w-3 h-3" />
        </div>
      )}
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

/* ── Lesson Video Player ── */
function LessonPlayer({ lesson }: { lesson: any }) {
  const { data: playbackId } = useQuery({
    queryKey: ["lesson-playback", lesson.mux_asset_id],
    enabled: !!lesson.mux_asset_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("mux_assets")
        .select("mux_playback_id")
        .eq("mux_asset_id", lesson.mux_asset_id)
        .maybeSingle();
      return data?.mux_playback_id || null;
    },
  });

  if (playbackId) return <UPLYMuxPlayer playbackId={playbackId} title={lesson.title} autoPlay />;
  if (lesson.video_url) {
    return (
      <div className="w-full aspect-video bg-black">
        <video src={lesson.video_url} controls autoPlay playsInline className="w-full h-full object-contain" />
      </div>
    );
  }
  return (
    <div className="w-full aspect-video flex items-center justify-center" style={{ background: "#111" }}>
      <Play className="w-12 h-12" style={{ color: "#555" }} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function SpaceClassroomTab({ creatorId, isOwner }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: modules = [] } = useClassroomModules(creatorId);
  const moduleIds = modules.map((m: any) => m.id);
  const { data: allLessons = [] } = useClassroomLessons(moduleIds);
  const { data: completions = new Set<string>() } = useLessonCompletions(creatorId);
  const completeLesson = useCompleteLesson();
  const reorderModules = useReorderModules();
  const reorderLessons = useReorderLessons();
  const deleteModule = useDeleteModule();
  const deleteLesson = useDeleteLesson();

  const lessonAssetIds = allLessons.filter((l: any) => l.mux_asset_id && l.mux_asset_id !== "").map((l: any) => l.mux_asset_id);
  const { data: assetStatuses = {} } = useQuery({
    queryKey: ["lesson-asset-statuses", lessonAssetIds],
    enabled: lessonAssetIds.length > 0,
    refetchInterval: (query) => {
      const data = query.state.data as Record<string, any> | undefined;
      if (!data) return false;
      return Object.values(data).some((a: any) => a.status === "preparing" || a.status === "pending") ? 15000 : false;
    },
    queryFn: async () => {
      const { data } = await supabase.from("mux_assets").select("mux_asset_id, status, mux_playback_id").in("mux_asset_id", lessonAssetIds);
      const map: Record<string, any> = {};
      (data || []).forEach((a: any) => { map[a.mux_asset_id] = { status: a.status || "preparing", hasPlayback: !!a.mux_playback_id, playbackId: a.mux_playback_id || null }; });
      return map;
    },
  });

  const [expandedModules, setExpandedModules] = useState<Set<string>>(() => new Set(modules.map((m: any) => m.id)));
  const [selectedLesson, setSelectedLesson] = useState<any>(null);
  const [selectedModule, setSelectedModule] = useState<any>(null);
  const [showAddModule, setShowAddModule] = useState(false);
  const [showAddLesson, setShowAddLesson] = useState<string | null>(null);
  const [editingModule, setEditingModule] = useState<any>(null);
  const [editingLesson, setEditingLesson] = useState<any>(null);

  useState(() => {
    if (modules.length > 0 && expandedModules.size === 0) {
      setExpandedModules(new Set(modules.map((m: any) => m.id)));
    }
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const totalLessons = allLessons.length;
  const completedCount = allLessons.filter((l: any) => (completions as Set<string>).has(l.id)).length;
  const progressPct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
  const totalDuration = allLessons.reduce((sum: number, l: any) => sum + (l.duration_seconds || 0), 0);

  const toggleModule = (id: string) => {
    const next = new Set(expandedModules);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpandedModules(next);
  };

  const getLessonsForModule = (moduleId: string) => allLessons.filter((l: any) => l.module_id === moduleId);

  const handleComplete = async (lessonId: string) => {
    try {
      await completeLesson.mutateAsync({ lessonId, creatorId });
      toast({ title: "Lesson completed! 🎉" });
    } catch {
      toast({ title: "Already completed" });
    }
  };

  const handleModuleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = modules.findIndex((m: any) => m.id === active.id);
    const newIndex = modules.findIndex((m: any) => m.id === over.id);
    const reordered = arrayMove(modules, oldIndex, newIndex);
    reorderModules.mutate(reordered.map((m: any, i: number) => ({ id: m.id, position: i })));
  }, [modules, reorderModules]);

  const handleLessonDragEnd = useCallback((moduleId: string) => (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const lessons = getLessonsForModule(moduleId);
    const oldIndex = lessons.findIndex((l: any) => l.id === active.id);
    const newIndex = lessons.findIndex((l: any) => l.id === over.id);
    const reordered = arrayMove(lessons, oldIndex, newIndex);
    reorderLessons.mutate(reordered.map((l: any, i: number) => ({ id: l.id, position: i })));
  }, [allLessons, reorderLessons]);

  const currentLessonIdx = selectedLesson ? allLessons.findIndex((l: any) => l.id === selectedLesson.id) : -1;
  const prevLesson = currentLessonIdx > 0 ? allLessons[currentLessonIdx - 1] : null;
  const nextLesson = currentLessonIdx < allLessons.length - 1 ? allLessons[currentLessonIdx + 1] : null;

  const formatDuration = (seconds: number) => {
    if (!seconds) return "";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const formatTotalDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  // Cover image upload for modules
  const handleModuleCoverUpload = async (moduleId: string, file: File) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      if (!session?.user?.id) return;
      const ext = file.name.split(".").pop()?.toLowerCase()?.replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `${session.user.id}/module-${moduleId}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("covers").upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("covers").getPublicUrl(path);
      await supabase.from("classroom_modules").update({ cover_image_url: urlData.publicUrl } as any).eq("id", moduleId);
      queryClient.invalidateQueries({ queryKey: ["classroom-modules"] });
      toast({ title: "Cover image updated!" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    }
  };

  /* ═══ MOBILE: Skool-style 3-level navigation ═══ */

  // Level 3: Lesson view (Skool-style with ← Menu / Next →)
  if (isMobile && selectedLesson) {
    return (
      <div className="min-h-[60vh]">
        {/* Video player */}
        <LessonPlayer lesson={selectedLesson} />

        {/* ← Menu / Next → bar */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid hsl(var(--border))" }}>
          <button
            onClick={() => {
              setSelectedLesson(null);
              // Go back to module view
            }}
            className="flex items-center gap-1.5 text-sm font-medium text-primary"
          >
            <ArrowLeft className="w-4 h-4" /> Menu
          </button>
          <button
            onClick={() => nextLesson && setSelectedLesson(nextLesson)}
            disabled={!nextLesson}
            className="flex items-center gap-1.5 text-sm font-medium"
            style={{ color: nextLesson ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }}
          >
            Next <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Lesson content */}
        <div className="px-4 py-5 space-y-4">
          <h1 className="text-xl font-bold text-foreground">{selectedLesson.title}</h1>

          {selectedLesson.description && (
            <div className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
              {selectedLesson.description}
            </div>
          )}

          {/* Complete button */}
          {user && !(completions as Set<string>).has(selectedLesson.id) ? (
            <Button onClick={() => handleComplete(selectedLesson.id)} className="w-full font-semibold" style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>
              <CheckCircle className="w-4 h-4 mr-2" /> Mark Complete
            </Button>
          ) : (completions as Set<string>).has(selectedLesson.id) ? (
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <CheckCircle className="w-4 h-4" /> Completed
            </div>
          ) : null}
        </div>

        {/* Dialogs */}
        {editingLesson && <EditLessonDialog open={!!editingLesson} onClose={() => setEditingLesson(null)} lesson={editingLesson} />}
      </div>
    );
  }

  // Level 2: Module detail (Skool-style lesson list)
  if (isMobile && selectedModule) {
    const moduleLessons = getLessonsForModule(selectedModule.id);
    const modCompletedCount = moduleLessons.filter((l: any) => (completions as Set<string>).has(l.id)).length;
    const modProgressPct = moduleLessons.length > 0 ? Math.round((modCompletedCount / moduleLessons.length) * 100) : 0;

    return (
      <div className="min-h-[60vh]">
        {/* Module header */}
        <div className="px-4 pt-4 pb-3" style={{ borderBottom: "1px solid hsl(var(--border))" }}>
          <button
            onClick={() => setSelectedModule(null)}
            className="flex items-center gap-1.5 text-sm font-medium text-primary mb-3"
          >
            <ArrowLeft className="w-4 h-4" /> All Courses
          </button>
          <h1 className="text-xl font-bold text-foreground mb-3">{selectedModule.title}</h1>

          {/* Progress bar */}
          <div className="mb-1">
            <div className="h-2.5 rounded-full overflow-hidden bg-secondary">
              <div
                className="h-full rounded-full transition-all duration-500 bg-muted-foreground/30"
                style={{ width: `${modProgressPct}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">{modProgressPct}%</p>
          </div>
        </div>

        {/* Lesson list — simple text like Skool */}
        <div className="divide-y divide-border">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleLessonDragEnd(selectedModule.id)}>
            <SortableContext items={moduleLessons.map((l: any) => l.id)} strategy={verticalListSortingStrategy}>
              {moduleLessons.map((lesson: any) => {
                const isComplete = (completions as Set<string>).has(lesson.id);
                return (
                  <SortableLesson key={lesson.id} lesson={lesson} isOwner={isOwner}>
                    <div className="flex items-center">
                      <button
                        onClick={() => setSelectedLesson(lesson)}
                        className="flex-1 text-left px-4 py-4 hover:bg-secondary/50 transition-colors"
                      >
                        <span className={`text-[15px] font-medium ${isComplete ? "text-muted-foreground" : "text-foreground"}`}>
                          {lesson.title}
                        </span>
                      </button>
                      {isOwner && (
                        <div className="flex items-center pr-3 gap-1">
                          <button onClick={() => setEditingLesson(lesson)} className="p-1.5 rounded hover:bg-secondary" >
                            <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button className="p-1.5 rounded hover:bg-secondary"><Trash2 className="w-3.5 h-3.5 text-muted-foreground" /></button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Lesson</AlertDialogTitle>
                                <AlertDialogDescription>Delete "{lesson.title}"?</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => { deleteLesson.mutate(lesson.id); toast({ title: "Lesson deleted" }); }} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </div>
                  </SortableLesson>
                );
              })}
            </SortableContext>
          </DndContext>

          {isOwner && (
            <button onClick={() => setShowAddLesson(selectedModule.id)} className="w-full flex items-center gap-2 px-4 py-4 text-sm font-medium text-primary">
              <Plus className="w-4 h-4" /> Add Lesson
            </button>
          )}
        </div>

        {/* Dialogs */}
        {showAddLesson && <AddLessonDialog open={!!showAddLesson} onClose={() => setShowAddLesson(null)} moduleId={showAddLesson} creatorId={creatorId} />}
        {editingLesson && <EditLessonDialog open={!!editingLesson} onClose={() => setEditingLesson(null)} lesson={editingLesson} />}
      </div>
    );
  }

  // Level 1: Course cards (Skool-style module cards with cover images)
  if (isMobile) {
    return (
      <div className="pb-24">
        {modules.length === 0 ? (
          <div className="p-8 text-center">
            <BookOpen className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-base font-semibold text-foreground mb-1">No courses yet</p>
            <p className="text-sm text-muted-foreground">
              {isOwner ? "Add your first module to get started." : "No content available yet."}
            </p>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleModuleDragEnd}>
            <SortableContext items={modules.map((m: any) => m.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-4 px-0">
                {modules.map((mod: any) => {
                  const lessons = getLessonsForModule(mod.id);
                  const modCompletedCount = lessons.filter((l: any) => (completions as Set<string>).has(l.id)).length;
                  const modProgressPct = lessons.length > 0 ? Math.round((modCompletedCount / lessons.length) * 100) : 0;
                  const coverUrl = (mod as any).cover_image_url;

                  return (
                    <SortableModule key={mod.id} mod={mod} isOwner={isOwner}>
                      <div
                        className="cursor-pointer"
                        onClick={() => setSelectedModule(mod)}
                        style={{ borderBottom: "1px solid hsl(var(--border))" }}
                      >
                        {/* Cover image */}
                        <div className="relative w-full aspect-[16/9] bg-secondary overflow-hidden">
                          {coverUrl ? (
                            <img src={coverUrl} alt={mod.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-secondary to-secondary/50">
                              <BookOpen className="w-12 h-12 text-muted-foreground/30" />
                            </div>
                          )}
                          {/* Owner: upload cover overlay */}
                          {isOwner && !coverUrl && (
                            <label className="absolute inset-0 flex flex-col items-center justify-center gap-1 cursor-pointer bg-background/40" onClick={(e) => e.stopPropagation()}>
                              <ImagePlus className="w-6 h-6 text-foreground/70" />
                              <span className="text-xs text-foreground/70 font-medium">Add cover</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  const file = e.target.files?.[0];
                                  if (file) handleModuleCoverUpload(mod.id, file);
                                }}
                              />
                            </label>
                          )}
                          {isOwner && coverUrl && (
                            <label className="absolute top-2 right-2 p-1.5 rounded-full bg-background/60 backdrop-blur-sm cursor-pointer hover:bg-background/80 transition-colors">
                              <Pencil className="w-3.5 h-3.5 text-foreground" />
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  const file = e.target.files?.[0];
                                  if (file) handleModuleCoverUpload(mod.id, file);
                                }}
                              />
                            </label>
                          )}
                        </div>

                        {/* Module info */}
                        <div className="px-4 py-3 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-base font-bold text-foreground">{mod.title}</h3>
                              {mod.description && (
                                <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{mod.description}</p>
                              )}
                            </div>
                            {isOwner && (
                              <div className="flex items-center gap-0.5 flex-shrink-0">
                                <button onClick={(e) => { e.stopPropagation(); setEditingModule(mod); }} className="p-1.5 rounded hover:bg-secondary">
                                  <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                                </button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <button onClick={(e) => e.stopPropagation()} className="p-1.5 rounded hover:bg-secondary">
                                      <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                                    </button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Module</AlertDialogTitle>
                                      <AlertDialogDescription>Delete "{mod.title}" and all its lessons?</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => { deleteModule.mutate(mod.id); toast({ title: "Module deleted" }); }} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            )}
                          </div>

                          {/* Progress bar */}
                          <div>
                            <div className="h-2 rounded-full overflow-hidden bg-secondary">
                              <div
                                className="h-full rounded-full transition-all duration-500 bg-muted-foreground/30"
                                style={{ width: `${modProgressPct}%` }}
                              />
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{modProgressPct}%</p>
                          </div>
                        </div>
                      </div>
                    </SortableModule>
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {isOwner && (
          <div className="px-4 pt-4">
            <Button onClick={() => setShowAddModule(true)} variant="outline" className="w-full font-semibold">
              <Plus className="w-4 h-4 mr-2" /> Add Module
            </Button>
          </div>
        )}

        {/* Dialogs */}
        <AddModuleDialog open={showAddModule} onClose={() => setShowAddModule(false)} creatorId={creatorId} />
        {showAddLesson && <AddLessonDialog open={!!showAddLesson} onClose={() => setShowAddLesson(null)} moduleId={showAddLesson} creatorId={creatorId} />}
        {editingModule && <EditModuleDialog open={!!editingModule} onClose={() => setEditingModule(null)} module={editingModule} />}
        {editingLesson && <EditLessonDialog open={!!editingLesson} onClose={() => setEditingLesson(null)} lesson={editingLesson} />}
      </div>
    );
  }

  /* ═══ DESKTOP: Two-column layout (unchanged) ═══ */

  const renderSidebar = () => (
    <div className="flex flex-col h-full">
      {totalLessons > 0 && (
        <div className="p-4" style={{ borderBottom: "1px solid #1e1e1e" }}>
          <p className="text-xs font-medium mb-2" style={{ color: "#aaa" }}>
            {completedCount} of {totalLessons} lessons complete
          </p>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "#1e1e1e" }}>
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progressPct}%`, background: "#00FF85" }} />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {modules.length === 0 ? (
          <div className="p-8 text-center">
            <BookOpen className="w-8 h-8 mx-auto mb-2" style={{ color: "#555" }} />
            <p className="text-sm font-medium text-white mb-1">No courses yet</p>
            <p className="text-xs" style={{ color: "#888" }}>
              {isOwner ? "Add your first module to get started." : "No content available yet."}
            </p>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleModuleDragEnd}>
            <SortableContext items={modules.map((m: any) => m.id)} strategy={verticalListSortingStrategy}>
              <div>
                {modules.map((mod: any, idx: number) => {
                  const lessons = getLessonsForModule(mod.id);
                  const modCompleted = lessons.length > 0 && lessons.every((l: any) => (completions as Set<string>).has(l.id));
                  const isExpanded = expandedModules.has(mod.id);

                  return (
                    <SortableModule key={mod.id} mod={mod} isOwner={isOwner}>
                      <div style={{ borderBottom: "1px solid #1e1e1e" }}>
                        <div className="flex items-center">
                          <button onClick={() => toggleModule(mod.id)} className="flex-1 flex items-center gap-2.5 px-3 py-3 text-left hover:bg-white/5 transition-colors">
                            <span className="text-xs font-bold flex-shrink-0 w-5 h-5 rounded flex items-center justify-center" style={{ background: modCompleted ? "#00FF85" : "#1e1e1e", color: modCompleted ? "#0A0A0A" : "#888" }}>
                              {modCompleted ? <CheckCircle className="w-3 h-3" /> : idx + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-white truncate">{mod.title}</p>
                              <p className="text-[11px]" style={{ color: "#666" }}>{lessons.length} lesson{lessons.length !== 1 ? "s" : ""}</p>
                            </div>
                            {isExpanded ? <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: "#666" }} /> : <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "#666" }} />}
                          </button>
                          {isOwner && (
                            <div className="flex items-center pr-2 gap-0.5">
                              <button onClick={() => setEditingModule(mod)} className="p-1.5 rounded hover:bg-white/10" style={{ color: "#666" }}><Pencil className="w-3.5 h-3.5" /></button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <button className="p-1.5 rounded hover:bg-white/10" style={{ color: "#666" }}><Trash2 className="w-3.5 h-3.5" /></button>
                                </AlertDialogTrigger>
                                <AlertDialogContent style={{ background: "#111", border: "1px solid #1e1e1e" }}>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className="text-white">Delete Module</AlertDialogTitle>
                                    <AlertDialogDescription style={{ color: "#888" }}>Delete "{mod.title}" and all its lessons?</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel className="border-0" style={{ background: "#1e1e1e", color: "#fff" }}>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => { deleteModule.mutate(mod.id); toast({ title: "Module deleted" }); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          )}
                        </div>

                        {isExpanded && (
                          <div>
                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleLessonDragEnd(mod.id)}>
                              <SortableContext items={lessons.map((l: any) => l.id)} strategy={verticalListSortingStrategy}>
                                {lessons.map((lesson: any) => {
                                  const isComplete = (completions as Set<string>).has(lesson.id);
                                  const isActive = selectedLesson?.id === lesson.id;
                                  return (
                                    <SortableLesson key={lesson.id} lesson={lesson} isOwner={isOwner}>
                                      <div className="flex items-center">
                                        <button
                                          onClick={() => setSelectedLesson(lesson)}
                                          className="flex-1 flex items-center gap-2.5 pl-10 pr-3 py-2.5 text-left transition-colors hover:bg-white/5"
                                          style={{
                                            borderLeft: isActive ? "3px solid #00FF85" : "3px solid transparent",
                                            background: isActive ? "rgba(0,255,133,0.05)" : undefined,
                                          }}
                                        >
                                          <div className="flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center"
                                            style={{ borderColor: isComplete ? "#00FF85" : "#333", background: isComplete ? "#00FF85" : "transparent" }}
                                          >
                                            {isComplete && <CheckCircle className="w-3 h-3" style={{ color: "#0A0A0A" }} />}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <p className="text-sm truncate" style={{ color: isActive ? "#00FF85" : "#ddd", fontWeight: isActive ? 600 : 400 }}>{lesson.title}</p>
                                            <div className="flex items-center gap-2">
                                              {lesson.duration_seconds > 0 && (
                                                <span className="text-[11px]" style={{ color: "#666" }}>{formatDuration(lesson.duration_seconds)}</span>
                                              )}
                                              {isOwner && lesson.mux_asset_id && (() => {
                                                const asset = (assetStatuses as Record<string, any>)[lesson.mux_asset_id];
                                                const status = asset?.status || (lesson.mux_asset_id === "pending" ? "preparing" : null);
                                                if (!status || status === "ready") return null;
                                                if (status === "preparing" || status === "pending") return (
                                                  <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(255,187,0,0.15)", color: "#FFBB00" }}>
                                                    <Loader2 className="w-2.5 h-2.5 animate-spin" /> Processing
                                                  </span>
                                                );
                                                if (status === "errored") return (
                                                  <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(255,50,50,0.15)", color: "#FF3232" }}>
                                                    <AlertCircle className="w-2.5 h-2.5" /> Error
                                                  </span>
                                                );
                                                return null;
                                              })()}
                                            </div>
                                          </div>
                                          {lesson.is_free === false && <Lock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#555" }} />}
                                        </button>
                                        {isOwner && (
                                          <div className="flex items-center pr-2 gap-0.5">
                                            <button onClick={() => setEditingLesson(lesson)} className="p-1.5 rounded hover:bg-white/10" style={{ color: "#666" }}><Pencil className="w-3 h-3" /></button>
                                            <AlertDialog>
                                              <AlertDialogTrigger asChild>
                                                <button className="p-1.5 rounded hover:bg-white/10" style={{ color: "#666" }}><Trash2 className="w-3 h-3" /></button>
                                              </AlertDialogTrigger>
                                              <AlertDialogContent style={{ background: "#111", border: "1px solid #1e1e1e" }}>
                                                <AlertDialogHeader>
                                                  <AlertDialogTitle className="text-white">Delete Lesson</AlertDialogTitle>
                                                  <AlertDialogDescription style={{ color: "#888" }}>Delete "{lesson.title}"?</AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                  <AlertDialogCancel className="border-0" style={{ background: "#1e1e1e", color: "#fff" }}>Cancel</AlertDialogCancel>
                                                  <AlertDialogAction onClick={() => { deleteLesson.mutate(lesson.id); if (selectedLesson?.id === lesson.id) setSelectedLesson(null); toast({ title: "Lesson deleted" }); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                                                </AlertDialogFooter>
                                              </AlertDialogContent>
                                            </AlertDialog>
                                          </div>
                                        )}
                                      </div>
                                    </SortableLesson>
                                  );
                                })}
                              </SortableContext>
                            </DndContext>
                            {isOwner && (
                              <button onClick={() => setShowAddLesson(mod.id)} className="w-full flex items-center gap-2 pl-10 py-2.5 text-xs font-medium" style={{ color: "#00FF85" }}>
                                <Plus className="w-3 h-3" /> Add Lesson
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </SortableModule>
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {isOwner && (
          <button onClick={() => setShowAddModule(true)} className="w-full flex items-center gap-2 px-4 py-3 text-sm font-semibold hover:bg-white/5 transition-colors" style={{ color: "#00FF85", borderTop: modules.length > 0 ? "1px solid #1e1e1e" : undefined }}>
            <Plus className="w-4 h-4" /> Add Module
          </button>
        )}
      </div>
    </div>
  );

  const renderContent = () => {
    if (!selectedLesson) {
      return (
        <div className="flex items-center justify-center h-full p-6">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center" style={{ background: "rgba(0,255,133,0.1)" }}>
              <BookOpen className="w-8 h-8" style={{ color: "#00FF85" }} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-2">Course Overview</h2>
              <p className="text-sm" style={{ color: "#888" }}>Explore the modules and lessons below to get started.</p>
            </div>
            <div className="flex justify-center gap-6">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Layers className="w-4 h-4" style={{ color: "#00FF85" }} />
                  <span className="text-lg font-bold text-white">{modules.length}</span>
                </div>
                <p className="text-xs" style={{ color: "#888" }}>Modules</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <BookOpen className="w-4 h-4" style={{ color: "#00FF85" }} />
                  <span className="text-lg font-bold text-white">{totalLessons}</span>
                </div>
                <p className="text-xs" style={{ color: "#888" }}>Lessons</p>
              </div>
              {totalDuration > 0 && (
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <Clock className="w-4 h-4" style={{ color: "#00FF85" }} />
                    <span className="text-lg font-bold text-white">{formatTotalDuration(totalDuration)}</span>
                  </div>
                  <p className="text-xs" style={{ color: "#888" }}>Total</p>
                </div>
              )}
            </div>
            {totalLessons > 0 && (
              <Button onClick={() => { const first = allLessons[0]; if (first) setSelectedLesson(first); }} className="font-semibold px-8" style={{ background: "#00FF85", color: "#0A0A0A" }}>
                Start Course
              </Button>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="h-full overflow-y-auto">
        <LessonPlayer lesson={selectedLesson} />
        <div className="p-6 space-y-6">
          <h1 className="text-xl font-bold text-white">{selectedLesson.title}</h1>
          {selectedLesson.description && (
            <div className="text-sm leading-relaxed" style={{ color: "#bbb" }}>
              {selectedLesson.description}
            </div>
          )}
          <div className="flex items-center justify-between pt-4" style={{ borderTop: "1px solid #1e1e1e" }}>
            <button onClick={() => prevLesson && setSelectedLesson(prevLesson)} disabled={!prevLesson} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-white/5" style={{ color: prevLesson ? "#ddd" : "#333" }}>
              <ArrowLeft className="w-4 h-4" /> Previous
            </button>
            {user && !(completions as Set<string>).has(selectedLesson.id) ? (
              <Button onClick={() => handleComplete(selectedLesson.id)} className="font-semibold" style={{ background: "#00FF85", color: "#0A0A0A" }}>
                <CheckCircle className="w-4 h-4 mr-2" /> Mark Complete
              </Button>
            ) : (completions as Set<string>).has(selectedLesson.id) ? (
              <div className="flex items-center gap-2 text-sm font-medium" style={{ color: "#00FF85" }}>
                <CheckCircle className="w-4 h-4" /> Completed
              </div>
            ) : null}
            <button onClick={() => nextLesson && setSelectedLesson(nextLesson)} disabled={!nextLesson} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors" style={{ color: nextLesson ? "#0A0A0A" : "#333", background: nextLesson ? "#00FF85" : "transparent" }}>
              Next Lesson <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="hidden md:flex" style={{ height: "calc(100vh - 120px)" }}>
        <div className="w-[300px] flex-shrink-0 overflow-hidden flex flex-col" style={{ borderRight: "1px solid #1e1e1e", background: "#0A0A0A" }}>
          {renderSidebar()}
        </div>
        <div className="flex-1 overflow-hidden" style={{ background: "#0e0e0e" }}>
          {renderContent()}
        </div>
      </div>

      <AddModuleDialog open={showAddModule} onClose={() => setShowAddModule(false)} creatorId={creatorId} />
      {showAddLesson && <AddLessonDialog open={!!showAddLesson} onClose={() => setShowAddLesson(null)} moduleId={showAddLesson} creatorId={creatorId} />}
      {editingModule && <EditModuleDialog open={!!editingModule} onClose={() => setEditingModule(null)} module={editingModule} />}
      {editingLesson && <EditLessonDialog open={!!editingLesson} onClose={() => setEditingLesson(null)} lesson={editingLesson} />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   DIALOGS
   ═══════════════════════════════════════════════════════════════ */

function AddModuleDialog({ open, onClose, creatorId }: { open: boolean; onClose: () => void; creatorId: string }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const createModule = useCreateModule();
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!title.trim()) return;
    await createModule.mutateAsync({ title, description, creatorId });
    setTitle(""); setDescription("");
    onClose();
    toast({ title: "Module added!" });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="border-0" style={{ background: "#111", color: "#fff" }}>
        <DialogHeader><DialogTitle className="text-white">Add Module</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Module title" value={title} onChange={(e) => setTitle(e.target.value)} className="border-0 text-white placeholder:text-gray-500" style={{ background: "#1e1e1e" }} />
          <Textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} className="border-0 text-white placeholder:text-gray-500" style={{ background: "#1e1e1e" }} />
          <Button onClick={handleSubmit} disabled={!title.trim()} className="w-full font-semibold" style={{ background: "#00FF85", color: "#0A0A0A" }}>Add Module</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddLessonDialog({ open, onClose, moduleId, creatorId }: { open: boolean; onClose: () => void; moduleId: string; creatorId: string }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const createLesson = useCreateLesson();
  const { toast } = useToast();
  const { user } = useAuth();

  const uploadToMux = async (file: File): Promise<string | null> => {
    if (!user) return null;
    const { data, error } = await supabase.functions.invoke("mux-create-upload", {
      body: { title, description, userId: user.id },
    });
    if (error || !data?.uploadUrl) throw new Error(error?.message || "Failed to create upload");
    const xhr = new XMLHttpRequest();
    await new Promise<void>((resolve, reject) => {
      xhr.upload.onprogress = (e) => { if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100)); };
      xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error("Upload failed")));
      xhr.onerror = () => reject(new Error("Upload failed"));
      xhr.open("PUT", data.uploadUrl);
      xhr.send(file);
    });
    return data.uploadId;
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setUploading(true);
    try {
      let uploadId: string | null = null;
      if (videoFile) uploadId = await uploadToMux(videoFile);
      await createLesson.mutateAsync({
        module_id: moduleId, creator_id: creatorId, title, description,
        ...(uploadId ? { mux_asset_id: "pending", video_url: `upload:${uploadId}` } : {}),
      });
      setTitle(""); setDescription(""); setVideoFile(null); setUploadProgress(0);
      onClose();
      toast({ title: videoFile ? "Lesson added! Video is processing..." : "Lesson added!" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setUploading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !uploading) onClose(); }}>
      <DialogContent className="border-0" style={{ background: "#111", color: "#fff" }}>
        <DialogHeader><DialogTitle className="text-white">Add Lesson</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Lesson title" value={title} onChange={(e) => setTitle(e.target.value)} className="border-0 text-white placeholder:text-gray-500" style={{ background: "#1e1e1e" }} />
          <Textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} className="border-0 text-white placeholder:text-gray-500" style={{ background: "#1e1e1e" }} />
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#888" }}>Video (optional)</label>
            {!videoFile ? (
              <label className="flex flex-col items-center justify-center gap-1.5 p-4 rounded-lg cursor-pointer hover:bg-white/5 transition-colors" style={{ border: "1px dashed #333" }}>
                <Play className="w-5 h-5" style={{ color: "#00FF85" }} />
                <span className="text-xs" style={{ color: "#888" }}>Click to select a video file</span>
                <input type="file" accept="video/*" className="hidden" onChange={(e) => setVideoFile(e.target.files?.[0] || null)} />
              </label>
            ) : (
              <div className="flex items-center gap-2 p-2.5 rounded-lg" style={{ background: "#1e1e1e" }}>
                <Play className="w-4 h-4 flex-shrink-0" style={{ color: "#00FF85" }} />
                <span className="text-xs text-white truncate flex-1">{videoFile.name}</span>
                <button onClick={() => setVideoFile(null)} className="text-xs px-2 py-0.5 rounded" style={{ color: "#888" }}>Remove</button>
              </div>
            )}
          </div>
          {uploading && (
            <div className="space-y-1">
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#1e1e1e" }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${uploadProgress}%`, background: "#00FF85" }} />
              </div>
              <p className="text-xs text-center" style={{ color: "#888" }}>Uploading… {uploadProgress}%</p>
            </div>
          )}
          <Button onClick={handleSubmit} disabled={!title.trim() || uploading} className="w-full font-semibold" style={{ background: "#00FF85", color: "#0A0A0A" }}>
            {uploading ? "Uploading…" : "Add Lesson"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditModuleDialog({ open, onClose, module: mod }: { open: boolean; onClose: () => void; module: any }) {
  const [title, setTitle] = useState(mod.title);
  const [description, setDescription] = useState(mod.description || "");
  const updateModule = useUpdateModule();
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!title.trim()) return;
    await updateModule.mutateAsync({ id: mod.id, title, description });
    onClose();
    toast({ title: "Module updated!" });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="border-0" style={{ background: "#111", color: "#fff" }}>
        <DialogHeader><DialogTitle className="text-white">Edit Module</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Module title" value={title} onChange={(e) => setTitle(e.target.value)} className="border-0 text-white placeholder:text-gray-500" style={{ background: "#1e1e1e" }} />
          <Textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} className="border-0 text-white placeholder:text-gray-500" style={{ background: "#1e1e1e" }} />
          <Button onClick={handleSubmit} disabled={!title.trim()} className="w-full font-semibold" style={{ background: "#00FF85", color: "#0A0A0A" }}>Save Changes</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditLessonDialog({ open, onClose, lesson }: { open: boolean; onClose: () => void; lesson: any }) {
  const [title, setTitle] = useState(lesson.title);
  const [description, setDescription] = useState(lesson.description || "");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [removeVideo, setRemoveVideo] = useState(false);
  const updateLesson = useUpdateLesson();
  const { toast } = useToast();
  const { user } = useAuth();

  const hasExistingVideo = !removeVideo && (lesson.mux_asset_id || lesson.video_url);

  const uploadToMux = async (file: File): Promise<string | null> => {
    if (!user) return null;
    const { data, error } = await supabase.functions.invoke("mux-create-upload", {
      body: { title, description, userId: user.id },
    });
    if (error || !data?.uploadUrl) throw new Error(error?.message || "Failed to create upload");
    const xhr = new XMLHttpRequest();
    await new Promise<void>((resolve, reject) => {
      xhr.upload.onprogress = (e) => { if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100)); };
      xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error("Upload failed")));
      xhr.onerror = () => reject(new Error("Upload failed"));
      xhr.open("PUT", data.uploadUrl);
      xhr.send(file);
    });
    return data.uploadId;
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setUploading(true);
    try {
      let updateData: any = { id: lesson.id, title, description };
      if (videoFile) {
        const uploadId = await uploadToMux(videoFile);
        if (uploadId) { updateData.mux_asset_id = "pending"; updateData.video_url = `upload:${uploadId}`; }
      } else if (removeVideo) {
        updateData.mux_asset_id = null; updateData.video_url = null;
      }
      await updateLesson.mutateAsync(updateData);
      onClose();
      toast({ title: videoFile ? "Lesson updated! Video is processing..." : "Lesson updated!" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setUploading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !uploading) onClose(); }}>
      <DialogContent className="border-0" style={{ background: "#111", color: "#fff" }}>
        <DialogHeader><DialogTitle className="text-white">Edit Lesson</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Lesson title" value={title} onChange={(e) => setTitle(e.target.value)} className="border-0 text-white placeholder:text-gray-500" style={{ background: "#1e1e1e" }} />
          <Textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} className="border-0 text-white placeholder:text-gray-500" style={{ background: "#1e1e1e" }} />
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#888" }}>Video</label>
            {videoFile ? (
              <div className="flex items-center gap-2 p-2.5 rounded-lg" style={{ background: "#1e1e1e" }}>
                <Play className="w-4 h-4 flex-shrink-0" style={{ color: "#00FF85" }} />
                <span className="text-xs text-white truncate flex-1">{videoFile.name}</span>
                <button onClick={() => setVideoFile(null)} className="text-xs px-2 py-0.5 rounded" style={{ color: "#888" }}>Remove</button>
              </div>
            ) : hasExistingVideo ? (
              <div className="flex items-center gap-2 p-2.5 rounded-lg" style={{ background: "#1e1e1e" }}>
                <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: "#00FF85" }} />
                <span className="text-xs text-white flex-1">Video attached</span>
                <label className="text-xs px-2 py-0.5 rounded cursor-pointer hover:bg-white/10" style={{ color: "#00FF85" }}>
                  Replace
                  <input type="file" accept="video/*" className="hidden" onChange={(e) => { setVideoFile(e.target.files?.[0] || null); setRemoveVideo(false); }} />
                </label>
                <button onClick={() => { setRemoveVideo(true); setVideoFile(null); }} className="text-xs px-2 py-0.5 rounded" style={{ color: "#FF3232" }}>Remove</button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-1.5 p-4 rounded-lg cursor-pointer hover:bg-white/5 transition-colors" style={{ border: "1px dashed #333" }}>
                <Play className="w-5 h-5" style={{ color: "#00FF85" }} />
                <span className="text-xs" style={{ color: "#888" }}>Click to select a video file</span>
                <input type="file" accept="video/*" className="hidden" onChange={(e) => { setVideoFile(e.target.files?.[0] || null); setRemoveVideo(false); }} />
              </label>
            )}
          </div>
          {uploading && (
            <div className="space-y-1">
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#1e1e1e" }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${uploadProgress}%`, background: "#00FF85" }} />
              </div>
              <p className="text-xs text-center" style={{ color: "#888" }}>Uploading… {uploadProgress}%</p>
            </div>
          )}
          <Button onClick={handleSubmit} disabled={!title.trim() || uploading} className="w-full font-semibold" style={{ background: "#00FF85", color: "#0A0A0A" }}>
            {uploading ? "Uploading…" : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
