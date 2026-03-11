import { useState, useCallback } from "react";
import { ChevronDown, ChevronRight, CheckCircle, Lock, Play, Plus, ArrowLeft, ArrowRight, GripVertical, Trash2, Pencil } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
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

function SortableModule({ mod, children, isOwner }: { mod: any; children: React.ReactNode; isOwner: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: mod.id, disabled: !isOwner });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    background: "#111111",
    border: "1px solid #1e1e1e",
  };
  return (
    <div ref={setNodeRef} style={style} className="rounded-lg overflow-hidden" {...attributes}>
      <div className="flex items-center">
        {isOwner && (
          <div {...listeners} className="px-2 cursor-grab active:cursor-grabbing touch-none" style={{ color: "#888" }}>
            <GripVertical className="w-4 h-4" />
          </div>
        )}
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}

function SortableLesson({ lesson, children, isOwner }: { lesson: any; children: React.ReactNode; isOwner: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: lesson.id, disabled: !isOwner });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className="flex items-center" {...attributes}>
      {isOwner && (
        <div {...listeners} className="px-2 cursor-grab active:cursor-grabbing touch-none" style={{ color: "#888" }}>
          <GripVertical className="w-3 h-3" />
        </div>
      )}
      <div className="flex-1">{children}</div>
    </div>
  );
}

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

  if (playbackId) {
    return <UPLYMuxPlayer playbackId={playbackId} title={lesson.title} autoPlay />;
  }

  if (lesson.video_url) {
    return (
      <div className="w-full aspect-video bg-black">
        <video src={lesson.video_url} controls autoPlay playsInline className="w-full h-full object-contain" />
      </div>
    );
  }

  return (
    <div className="w-full aspect-video flex items-center justify-center" style={{ background: "#111111" }}>
      <Play className="w-12 h-12" style={{ color: "#888" }} />
    </div>
  );
}

export default function SpaceClassroomTab({ creatorId, isOwner }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: modules = [] } = useClassroomModules(creatorId);
  const moduleIds = modules.map((m: any) => m.id);
  const { data: allLessons = [] } = useClassroomLessons(moduleIds);
  const { data: completions = new Set<string>() } = useLessonCompletions(creatorId);
  const completeLesson = useCompleteLesson();
  const reorderModules = useReorderModules();
  const reorderLessons = useReorderLessons();
  const deleteModule = useDeleteModule();
  const deleteLesson = useDeleteLesson();

  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [selectedLesson, setSelectedLesson] = useState<any>(null);
  const [showAddModule, setShowAddModule] = useState(false);
  const [showAddLesson, setShowAddLesson] = useState<string | null>(null);
  const [editingModule, setEditingModule] = useState<any>(null);
  const [editingLesson, setEditingLesson] = useState<any>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const totalLessons = allLessons.length;
  const completedCount = allLessons.filter((l: any) => (completions as Set<string>).has(l.id)).length;
  const progressPct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  const toggleModule = (id: string) => {
    const next = new Set(expandedModules);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpandedModules(next);
  };

  const getLessonsForModule = (moduleId: string) =>
    allLessons.filter((l: any) => l.module_id === moduleId);

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
    const updates = reordered.map((m: any, i: number) => ({ id: m.id, position: i }));
    reorderModules.mutate(updates);
  }, [modules, reorderModules]);

  const handleLessonDragEnd = useCallback((moduleId: string) => (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const lessons = getLessonsForModule(moduleId);
    const oldIndex = lessons.findIndex((l: any) => l.id === active.id);
    const newIndex = lessons.findIndex((l: any) => l.id === over.id);
    const reordered = arrayMove(lessons, oldIndex, newIndex);
    const updates = reordered.map((l: any, i: number) => ({ id: l.id, position: i }));
    reorderLessons.mutate(updates);
  }, [allLessons, reorderLessons]);

  const currentLessonIdx = selectedLesson ? allLessons.findIndex((l: any) => l.id === selectedLesson.id) : -1;
  const prevLesson = currentLessonIdx > 0 ? allLessons[currentLessonIdx - 1] : null;
  const nextLesson = currentLessonIdx < allLessons.length - 1 ? allLessons[currentLessonIdx + 1] : null;

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Lesson Player View
  if (selectedLesson) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "#0A0A0A" }}>
        <div className="flex items-center gap-3 p-4" style={{ borderBottom: "1px solid #1e1e1e" }}>
          <button onClick={() => setSelectedLesson(null)}><ArrowLeft className="w-5 h-5 text-white" /></button>
          <span className="text-sm font-semibold text-white truncate">{selectedLesson.title}</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          <LessonPlayer lesson={selectedLesson} />
          <div className="p-4">
            <h2 className="text-lg font-bold text-white mb-2">{selectedLesson.title}</h2>
            <p className="text-sm mb-4" style={{ color: "#ccc" }}>{selectedLesson.description}</p>
            {user && !(completions as Set<string>).has(selectedLesson.id) && (
              <Button onClick={() => handleComplete(selectedLesson.id)} className="w-full font-semibold mb-4" style={{ background: "#00FF85", color: "#0A0A0A" }}>
                <CheckCircle className="w-4 h-4 mr-2" /> Mark as Complete
              </Button>
            )}
            {(completions as Set<string>).has(selectedLesson.id) && (
              <div className="flex items-center gap-2 mb-4 text-sm" style={{ color: "#00FF85" }}>
                <CheckCircle className="w-4 h-4" /> Completed
              </div>
            )}
            <div className="flex justify-between">
              <button onClick={() => prevLesson && setSelectedLesson(prevLesson)} disabled={!prevLesson} className="flex items-center gap-1 text-sm" style={{ color: prevLesson ? "#fff" : "#888" }}>
                <ArrowLeft className="w-4 h-4" /> Previous
              </button>
              <button onClick={() => nextLesson && setSelectedLesson(nextLesson)} disabled={!nextLesson} className="flex items-center gap-1 text-sm" style={{ color: nextLesson ? "#fff" : "#888" }}>
                Next <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-4">
      {/* Progress Bar */}
      {totalLessons > 0 && (
        <div className="mb-4 p-3 rounded-lg" style={{ background: "#111111", border: "1px solid #1e1e1e" }}>
          <p className="text-xs font-medium mb-2 text-white">You've completed {completedCount} of {totalLessons} lessons</p>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "#1e1e1e" }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${progressPct}%`, background: "#00FF85" }} />
          </div>
        </div>
      )}

      {isOwner && (
        <button onClick={() => setShowAddModule(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold mb-4" style={{ border: "1px dashed #1e1e1e", color: "#00FF85" }}>
          <Plus className="w-4 h-4" /> Add Module
        </button>
      )}

      {modules.length === 0 ? (
        <div className="p-12 text-center rounded-lg" style={{ background: "#111111" }}>
          <span className="text-4xl block mb-3">📚</span>
          <p className="font-semibold text-white mb-1">No courses yet</p>
          <p className="text-sm" style={{ color: "#888" }}>
            {isOwner ? "Add your first module to start building your classroom." : "The creator hasn't added any courses yet."}
          </p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleModuleDragEnd}>
          <SortableContext items={modules.map((m: any) => m.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {modules.map((mod: any) => {
                const lessons = getLessonsForModule(mod.id);
                const modCompleted = lessons.length > 0 && lessons.every((l: any) => (completions as Set<string>).has(l.id));
                const isExpanded = expandedModules.has(mod.id);

                return (
                  <SortableModule key={mod.id} mod={mod} isOwner={isOwner}>
                    <div>
                      <div className="flex items-center">
                        <button onClick={() => toggleModule(mod.id)} className="flex-1 flex items-center justify-between p-4">
                          <div className="flex items-center gap-3">
                            {isExpanded ? <ChevronDown className="w-4 h-4 text-white" /> : <ChevronRight className="w-4 h-4 text-white" />}
                            <div className="text-left">
                              <p className="text-sm font-semibold text-white">{mod.title}</p>
                              <p className="text-xs" style={{ color: "#888" }}>{lessons.length} lessons</p>
                            </div>
                          </div>
                          {modCompleted && <CheckCircle className="w-4 h-4" style={{ color: "#00FF85" }} />}
                        </button>
                        {isOwner && (
                          <div className="flex items-center mr-2 gap-1">
                            <button
                              onClick={() => setEditingModule(mod)}
                              className="p-2 rounded hover:bg-white/10 transition-colors"
                              style={{ color: "#888" }}
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <button className="p-2 rounded hover:bg-white/10 transition-colors" style={{ color: "#888" }}>
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </AlertDialogTrigger>
                              <AlertDialogContent style={{ background: "#111111", border: "1px solid #1e1e1e" }}>
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-white">Delete Module</AlertDialogTitle>
                                  <AlertDialogDescription style={{ color: "#888" }}>
                                    This will permanently delete "{mod.title}" and all its lessons. This cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="border-0" style={{ background: "#1e1e1e", color: "#fff" }}>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => { deleteModule.mutate(mod.id); toast({ title: "Module deleted" }); }}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        )}
                      </div>

                      {isExpanded && (
                        <div style={{ borderTop: "1px solid #1e1e1e" }}>
                          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleLessonDragEnd(mod.id)}>
                            <SortableContext items={lessons.map((l: any) => l.id)} strategy={verticalListSortingStrategy}>
                              {lessons.map((lesson: any) => {
                                const isComplete = (completions as Set<string>).has(lesson.id);
                                return (
                                  <SortableLesson key={lesson.id} lesson={lesson} isOwner={isOwner}>
                                    <div className="flex items-center">
                                      <button
                                        onClick={() => setSelectedLesson(lesson)}
                                        className="flex-1 flex items-center gap-3 p-3 text-left hover:bg-white/5 transition-colors"
                                      >
                                        <div className="w-10 h-10 rounded flex items-center justify-center flex-shrink-0" style={{ background: "#1e1e1e" }}>
                                          {lesson.is_free || true ? (
                                            <Play className="w-4 h-4" style={{ color: "#888" }} />
                                          ) : (
                                            <Lock className="w-4 h-4" style={{ color: "#888" }} />
                                          )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium text-white truncate">{lesson.title}</p>
                                          {lesson.duration_seconds > 0 && (
                                            <p className="text-xs" style={{ color: "#888" }}>{formatDuration(lesson.duration_seconds)}</p>
                                          )}
                                        </div>
                                        {isComplete && <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: "#00FF85" }} />}
                                      </button>
                                      {isOwner && (
                                        <div className="flex items-center mr-2 gap-0.5">
                                          <button
                                            onClick={() => setEditingLesson(lesson)}
                                            className="p-2 rounded hover:bg-white/10 transition-colors"
                                            style={{ color: "#888" }}
                                          >
                                            <Pencil className="w-3.5 h-3.5" />
                                          </button>
                                          <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                              <button className="p-2 rounded hover:bg-white/10 transition-colors" style={{ color: "#888" }}>
                                                <Trash2 className="w-3.5 h-3.5" />
                                              </button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent style={{ background: "#111111", border: "1px solid #1e1e1e" }}>
                                              <AlertDialogHeader>
                                                <AlertDialogTitle className="text-white">Delete Lesson</AlertDialogTitle>
                                                <AlertDialogDescription style={{ color: "#888" }}>
                                                  Delete "{lesson.title}"? This cannot be undone.
                                                </AlertDialogDescription>
                                              </AlertDialogHeader>
                                              <AlertDialogFooter>
                                                <AlertDialogCancel className="border-0" style={{ background: "#1e1e1e", color: "#fff" }}>Cancel</AlertDialogCancel>
                                                <AlertDialogAction
                                                  onClick={() => { deleteLesson.mutate(lesson.id); toast({ title: "Lesson deleted" }); }}
                                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                >Delete</AlertDialogAction>
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
                            <button onClick={() => setShowAddLesson(mod.id)} className="w-full flex items-center gap-2 p-3 text-xs" style={{ color: "#00FF85" }}>
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

      <AddModuleDialog open={showAddModule} onClose={() => setShowAddModule(false)} creatorId={creatorId} />
      {showAddLesson && (
        <AddLessonDialog open={!!showAddLesson} onClose={() => setShowAddLesson(null)} moduleId={showAddLesson} creatorId={creatorId} />
      )}
      {editingModule && (
        <EditModuleDialog open={!!editingModule} onClose={() => setEditingModule(null)} module={editingModule} />
      )}
      {editingLesson && (
        <EditLessonDialog open={!!editingLesson} onClose={() => setEditingLesson(null)} lesson={editingLesson} />
      )}
    </div>
  );
}

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
      <DialogContent className="border-0" style={{ background: "#111111", color: "#fff" }}>
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
  const createLesson = useCreateLesson();
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!title.trim()) return;
    await createLesson.mutateAsync({ module_id: moduleId, creator_id: creatorId, title, description });
    setTitle(""); setDescription("");
    onClose();
    toast({ title: "Lesson added!" });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="border-0" style={{ background: "#111111", color: "#fff" }}>
        <DialogHeader><DialogTitle className="text-white">Add Lesson</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Lesson title" value={title} onChange={(e) => setTitle(e.target.value)} className="border-0 text-white placeholder:text-gray-500" style={{ background: "#1e1e1e" }} />
          <Textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} className="border-0 text-white placeholder:text-gray-500" style={{ background: "#1e1e1e" }} />
          <Button onClick={handleSubmit} disabled={!title.trim()} className="w-full font-semibold" style={{ background: "#00FF85", color: "#0A0A0A" }}>Add Lesson</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}