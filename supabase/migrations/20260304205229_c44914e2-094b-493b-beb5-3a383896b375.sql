
-- Skill categories enum
CREATE TYPE public.skill_category AS ENUM (
  'video_editing', 'thumbnail_design', 'copywriting', 'email_marketing',
  'community_management', 'graphic_design', 'web_development', 'ai_automation',
  'coaching_support', 'social_media_management', 'podcast_editing'
);

-- Job type enum
CREATE TYPE public.job_type AS ENUM ('one_time', 'ongoing');

-- Application status enum
CREATE TYPE public.application_status AS ENUM ('pending', 'reviewed', 'shortlisted', 'hired', 'rejected');

-- Availability status enum
CREATE TYPE public.availability_status AS ENUM ('open_to_work', 'not_available');

-- Jobs table
CREATE TABLE public.jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  skill_category skill_category NOT NULL,
  budget_min NUMERIC NOT NULL DEFAULT 0,
  budget_max NUMERIC NOT NULL DEFAULT 0,
  timeline TEXT NOT NULL DEFAULT '1 week',
  job_type job_type NOT NULL DEFAULT 'one_time',
  members_only BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'open',
  featured BOOLEAN NOT NULL DEFAULT false,
  applicant_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Talent profiles table
CREATE TABLE public.talent_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  skills skill_category[] NOT NULL DEFAULT '{}',
  portfolio_links TEXT[] NOT NULL DEFAULT '{}',
  past_work TEXT,
  hourly_rate NUMERIC,
  project_rate NUMERIC,
  availability availability_status NOT NULL DEFAULT 'open_to_work',
  bio TEXT,
  creator_economy_score NUMERIC NOT NULL DEFAULT 50,
  completed_jobs INTEGER NOT NULL DEFAULT 0,
  total_reviews INTEGER NOT NULL DEFAULT 0,
  avg_rating NUMERIC NOT NULL DEFAULT 0,
  verified_partner BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Job applications table
CREATE TABLE public.job_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  applicant_id UUID NOT NULL,
  cover_message TEXT NOT NULL,
  portfolio_samples TEXT[] NOT NULL DEFAULT '{}',
  proposed_rate NUMERIC NOT NULL DEFAULT 0,
  estimated_timeline TEXT NOT NULL DEFAULT '1 week',
  status application_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(job_id, applicant_id)
);

-- Job reviews table
CREATE TABLE public.job_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL,
  reviewee_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(job_id, reviewer_id)
);

-- RLS for jobs
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view open jobs" ON public.jobs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create jobs" ON public.jobs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update own jobs" ON public.jobs
  FOR UPDATE TO authenticated USING (auth.uid() = creator_id);

CREATE POLICY "Users can delete own jobs" ON public.jobs
  FOR DELETE TO authenticated USING (auth.uid() = creator_id);

-- RLS for talent profiles
ALTER TABLE public.talent_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view talent profiles" ON public.talent_profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create own talent profile" ON public.talent_profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own talent profile" ON public.talent_profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- RLS for job applications
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Applicants can view own applications" ON public.job_applications
  FOR SELECT TO authenticated USING (auth.uid() = applicant_id OR EXISTS (
    SELECT 1 FROM public.jobs WHERE jobs.id = job_applications.job_id AND jobs.creator_id = auth.uid()
  ));

CREATE POLICY "Users can apply to jobs" ON public.job_applications
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = applicant_id);

CREATE POLICY "Job creators can update application status" ON public.job_applications
  FOR UPDATE TO authenticated USING (EXISTS (
    SELECT 1 FROM public.jobs WHERE jobs.id = job_applications.job_id AND jobs.creator_id = auth.uid()
  ));

-- RLS for job reviews
ALTER TABLE public.job_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reviews" ON public.job_reviews
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create reviews" ON public.job_reviews
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = reviewer_id);

-- Trigger for updated_at
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_talent_profiles_updated_at BEFORE UPDATE ON public.talent_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_job_applications_updated_at BEFORE UPDATE ON public.job_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
