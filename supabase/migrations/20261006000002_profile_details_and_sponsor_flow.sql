-- ==============================================================================
-- Gardenia 2K26 — Milestone 7: Profile Details, Sponsor Flow & Clean Architecture
-- ==============================================================================

-- 1. Add Profile fields for social links, bio, and avatar
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS github_url TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS linkedin_url TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT '';

-- 2. Add Project fields for clear, non-artificial project posting
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS requirements TEXT DEFAULT '';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS deliverables TEXT DEFAULT '';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS skills_needed TEXT[] DEFAULT '{}';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS timeline TEXT DEFAULT '';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS budget NUMERIC DEFAULT 0;

-- 3. Add agreement_text to charters
ALTER TABLE public.charters ADD COLUMN IF NOT EXISTS agreement_text TEXT DEFAULT '';

-- 4. Expand notifications type check to support full workflow
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'STUDENT_APPLIED',
    'APPLICATION_SUBMITTED',
    'EXPERT_ACCEPTED',
    'EXPERT_REJECTED',
    'PROJECT_COMPLETED',
    'FEEDBACK_AVAILABLE',
    'CREDITS_APPROVED',
    'REWARD_RELEASED',
    'MILESTONE_SUBMITTED'
  ));

-- 5. Ensure indexes for high performance
CREATE INDEX IF NOT EXISTS idx_project_applications_student ON public.project_applications(student_id);
CREATE INDEX IF NOT EXISTS idx_project_applications_project ON public.project_applications(project_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_project_feedback_reviewee ON public.project_feedback(reviewee_id);
