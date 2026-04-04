import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Briefcase, ArrowLeft, Sparkles, Loader2 } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useCreateJob, SKILL_LABELS, SKILL_CATEGORIES, type SkillCategory, useTalentProfiles } from "@/hooks/useJobs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sentry } from "@/lib/sentry";

interface AISuggestion {
  display_name: string;
  skills: string[];
  score: number;
  reason: string;
}

export default function PostJob() {
  const navigate = useNavigate();
  const createJob = useCreateJob();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [skillCategory, setSkillCategory] = useState<SkillCategory | "">("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [timeline, setTimeline] = useState("1 week");
  const [jobType, setJobType] = useState<"one_time" | "ongoing">("one_time");
  const [membersOnly, setMembersOnly] = useState(false);

  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [aiLoading, setAiLoading] = useState(false);

  const { data: allTalent = [] } = useTalentProfiles();

  const handleSubmit = async () => {
    if (!title || !description || !skillCategory || !budgetMin || !budgetMax) {
      toast.error("Please fill in all required fields");
      return;
    }

    await createJob.mutateAsync({
      title,
      description,
      skill_category: skillCategory as SkillCategory,
      budget_min: parseFloat(budgetMin),
      budget_max: parseFloat(budgetMax),
      timeline,
      job_type: jobType,
      members_only: membersOnly,
    });

    navigate("/jobs");
  };

  const fetchAISuggestions = async () => {
    if (!description || !skillCategory) {
      toast.error("Add a description and skill category first");
      return;
    }

    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("match-talent", {
        body: {
          job_description: description,
          skill_category: skillCategory,
          talent_profiles: allTalent.slice(0, 20).map((t: any) => ({
            display_name: t.display_name,
            skills: t.skills,
            bio: t.bio,
            score: t.creator_economy_score,
            avg_rating: t.avg_rating,
            completed_jobs: t.completed_jobs,
          })),
        },
      });

      if (error) throw error;
      setAiSuggestions(data?.suggestions || []);
    } catch (err: any) {
      Sentry.captureException(err, { tags: { context: "post_job" } });
      // Fallback: simple skill-based matching
      const matched = allTalent
        .filter((t: any) => t.skills?.includes(skillCategory))
        .slice(0, 3)
        .map((t: any) => ({
          display_name: t.display_name,
          skills: t.skills || [],
          score: t.creator_economy_score,
          reason: `Skilled in ${SKILL_LABELS[skillCategory as SkillCategory]} with a score of ${Math.round(t.creator_economy_score)}`,
        }));
      setAiSuggestions(matched);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 md:px-8 py-6 space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/jobs")} className="gap-1.5 -ml-2">
          <ArrowLeft className="w-4 h-4" /> Back to Jobs
        </Button>

        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-primary" /> Post a Job
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Find the perfect talent for your creator business</p>
        </div>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label>Job Title *</Label>
            <Input placeholder="e.g. YouTube Thumbnail Designer" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Description *</Label>
            <Textarea
              placeholder="Describe the work, requirements, and what you're looking for..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
            />
          </div>

          <div className="space-y-2">
            <Label>Skill Category *</Label>
            <Select value={skillCategory} onValueChange={(v) => setSkillCategory(v as SkillCategory)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {SKILL_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>{SKILL_LABELS[cat]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Budget Min ($) *</Label>
              <Input type="number" placeholder="100" value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Budget Max ($) *</Label>
              <Input type="number" placeholder="500" value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Timeline</Label>
              <Select value={timeline} onValueChange={setTimeline}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1-3 days">1-3 days</SelectItem>
                  <SelectItem value="1 week">1 week</SelectItem>
                  <SelectItem value="2 weeks">2 weeks</SelectItem>
                  <SelectItem value="1 month">1 month</SelectItem>
                  <SelectItem value="ongoing">Ongoing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Job Type</Label>
              <Select value={jobType} onValueChange={(v) => setJobType(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one_time">One-time Project</SelectItem>
                  <SelectItem value="ongoing">Ongoing</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between glass-card p-4 rounded-xl">
            <div>
              <p className="text-sm font-medium">Members Only</p>
              <p className="text-xs text-muted-foreground">Only your community members can apply</p>
            </div>
            <Switch checked={membersOnly} onCheckedChange={setMembersOnly} />
          </div>

          {/* AI Suggestion Trigger */}
          {description && skillCategory && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-4 rounded-xl border-primary/20 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">ARIA recommends</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchAISuggestions}
                  disabled={aiLoading}
                  className="text-xs gap-1.5"
                >
                  {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  Find Best Matches
                </Button>
              </div>

              {aiSuggestions.length > 0 && (
                <div className="space-y-2">
                  {aiSuggestions.map((s, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                        {s.display_name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{s.display_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{s.reason}</p>
                      </div>
                      <Badge className="bg-primary/10 text-primary border-0 text-[10px]">
                        Score: {Math.round(s.score)}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => navigate("/jobs")} className="flex-1">Cancel</Button>
            <Button onClick={handleSubmit} disabled={createJob.isPending} className="flex-1 gap-1.5">
              {createJob.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Briefcase className="w-4 h-4" />}
              Post Job
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
