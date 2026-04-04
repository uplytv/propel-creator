import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GraduationCap, X, ChevronDown, Plus, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useClassroomModules, useCreateModule, useCreateLesson } from "@/hooks/useClassroom";
import { toast } from "sonner";
import { Sentry } from "@/lib/sentry";

interface StreamToCourseDialogProps {
  open: boolean;
  onClose: () => void;
  creatorId: string;
  streamTitle: string;
  muxAssetId?: string;
  videoUrl?: string;
  durationSeconds: number;
}

export default function StreamToCourseDialog({
  open,
  onClose,
  creatorId,
  streamTitle,
  muxAssetId,
  videoUrl,
  durationSeconds,
}: StreamToCourseDialogProps) {
  const { data: modules, isLoading: modulesLoading } = useClassroomModules(creatorId);
  const createModule = useCreateModule();
  const createLesson = useCreateLesson();

  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [lessonTitle, setLessonTitle] = useState(streamTitle);
  const [newModuleName, setNewModuleName] = useState("");
  const [showNewModule, setShowNewModule] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    let moduleId = selectedModuleId;

    if (showNewModule && newModuleName.trim()) {
      setIsSaving(true);
      try {
        const newModule = await createModule.mutateAsync({
          title: newModuleName.trim(),
          description: "Created from live stream",
          creatorId,
        });
        moduleId = newModule?.id || null;
      } catch (err: any) {
        Sentry.captureException(err, { tags: { context: "stream_to_course" } });
        toast.error("Failed to create module", { description: err?.message || "Unknown error" });
        setIsSaving(false);
        return;
      }
    }

    if (!moduleId) {
      toast.error("Select or create a module first");
      return;
    }

    setIsSaving(true);
    try {
      await createLesson.mutateAsync({
        module_id: moduleId,
        creator_id: creatorId,
        title: lessonTitle.trim() || streamTitle,
        description: "Recorded from live stream",
        mux_asset_id: muxAssetId,
        video_url: videoUrl,
        duration_seconds: durationSeconds,
        is_free: false,
      });
      toast.success("Lesson created! 🎓", { description: "Your stream is now a course lesson." });
      onClose();
    } catch (err: any) {
      toast.error("Failed to create lesson", { description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 60, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 60, scale: 0.95 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden mb-16 sm:mb-0"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative p-6 pb-4 bg-gradient-to-br from-primary/10 to-primary/5">
            <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Turn this into a lesson?</h3>
                <p className="text-xs text-muted-foreground">One tap. Zero extra work.</p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            {/* Lesson Title */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Lesson Title</label>
              <input
                type="text"
                value={lessonTitle}
                onChange={(e) => setLessonTitle(e.target.value)}
                className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
                placeholder="Lesson title"
              />
            </div>

            {/* Module Selector */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Add to Module</label>
              {modulesLoading ? (
                <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading modules…
                </div>
              ) : !showNewModule ? (
                <div className="space-y-1.5">
                  {(modules || []).map((m: any) => (
                    <button
                      key={m.id}
                      onClick={() => setSelectedModuleId(m.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all border ${
                        selectedModuleId === m.id
                          ? "border-primary/40 bg-primary/5"
                          : "border-border hover:border-primary/20 hover:bg-secondary/30"
                      }`}
                    >
                      <GraduationCap className={`w-4 h-4 flex-shrink-0 ${selectedModuleId === m.id ? "text-primary" : "text-muted-foreground"}`} />
                      <span className="text-sm font-medium text-foreground truncate">{m.title}</span>
                    </button>
                  ))}
                  <button
                    onClick={() => setShowNewModule(true)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl text-left border border-dashed border-border hover:border-primary/30 hover:bg-primary/5 transition-all"
                  >
                    <Plus className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-primary">Create new module</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={newModuleName}
                    onChange={(e) => setNewModuleName(e.target.value)}
                    placeholder="Module name"
                    className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
                    autoFocus
                  />
                  <button onClick={() => setShowNewModule(false)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                    ← Pick existing module
                  </button>
                </div>
              )}
            </div>

            {/* Duration info */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Duration: {Math.floor(durationSeconds / 60)}m {durationSeconds % 60}s</span>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 pt-0 flex gap-3">
            <Button variant="ghost" size="sm" onClick={onClose} className="flex-1" disabled={isSaving}>
              Skip
            </Button>
            <Button
              variant="hero"
              size="sm"
              onClick={handleSave}
              disabled={isSaving || (!selectedModuleId && !(showNewModule && newModuleName.trim()))}
              className="flex-1"
            >
              {isSaving ? (
                <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Saving…</>
              ) : (
                <><GraduationCap className="w-4 h-4 mr-1.5" /> Make it a lesson</>
              )}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
