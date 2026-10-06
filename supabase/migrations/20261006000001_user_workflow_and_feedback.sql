-- ==============================================================================
-- Gardenia 2K26 — Milestone 6: User Workflow, Feedback & Notifications Migration
-- ==============================================================================

-- 1. Ensure profiles INSERT policy & new user auto-provisioning
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can insert their own profile'
    ) THEN
        CREATE POLICY "Users can insert their own profile"
            ON public.profiles FOR INSERT
            TO authenticated
            WITH CHECK (auth.uid() = id);
    END IF;
END $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, role, skills, verified)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1), 'User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    '{}',
    TRUE
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 2. Allow 'pending_expert_review' and 'sponsor_invited' in project_members.status
ALTER TABLE public.project_members DROP CONSTRAINT IF EXISTS project_members_status_check;
ALTER TABLE public.project_members ADD CONSTRAINT project_members_status_check 
  CHECK (status IN ('pending', 'pending_expert_review', 'accepted', 'withdrawn', 'revoked', 'sponsor_invited'));


-- 3. Project Applications Table
CREATE TABLE IF NOT EXISTS public.project_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    charter_id UUID NOT NULL REFERENCES public.charters(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending_expert_review' CHECK (status IN ('pending_expert_review', 'accepted', 'rejected', 'sponsor_invited')),
    agreement_ack BOOLEAN NOT NULL DEFAULT TRUE,
    reviewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    UNIQUE (project_id, student_id)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_project_applications_profiles'
  ) THEN
    ALTER TABLE public.project_applications
      ADD CONSTRAINT fk_project_applications_profiles
      FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE public.project_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Applications readable by applicant, project members, sponsor, expert, admin"
    ON public.project_applications FOR SELECT
    TO authenticated
    USING (
        student_id = auth.uid() OR
        EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_applications.project_id AND p.sponsor_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM public.project_members pm WHERE pm.project_id = project_applications.project_id AND pm.user_id = auth.uid() AND pm.role IN ('expert', 'sponsor')) OR
        EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = auth.uid() AND pr.role = 'admin')
    );

CREATE POLICY "Students can insert their own application"
    ON public.project_applications FOR INSERT
    TO authenticated
    WITH CHECK (student_id = auth.uid());

CREATE POLICY "Experts, sponsors, admins can update applications"
    ON public.project_applications FOR UPDATE
    TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_applications.project_id AND p.sponsor_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM public.project_members pm WHERE pm.project_id = project_applications.project_id AND pm.user_id = auth.uid() AND pm.role IN ('expert', 'sponsor')) OR
        EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = auth.uid() AND pr.role = 'admin')
    );


-- 4. In-App Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('STUDENT_APPLIED', 'EXPERT_ACCEPTED', 'EXPERT_REJECTED', 'PROJECT_COMPLETED', 'FEEDBACK_AVAILABLE')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    related_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own notifications"
    ON public.notifications FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications (e.g. mark read)"
    ON public.notifications FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Authenticated users can create notifications"
    ON public.notifications FOR INSERT
    TO authenticated
    WITH CHECK (TRUE);


-- 5. Project Feedback / Ratings Table
CREATE TABLE IF NOT EXISTS public.project_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reviewee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    work_quality INTEGER NOT NULL CHECK (work_quality >= 1 AND work_quality <= 5),
    reliability INTEGER NOT NULL CHECK (reliability >= 1 AND reliability <= 5),
    communication INTEGER NOT NULL CHECK (communication >= 1 AND communication <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT no_self_review CHECK (reviewer_id <> reviewee_id),
    CONSTRAINT unique_project_review UNIQUE (project_id, reviewer_id, reviewee_id)
);

ALTER TABLE public.project_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Feedback readable by all authenticated users"
    ON public.project_feedback FOR SELECT
    TO authenticated
    USING (TRUE);

-- Trigger / validation function to prevent invalid feedback:
-- Must be completed project, and both must be participants
CREATE OR REPLACE FUNCTION public.validate_project_feedback()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_status TEXT;
    v_reviewer_valid BOOLEAN;
    v_reviewee_valid BOOLEAN;
BEGIN
    -- 1. Check project status is 'complete'
    SELECT status INTO v_status FROM public.projects WHERE id = NEW.project_id;
    IF v_status <> 'complete' THEN
        RAISE EXCEPTION 'FEEDBACK_UNAVAILABLE: Feedback can only be submitted after the project is complete.';
    END IF;

    -- 2. Check reviewer participation
    SELECT EXISTS (
        SELECT 1 FROM public.project_members pm
        WHERE pm.project_id = NEW.project_id AND pm.user_id = NEW.reviewer_id AND pm.status = 'accepted'
    ) OR EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = NEW.project_id AND p.sponsor_id = NEW.reviewer_id
    ) INTO v_reviewer_valid;

    IF NOT v_reviewer_valid THEN
        RAISE EXCEPTION 'NON_PARTICIPANT_REVIEW: Reviewer was not an accepted participant on this project.';
    END IF;

    -- 3. Check reviewee participation
    SELECT EXISTS (
        SELECT 1 FROM public.project_members pm
        WHERE pm.project_id = NEW.project_id AND pm.user_id = NEW.reviewee_id AND pm.status = 'accepted'
    ) OR EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = NEW.project_id AND p.sponsor_id = NEW.reviewee_id
    ) INTO v_reviewee_valid;

    IF NOT v_reviewee_valid THEN
        RAISE EXCEPTION 'NON_PARTICIPANT_REVIEWEE: Reviewee was not an accepted participant on this project.';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_project_feedback ON public.project_feedback;
CREATE TRIGGER trg_validate_project_feedback
    BEFORE INSERT ON public.project_feedback
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_project_feedback();

CREATE POLICY "Users can insert their own feedback for completed projects"
    ON public.project_feedback FOR INSERT
    TO authenticated
    WITH CHECK (reviewer_id = auth.uid());
