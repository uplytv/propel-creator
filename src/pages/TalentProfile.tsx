import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, User, Award, Star, Briefcase, Link as LinkIcon, Plus, X, Loader2, TrendingUp
} from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  useMyTalentProfile, useUpsertTalentProfile, useJobReviews,
  SKILL_LABELS, SKILL_CATEGORIES, type SkillCategory
} from "@/hooks/useJobs";
import { useAuth } from "@/context/AuthContext";
import { formatDistanceToNow } from "date-fns";

export default function TalentProfile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: existing, isLoading } = useMyTalentProfile();
  const upsertProfile = useUpsertTalentProfile();
  const { data: reviews = [] } = useJobReviews(user?.id);

  const [skills, setSkills] = useState<SkillCategory[]>([]);
  const [portfolioLinks, setPortfolioLinks] = useState<string[]>([]);
  const [newLink, setNewLink] = useState("");
  const [pastWork, setPastWork] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [projectRate, setProjectRate] = useState("");
  const [availability, setAvailability] = useState<"open_to_work" | "not_available">("open_to_work");
  const [bio, setBio] = useState("");

  useEffect(() => {
    if (existing) {
      setSkills(existing.skills as SkillCategory[] || []);
      setPortfolioLinks(existing.portfolio_links as string[] || []);
      setPastWork(existing.past_work || "");
      setHourlyRate(existing.hourly_rate?.toString() || "");
      setProjectRate(existing.project_rate?.toString() || "");
      setAvailability(existing.availability as any || "open_to_work");
      setBio(existing.bio || "");
    }
  }, [existing]);

  const toggleSkill = (skill: SkillCategory) => {
    setSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const addLink = () => {
    if (newLink && !portfolioLinks.includes(newLink)) {
      setPortfolioLinks([...portfolioLinks, newLink]);
      setNewLink("");
    }
  };

  const handleSave = async () => {
    await upsertProfile.mutateAsync({
      skills,
      portfolio_links: portfolioLinks,
      past_work: pastWork || undefined,
      hourly_rate: hourlyRate ? parseFloat(hourlyRate) : undefined,
      project_rate: projectRate ? parseFloat(projectRate) : undefined,
      availability,
      bio: bio || undefined,
    });
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 md:px-8 py-6 space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/jobs")} className="gap-1.5 -ml-2">
          <ArrowLeft className="w-4 h-4" /> Back to Jobs
        </Button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <User className="w-6 h-6 text-primary" /> My Talent Profile
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Showcase your skills to creators looking for talent</p>
          </div>
          {existing?.verified_partner && (
            <Badge className="bg-warning/10 text-warning border-warning/20 gap-1">
              <Award className="w-3.5 h-3.5" /> Trusted Creator Partner
            </Badge>
          )}
        </div>

        {/* Creator Economy Score */}
        {existing && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-5 flex items-center gap-4"
          >
            <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center">
              <TrendingUp className="w-7 h-7 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">{Math.round(existing.creator_economy_score)}</p>
              <p className="text-xs text-muted-foreground">Creator Economy Score</p>
            </div>
            <div className="ml-auto text-right text-sm">
              <p>{existing.completed_jobs} jobs completed</p>
              <p className="flex items-center gap-1 justify-end text-muted-foreground">
                <Star className="w-3 h-3 text-warning fill-warning" /> {Number(existing.avg_rating).toFixed(1)} ({existing.total_reviews} reviews)
              </p>
            </div>
          </motion.div>
        )}

        {/* Profile Form */}
        <div className="space-y-5">
          <div className="space-y-2">
            <Label>Bio — what do you offer creators?</Label>
            <Textarea
              placeholder="I specialize in creating scroll-stopping thumbnails for YouTube creators..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Skills (select all that apply)</Label>
            <div className="flex flex-wrap gap-2">
              {SKILL_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => toggleSkill(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                    skills.includes(cat)
                      ? "bg-primary/15 text-primary border-primary/30"
                      : "bg-secondary/50 text-muted-foreground border-transparent hover:border-border"
                  }`}
                >
                  {SKILL_LABELS[cat]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Portfolio Links</Label>
            <div className="flex gap-2">
              <Input
                placeholder="https://your-portfolio.com"
                value={newLink}
                onChange={(e) => setNewLink(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addLink()}
              />
              <Button variant="outline" size="icon" onClick={addLink}><Plus className="w-4 h-4" /></Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-1">
              {portfolioLinks.map((link, i) => (
                <Badge key={i} variant="outline" className="gap-1.5 pr-1">
                  <LinkIcon className="w-3 h-3" />
                  <span className="truncate max-w-[200px]">{link}</span>
                  <button onClick={() => setPortfolioLinks(portfolioLinks.filter((_, j) => j !== i))}>
                    <X className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Past Work Description</Label>
            <Textarea
              placeholder="Describe your past work and experience..."
              value={pastWork}
              onChange={(e) => setPastWork(e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Hourly Rate ($)</Label>
              <Input type="number" placeholder="50" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Project Rate ($)</Label>
              <Input type="number" placeholder="500" value={projectRate} onChange={(e) => setProjectRate(e.target.value)} />
            </div>
          </div>

          <div className="flex items-center justify-between glass-card p-4 rounded-xl">
            <div>
              <p className="text-sm font-medium flex items-center gap-2">
                Open to Work
                {availability === "open_to_work" && <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />}
              </p>
              <p className="text-xs text-muted-foreground">Let creators know you're available for hire</p>
            </div>
            <Switch
              checked={availability === "open_to_work"}
              onCheckedChange={(v) => setAvailability(v ? "open_to_work" : "not_available")}
            />
          </div>

          <Button onClick={handleSave} disabled={upsertProfile.isPending} className="w-full gap-1.5">
            {upsertProfile.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Briefcase className="w-4 h-4" />}
            Save Talent Profile
          </Button>
        </div>

        {/* Reviews */}
        {reviews.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Star className="w-5 h-5 text-warning" /> Reviews ({reviews.length})
            </h2>
            {reviews.map((review: any) => (
              <div key={review.id} className="glass-card p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-xs font-bold">
                      {review.reviewer_name?.charAt(0) || "U"}
                    </div>
                    <span className="text-sm font-medium">{review.reviewer_name}</span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3 h-3 ${i < review.rating ? "text-warning fill-warning" : "text-muted"}`}
                      />
                    ))}
                  </div>
                </div>
                {review.comment && <p className="text-sm text-foreground/80">{review.comment}</p>}
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
