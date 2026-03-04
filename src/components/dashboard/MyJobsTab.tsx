import { useState } from "react";
import { motion } from "framer-motion";
import { useMyJobs, useMyApplications, SKILL_LABELS } from "@/hooks/useJobs";
import { useNavigate } from "react-router-dom";
import { Briefcase, FileText, Clock, CheckCircle2, XCircle, Eye, Users, ChevronRight, Plus, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  open: { label: "Open", color: "bg-primary/10 text-primary border-primary/20", icon: CheckCircle2 },
  closed: { label: "Closed", color: "bg-muted text-muted-foreground border-border", icon: XCircle },
  pending: { label: "Pending", color: "bg-warning/10 text-warning border-warning/20", icon: Clock },
  reviewed: { label: "Reviewed", color: "bg-accent/10 text-accent-foreground border-accent", icon: Eye },
  shortlisted: { label: "Shortlisted", color: "bg-primary/10 text-primary border-primary/20", icon: CheckCircle2 },
  hired: { label: "Hired!", color: "bg-primary/15 text-primary border-primary/30", icon: CheckCircle2 },
  rejected: { label: "Not Selected", color: "bg-destructive/10 text-destructive border-destructive/20", icon: XCircle },
};

export function MyJobsTab() {
  const [view, setView] = useState<"posted" | "applied">("posted");
  const { data: myJobs, isLoading: jobsLoading } = useMyJobs();
  const { data: myApplications, isLoading: appsLoading } = useMyApplications();
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setView("posted")}
          className={`text-sm px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
            view === "posted" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Briefcase className="w-3.5 h-3.5" /> My Posted Jobs
          {myJobs?.length ? (
            <span className="ml-1 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-bold">{myJobs.length}</span>
          ) : null}
        </button>
        <button
          onClick={() => setView("applied")}
          className={`text-sm px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
            view === "applied" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileText className="w-3.5 h-3.5" /> My Applications
          {myApplications?.length ? (
            <span className="ml-1 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-bold">{myApplications.length}</span>
          ) : null}
        </button>
      </div>

      {view === "posted" ? (
        <PostedJobsList jobs={myJobs || []} loading={jobsLoading} navigate={navigate} />
      ) : (
        <ApplicationsList applications={myApplications || []} loading={appsLoading} navigate={navigate} />
      )}
    </div>
  );
}

function PostedJobsList({ jobs, loading, navigate }: { jobs: any[]; loading: boolean; navigate: any }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass-card p-4 animate-pulse">
            <div className="h-4 bg-secondary rounded w-1/3 mb-2" />
            <div className="h-3 bg-secondary rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-8 text-center">
        <Briefcase className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <h3 className="font-semibold mb-1">No jobs posted yet</h3>
        <p className="text-sm text-muted-foreground mb-4">Post your first job to find talented creators.</p>
        <Button onClick={() => navigate("/post-job")} size="sm">
          <Plus className="w-4 h-4 mr-1" /> Post a Job
        </Button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-3">
      {jobs.map((job, i) => {
        const status = statusConfig[job.status] || statusConfig.open;
        const StatusIcon = status.icon;
        return (
          <motion.div
            key={job.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-card p-4 hover:border-primary/20 transition-colors cursor-pointer"
            onClick={() => navigate(`/jobs/${job.id}`)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-sm truncate">{job.title}</h4>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${status.color} flex items-center gap-1`}>
                    <StatusIcon className="w-3 h-3" /> {status.label}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Badge variant="secondary" className="text-xs px-1.5 py-0">
                      {SKILL_LABELS[job.skill_category as keyof typeof SKILL_LABELS] || job.skill_category}
                    </Badge>
                  </span>
                  <span>${job.budget_min}–${job.budget_max}</span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" /> {job.applicant_count} applicants
                  </span>
                  <span>{formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
            </div>
          </motion.div>
        );
      })}
      <Button variant="outline" className="w-full" onClick={() => navigate("/post-job")}>
        <Plus className="w-4 h-4 mr-1" /> Post Another Job
      </Button>
    </div>
  );
}

function ApplicationsList({ applications, loading, navigate }: { applications: any[]; loading: boolean; navigate: any }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass-card p-4 animate-pulse">
            <div className="h-4 bg-secondary rounded w-1/3 mb-2" />
            <div className="h-3 bg-secondary rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-8 text-center">
        <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <h3 className="font-semibold mb-1">No applications yet</h3>
        <p className="text-sm text-muted-foreground mb-4">Browse open jobs and apply to start working.</p>
        <Button onClick={() => navigate("/jobs")} size="sm">
          <Briefcase className="w-4 h-4 mr-1" /> Browse Jobs
        </Button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-3">
      {applications.map((app, i) => {
        const status = statusConfig[app.status] || statusConfig.pending;
        const StatusIcon = status.icon;
        return (
          <motion.div
            key={app.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-card p-4 hover:border-primary/20 transition-colors cursor-pointer"
            onClick={() => navigate(`/jobs/${app.job_id}`)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-sm truncate">{app.job_title || "Job"}</h4>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${status.color} flex items-center gap-1`}>
                    <StatusIcon className="w-3 h-3" /> {status.label}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>Proposed: ${app.proposed_rate}</span>
                  <span>Timeline: {app.estimated_timeline}</span>
                  <span>{formatDistanceToNow(new Date(app.created_at), { addSuffix: true })}</span>
                </div>
                {app.status === "shortlisted" && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-primary font-medium">
                    <AlertCircle className="w-3 h-3" /> You've been shortlisted! Check messages for updates.
                  </div>
                )}
                {app.status === "hired" && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-primary font-medium">
                    <CheckCircle2 className="w-3 h-3" /> Congratulations! You've been hired.
                  </div>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
