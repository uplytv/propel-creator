import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export type SkillCategory =
  | "video_editing" | "thumbnail_design" | "copywriting" | "email_marketing"
  | "community_management" | "graphic_design" | "web_development" | "ai_automation"
  | "coaching_support" | "social_media_management" | "podcast_editing";

export const SKILL_LABELS: Record<SkillCategory, string> = {
  video_editing: "Video Editing",
  thumbnail_design: "Thumbnail Design",
  copywriting: "Copywriting",
  email_marketing: "Email Marketing",
  community_management: "Community Management",
  graphic_design: "Graphic Design",
  web_development: "Web Development",
  ai_automation: "AI Automation",
  coaching_support: "Coaching Support",
  social_media_management: "Social Media Management",
  podcast_editing: "Podcast Editing",
};

export const SKILL_CATEGORIES = Object.keys(SKILL_LABELS) as SkillCategory[];

export interface Job {
  id: string;
  creator_id: string;
  title: string;
  description: string;
  skill_category: SkillCategory;
  budget_min: number;
  budget_max: number;
  timeline: string;
  job_type: "one_time" | "ongoing";
  members_only: boolean;
  status: string;
  featured: boolean;
  applicant_count: number;
  created_at: string;
  updated_at: string;
  // Joined from profiles
  creator_name?: string;
  creator_avatar?: string;
  creator_tier?: number;
  creator_tier_name?: string;
}

export function useJobs(filters?: {
  skill?: SkillCategory;
  budgetMin?: number;
  budgetMax?: number;
  timeline?: string;
  creatorTier?: number;
}) {
  return useQuery({
    queryKey: ["jobs", filters],
    queryFn: async () => {
      let query = supabase
        .from("jobs")
        .select("*")
        .eq("status", "open")
        .order("featured", { ascending: false })
        .order("created_at", { ascending: false });

      if (filters?.skill) {
        query = query.eq("skill_category", filters.skill);
      }
      if (filters?.budgetMin) {
        query = query.gte("budget_max", filters.budgetMin);
      }
      if (filters?.budgetMax) {
        query = query.lte("budget_min", filters.budgetMax);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch creator profiles for all jobs
      const creatorIds = [...new Set((data || []).map((j: any) => j.creator_id))];
      let profiles: any[] = [];
      if (creatorIds.length > 0) {
        const { data: profileData } = await (supabase as any)
          .from("profiles_public")
          .select("user_id, display_name, avatar_url")
          .in("user_id", creatorIds);
        profiles = profileData || [];
      }

      const profileMap = new Map(profiles.map((p: any) => [p.user_id, p]));

      return (data || []).map((job: any) => {
        const profile = profileMap.get(job.creator_id);
        return {
          ...job,
          creator_name: profile?.display_name || "Creator",
          creator_avatar: profile?.avatar_url,
          creator_tier: profile?.tier || 1,
          creator_tier_name: profile?.tier_name || "Starter",
        } as Job;
      });
    },
  });
}

export function useMyJobs() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-jobs", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("creator_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Job[];
    },
  });
}

export function useMyApplications() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-applications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_applications")
        .select("*")
        .eq("applicant_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Fetch job titles
      const jobIds = [...new Set((data || []).map((a: any) => a.job_id))];
      let jobs: any[] = [];
      if (jobIds.length > 0) {
        const { data: jobData } = await supabase
          .from("jobs")
          .select("id, title, skill_category")
          .in("id", jobIds);
        jobs = jobData || [];
      }
      const jobMap = new Map(jobs.map((j: any) => [j.id, j]));

      return (data || []).map((app: any) => ({
        ...app,
        job_title: jobMap.get(app.job_id)?.title || "Job",
        job_skill: jobMap.get(app.job_id)?.skill_category,
      }));
    },
  });
}

export function useCreateJob() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (job: {
      title: string;
      description: string;
      skill_category: SkillCategory;
      budget_min: number;
      budget_max: number;
      timeline: string;
      job_type: "one_time" | "ongoing";
      members_only: boolean;
    }) => {
      const { data, error } = await supabase
        .from("jobs")
        .insert({ ...job, creator_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["my-jobs"] });
      toast.success("Job posted successfully!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to post job");
    },
  });
}

export function useJobApplications(jobId?: string) {
  return useQuery({
    queryKey: ["job-applications", jobId],
    enabled: !!jobId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_applications")
        .select("*")
        .eq("job_id", jobId!)
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Fetch applicant profiles
      const applicantIds = [...new Set((data || []).map((a: any) => a.applicant_id))];
      let profiles: any[] = [];
      if (applicantIds.length > 0) {
        const { data: profileData } = await (supabase as any)
          .from("profiles_public")
          .select("user_id, display_name, avatar_url")
          .in("user_id", applicantIds);
        profiles = profileData || [];
      }

      // Fetch talent profiles
      let talentProfiles: any[] = [];
      if (applicantIds.length > 0) {
        const { data: talentData } = await supabase
          .from("talent_profiles")
          .select("*")
          .in("user_id", applicantIds);
        talentProfiles = talentData || [];
      }

      const profileMap = new Map(profiles.map((p: any) => [p.user_id, p]));
      const talentMap = new Map(talentProfiles.map((t: any) => [t.user_id, t]));

      return (data || []).map((app: any) => ({
        ...app,
        applicant_name: profileMap.get(app.applicant_id)?.display_name || "User",
        applicant_avatar: profileMap.get(app.applicant_id)?.avatar_url,
        applicant_tier: profileMap.get(app.applicant_id)?.tier || 1,
        applicant_tier_name: profileMap.get(app.applicant_id)?.tier_name || "Starter",
        talent_profile: talentMap.get(app.applicant_id),
      }));
    },
  });
}

export function useApplyToJob() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (application: {
      job_id: string;
      cover_message: string;
      portfolio_samples: string[];
      proposed_rate: number;
      estimated_timeline: string;
    }) => {
      const { error } = await supabase
        .from("job_applications")
        .insert({ ...application, applicant_id: user!.id });
      if (error) throw error;

      // Note: applicant_count is tracked via query count, no need to increment manually
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["job-applications"] });
      toast.success("Application submitted!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to apply");
    },
  });
}

export function useUpdateApplicationStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("job_applications")
        .update({ status } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-applications"] });
      toast.success("Application status updated");
    },
  });
}

export function useTalentProfiles(skillFilter?: SkillCategory) {
  return useQuery({
    queryKey: ["talent-profiles", skillFilter],
    queryFn: async () => {
      let query = supabase
        .from("talent_profiles")
        .select("*")
        .eq("availability", "open_to_work")
        .order("creator_economy_score", { ascending: false });

      if (skillFilter) {
        query = query.contains("skills", [skillFilter]);
      }

      const { data, error } = await query;
      if (error) throw error;

      const userIds = (data || []).map((t: any) => t.user_id);
      let profiles: any[] = [];
      if (userIds.length > 0) {
        const { data: profileData } = await (supabase as any)
          .from("profiles_public")
          .select("user_id, display_name, avatar_url")
          .in("user_id", userIds);
        profiles = profileData || [];
      }

      const profileMap = new Map(profiles.map((p: any) => [p.user_id, p]));

      return (data || []).map((t: any) => ({
        ...t,
        display_name: profileMap.get(t.user_id)?.display_name || "Talent",
        avatar_url: profileMap.get(t.user_id)?.avatar_url,
        tier: profileMap.get(t.user_id)?.tier || 1,
        tier_name: profileMap.get(t.user_id)?.tier_name || "Starter",
      }));
    },
  });
}

export function useMyTalentProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-talent-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("talent_profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpsertTalentProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (profile: {
      skills: SkillCategory[];
      portfolio_links: string[];
      past_work?: string;
      hourly_rate?: number;
      project_rate?: number;
      availability: "open_to_work" | "not_available";
      bio?: string;
    }) => {
      const { error } = await supabase
        .from("talent_profiles")
        .upsert({ ...profile, user_id: user!.id } as any, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-talent-profile"] });
      queryClient.invalidateQueries({ queryKey: ["talent-profiles"] });
      toast.success("Talent profile saved!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save profile");
    },
  });
}

export function useJobReviews(userId?: string) {
  return useQuery({
    queryKey: ["job-reviews", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_reviews")
        .select("*")
        .eq("reviewee_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const reviewerIds = [...new Set((data || []).map((r: any) => r.reviewer_id))];
      let profiles: any[] = [];
      if (reviewerIds.length > 0) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url")
          .in("user_id", reviewerIds);
        profiles = profileData || [];
      }
      const profileMap = new Map(profiles.map((p: any) => [p.user_id, p]));

      return (data || []).map((r: any) => ({
        ...r,
        reviewer_name: profileMap.get(r.reviewer_id)?.display_name || "User",
        reviewer_avatar: profileMap.get(r.reviewer_id)?.avatar_url,
      }));
    },
  });
}

export function useCreateReview() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (review: {
      job_id: string;
      reviewee_id: string;
      rating: number;
      comment?: string;
    }) => {
      const { error } = await supabase
        .from("job_reviews")
        .insert({ ...review, reviewer_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-reviews"] });
      toast.success("Review submitted!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to submit review");
    },
  });
}
