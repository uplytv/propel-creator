import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Briefcase, Clock, Users, DollarSign, Star, Send, Loader2,
  CheckCircle, Eye, Award, User, MessageSquare
} from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useJobs, useJobApplications, useApplyToJob, useUpdateApplicationStatus, SKILL_LABELS } from "@/hooks/useJobs";
import { useStartConversation } from "@/hooks/useJobMessages";
import { useAuth } from "@/context/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  reviewed: "bg-blue-500/10 text-blue-500",
  shortlisted: "bg-primary/10 text-primary",
  hired: "bg-primary text-primary-foreground",
  rejected: "bg-destructive/10 text-destructive",
};

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: allJobs = [], isLoading } = useJobs();
  const { data: applications = [] } = useJobApplications(id);
  const applyMutation = useApplyToJob();
  const updateStatus = useUpdateApplicationStatus();
  const startConversation = useStartConversation();
  const [messageText, setMessageText] = useState("");
  const [showMessageForm, setShowMessageForm] = useState<string | null>(null);

  const job = allJobs.find((j) => j.id === id);
  const isCreator = job?.creator_id === user?.id;
  const hasApplied = applications.some((a: any) => a.applicant_id === user?.id);

  const [showApply, setShowApply] = useState(false);
  const [coverMessage, setCoverMessage] = useState("");
  const [proposedRate, setProposedRate] = useState("");
  const [estimatedTimeline, setEstimatedTimeline] = useState("1 week");
  const [portfolioSamples, setPortfolioSamples] = useState("");

  const handleApply = async () => {
    if (!coverMessage || !proposedRate) {
      toast.error("Please fill in required fields");
      return;
    }
    await applyMutation.mutateAsync({
      job_id: id!,
      cover_message: coverMessage,
      portfolio_samples: portfolioSamples.split("\n").filter(Boolean),
      proposed_rate: parseFloat(proposedRate),
      estimated_timeline: estimatedTimeline,
    });
    setShowApply(false);
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="max-w-3xl mx-auto px-4 md:px-8 py-6 space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      </AppLayout>
    );
  }

  if (!job) {
    return (
      <AppLayout>
        <div className="max-w-3xl mx-auto px-4 md:px-8 py-12 text-center space-y-4">
          <Briefcase className="w-12 h-12 mx-auto text-muted-foreground/40" />
          <p className="text-muted-foreground">Job not found</p>
          <Button onClick={() => navigate("/jobs")}>Back to Jobs</Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 md:px-8 py-6 space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/jobs")} className="gap-1.5 -ml-2">
          <ArrowLeft className="w-4 h-4" /> Back to Jobs
        </Button>

        {/* Job Header */}
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-lg font-bold text-primary flex-shrink-0">
              {job.creator_avatar ? (
                <img src={job.creator_avatar} alt={job.creator_name || ""} className="w-full h-full rounded-full object-cover" loading="lazy" />
              ) : (
                job.creator_name?.charAt(0) || "C"
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold">{job.title}</h1>
              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                <span>{job.creator_name}</span>
                <Badge variant="outline" className="text-[10px]">{job.creator_tier_name}</Badge>
                <span>·</span>
                <span>{formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge className="bg-primary/10 text-primary border-primary/20">{SKILL_LABELS[job.skill_category]}</Badge>
            <Badge variant="outline" className="gap-1"><DollarSign className="w-3 h-3" /> ${job.budget_min} – ${job.budget_max}</Badge>
            <Badge variant="outline" className="gap-1"><Clock className="w-3 h-3" /> {job.timeline}</Badge>
            <Badge variant="outline">{job.job_type === "ongoing" ? "Ongoing" : "One-time"}</Badge>
            {job.members_only && <Badge variant="outline" className="border-warning/30 text-warning">Members Only</Badge>}
          </div>

          <div className="pt-2 border-t border-border">
            <p className="text-sm text-foreground/90 whitespace-pre-wrap">{job.description}</p>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {job.applicant_count} applicants</span>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            {!isCreator && !hasApplied && (
              <Button onClick={() => setShowApply(!showApply)} className="flex-1 gap-1.5">
                <Send className="w-4 h-4" /> Apply Now
              </Button>
            )}
            {!isCreator && (
              <Button
                variant="outline"
                onClick={() => {
                  const msg = prompt("Send a message to the creator:");
                  if (msg && msg.trim()) {
                    startConversation.mutate({
                      jobId: job.id,
                      creatorId: job.creator_id,
                      applicantId: user!.id,
                      initialMessage: msg.trim(),
                    }, {
                      onSuccess: (convId) => navigate(`/job-messages?conv=${convId}`),
                    });
                  }
                }}
                disabled={startConversation.isPending}
                className="gap-1.5"
              >
                <MessageSquare className="w-4 h-4" /> Message
              </Button>
            )}
            {isCreator && (
              <Button variant="outline" onClick={() => navigate("/job-messages")} className="gap-1.5">
                <MessageSquare className="w-4 h-4" /> View Messages
              </Button>
            )}
          </div>
          {hasApplied && (
            <div className="flex items-center gap-2 text-sm text-primary">
              <CheckCircle className="w-4 h-4" /> You've already applied to this job
            </div>
          )}
        </div>

        {/* Application Form */}
        {showApply && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="glass-card p-6 space-y-4"
          >
            <h2 className="text-lg font-semibold">Submit Your Application</h2>
            <div className="space-y-2">
              <Label>Cover Message *</Label>
              <Textarea
                placeholder="Tell the creator why you're the perfect fit..."
                value={coverMessage}
                onChange={(e) => setCoverMessage(e.target.value)}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label>Portfolio Samples (one URL per line)</Label>
              <Textarea
                placeholder="https://example.com/my-work"
                value={portfolioSamples}
                onChange={(e) => setPortfolioSamples(e.target.value)}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Proposed Rate ($) *</Label>
                <Input type="number" placeholder="250" value={proposedRate} onChange={(e) => setProposedRate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Estimated Timeline</Label>
                <Input value={estimatedTimeline} onChange={(e) => setEstimatedTimeline(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowApply(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleApply} disabled={applyMutation.isPending} className="flex-1 gap-1.5">
                {applyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Submit Application
              </Button>
            </div>
          </motion.div>
        )}

        {/* Applicant Tracker (Creator View) */}
        {isCreator && applications.length > 0 && (
          <div className="glass-card p-6 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" /> Applicant Tracker
              <span className="text-xs text-muted-foreground font-normal">({applications.length})</span>
            </h2>

            <Tabs defaultValue="all">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="shortlisted">Shortlisted</TabsTrigger>
                <TabsTrigger value="hired">Hired</TabsTrigger>
              </TabsList>

              {["all", "shortlisted", "hired"].map((tab) => (
                <TabsContent key={tab} value={tab} className="space-y-3 mt-3">
                  {applications
                    .filter((a: any) => tab === "all" || a.status === tab)
                    .map((app: any) => (
                      <div key={app.id} className="p-4 rounded-lg bg-secondary/30 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                              {app.applicant_avatar ? (
                                <img src={app.applicant_avatar} alt={app.applicant_name || ""} className="w-full h-full rounded-full object-cover" loading="lazy" />
                              ) : (
                                app.applicant_name?.charAt(0) || "U"
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-medium flex items-center gap-1.5">
                                {app.applicant_name}
                                {app.talent_profile?.verified_partner && <Award className="w-3.5 h-3.5 text-warning" />}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                ${app.proposed_rate} · {app.estimated_timeline}
                              </p>
                            </div>
                          </div>
                          <Badge className={`text-[10px] ${statusColors[app.status] || ""}`}>
                            {app.status}
                          </Badge>
                        </div>

                        <p className="text-sm text-foreground/80">{app.cover_message}</p>

                        {app.portfolio_samples?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {app.portfolio_samples.map((url: string, i: number) => (
                              <a
                                key={i}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary hover:underline"
                              >
                                Portfolio {i + 1} ↗
                              </a>
                            ))}
                          </div>
                        )}

                        {app.talent_profile && (
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Star className="w-3 h-3 text-warning fill-warning" />
                              {Number(app.talent_profile.avg_rating).toFixed(1)}
                            </span>
                            <span>{app.talent_profile.completed_jobs} jobs done</span>
                            <span>Score: {Math.round(app.talent_profile.creator_economy_score)}</span>
                          </div>
                        )}

                        <div className="flex gap-2 flex-wrap">
                          {app.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateStatus.mutate({ id: app.id, status: "reviewed" })}
                                className="text-xs gap-1"
                              >
                                <Eye className="w-3 h-3" /> Mark Reviewed
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => updateStatus.mutate({ id: app.id, status: "shortlisted" })}
                                className="text-xs gap-1"
                              >
                                <Star className="w-3 h-3" /> Shortlist
                              </Button>
                            </>
                          )}
                          {(app.status === "reviewed" || app.status === "shortlisted") && (
                            <Button
                              size="sm"
                              onClick={() => updateStatus.mutate({ id: app.id, status: "hired" })}
                              className="text-xs gap-1"
                            >
                              <CheckCircle className="w-3 h-3" /> Hire
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (showMessageForm === app.id) {
                                setShowMessageForm(null);
                              } else {
                                setShowMessageForm(app.id);
                                setMessageText("");
                              }
                            }}
                            className="text-xs gap-1"
                          >
                            <MessageSquare className="w-3 h-3" /> Message
                          </Button>
                        </div>

                        {/* Inline message form */}
                        {showMessageForm === app.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            className="flex gap-2 mt-2"
                          >
                            <Input
                              placeholder="Type a message..."
                              value={messageText}
                              onChange={(e) => setMessageText(e.target.value)}
                              className="flex-1 text-xs"
                            />
                            <Button
                              size="sm"
                              disabled={!messageText.trim() || startConversation.isPending}
                              onClick={() => {
                                startConversation.mutate({
                                  jobId: job.id,
                                  creatorId: job.creator_id,
                                  applicantId: app.applicant_id,
                                  initialMessage: messageText.trim(),
                                }, {
                                  onSuccess: (convId) => navigate(`/job-messages?conv=${convId}`),
                                });
                              }}
                              className="text-xs gap-1"
                            >
                              <Send className="w-3 h-3" /> Send
                            </Button>
                          </motion.div>
                        )}
                      </div>
                    ))}
                </TabsContent>
              ))}
            </Tabs>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
