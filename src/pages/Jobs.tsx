import { useState } from "react";
import EmptyState from "@/components/ui/EmptyState";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Briefcase, Search, Filter, Plus, Star, Clock, Users, ChevronDown,
  Sparkles, Award, ArrowRight, X, TrendingUp
} from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useJobs, useTalentProfiles, SKILL_LABELS, SKILL_CATEGORIES, type SkillCategory, type Job } from "@/hooks/useJobs";
import SEOHead from "@/components/SEOHead";
import { formatDistanceToNow, differenceInHours } from "date-fns";

const tierIcons = ["🛡️", "📈", "⚡", "👑"];

function JobCard({ job, onClick }: { job: Job; onClick: () => void }) {
  const isNew = differenceInHours(new Date(), new Date(job.created_at)) < 24;

  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className="w-full text-left glass-card-hover p-5 space-y-3 group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
            {job.creator_avatar ? (
              <img src={job.creator_avatar} alt={job.creator_name || ""} className="w-full h-full rounded-full object-cover" loading="lazy" />
            ) : (
              job.creator_name?.charAt(0) || "C"
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium truncate">{job.creator_name}</span>
              <span className="text-xs">{tierIcons[(job.creator_tier || 1) - 1]}</span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">{job.creator_tier_name}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>
        {isNew && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-bold animate-pulse flex-shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            NEW
          </span>
        )}
      </div>

      <h3 className="text-base font-semibold leading-tight group-hover:text-primary transition-colors">
        {job.title}
      </h3>

      <div className="flex flex-wrap items-center gap-2">
        <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
          {SKILL_LABELS[job.skill_category]}
        </Badge>
        <span className="text-xs text-muted-foreground">
          ${job.budget_min.toLocaleString()} – ${job.budget_max.toLocaleString()}
        </span>
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="w-3 h-3" /> {job.timeline}
        </span>
        {job.job_type === "ongoing" && (
          <Badge variant="outline" className="text-[10px]">Ongoing</Badge>
        )}
        {job.members_only && (
          <Badge variant="outline" className="text-[10px] border-warning/30 text-warning">Members Only</Badge>
        )}
      </div>

      <div className="flex items-center justify-between pt-1">
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Users className="w-3 h-3" /> {job.applicant_count} applicant{job.applicant_count !== 1 ? "s" : ""}
        </span>
        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
    </motion.button>
  );
}

function TalentSpotlightCard({ talent }: { talent: any }) {
  return (
    <div className="glass-card p-4 space-y-2 min-w-[220px]">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
          {talent.avatar_url ? (
            <img src={talent.avatar_url} alt={talent.display_name || ""} className="w-full h-full rounded-full object-cover" loading="lazy" />
          ) : (
            talent.display_name?.charAt(0) || "T"
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium truncate">{talent.display_name}</span>
            {talent.verified_partner && (
              <Award className="w-3.5 h-3.5 text-warning" />
            )}
          </div>
          <p className="text-[10px] text-muted-foreground">{talent.tier_name}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        {(talent.skills || []).slice(0, 2).map((s: SkillCategory) => (
          <Badge key={s} variant="outline" className="text-[9px] px-1.5 py-0">
            {SKILL_LABELS[s]}
          </Badge>
        ))}
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground flex items-center gap-1">
          <Star className="w-3 h-3 text-warning fill-warning" /> {Number(talent.avg_rating).toFixed(1)}
        </span>
        <span className="text-primary font-medium flex items-center gap-1">
          <TrendingUp className="w-3 h-3" /> Score: {Math.round(talent.creator_economy_score)}
        </span>
      </div>
    </div>
  );
}

export default function Jobs() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [skillFilter, setSkillFilter] = useState<SkillCategory | "all">("all");
  const [showFilters, setShowFilters] = useState(false);

  const { data: jobs = [], isLoading: jobsLoading } = useJobs(
    skillFilter !== "all" ? { skill: skillFilter } : undefined
  );
  const { data: topTalent = [] } = useTalentProfiles();

  const filteredJobs = search
    ? jobs.filter(j => j.title.toLowerCase().includes(search.toLowerCase()) || j.description.toLowerCase().includes(search.toLowerCase()))
    : jobs;

  const featuredJobs = filteredJobs.filter(j => j.featured);
  const recentJobs = filteredJobs.filter(j => !j.featured);

  return (
    <AppLayout>
      <SEOHead
        title="Creator Jobs"
        description="Browse and post freelance jobs for the creator economy — video editing, design, copywriting, and more on Uply."
      />
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
              <Briefcase className="w-7 h-7 text-primary" />
              Jobs & Talent
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Find talent or discover opportunities in the creator economy</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/talent-profile")}>
              <Users className="w-4 h-4 mr-1.5" /> My Talent Profile
            </Button>
            <Button size="sm" onClick={() => navigate("/post-job")} className="gap-1.5">
              <Plus className="w-4 h-4" /> Post a Job
            </Button>
          </div>
        </div>

        {/* Search + Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search jobs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={skillFilter} onValueChange={(v) => setSkillFilter(v as any)}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {SKILL_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>{SKILL_LABELS[cat]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? "border-primary text-primary" : ""}
          >
            <Filter className="w-4 h-4" />
          </Button>
        </div>

        {/* Talent Spotlight */}
        {topTalent.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Talent Spotlight</h2>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
              {topTalent.slice(0, 6).map((t: any) => (
                <TalentSpotlightCard key={t.id} talent={t} />
              ))}
            </div>
          </section>
        )}

        {/* Featured Jobs */}
        {featuredJobs.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-4 h-4 text-warning fill-warning" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Featured Jobs</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {featuredJobs.map((job) => (
                <JobCard key={job.id} job={job} onClick={() => navigate(`/jobs/${job.id}`)} />
              ))}
            </div>
          </section>
        )}

        {/* Recent Jobs */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {featuredJobs.length > 0 ? "Recent Jobs" : "All Jobs"}
            </h2>
            <span className="text-xs text-muted-foreground">({recentJobs.length})</span>
          </div>

          {jobsLoading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-[180px] rounded-xl" />
              ))}
            </div>
          ) : recentJobs.length === 0 ? (
            <EmptyState
              icon={Briefcase}
              title="The marketplace is waiting for you"
              description="Post a job to find talented creators, or check back later as the community grows."
              actionLabel="Post a Job"
              onAction={() => navigate("/post-job")}
              secondaryLabel="Browse Talent"
              onSecondary={() => navigate("/jobs?tab=talent")}
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {recentJobs.map((job) => (
                <JobCard key={job.id} job={job} onClick={() => navigate(`/jobs/${job.id}`)} />
              ))}
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  );
}
