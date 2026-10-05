-- ==============================================================================
-- Gardenia 2K26 — Milestone 2: AI Scoping, Matching & ResearchCopilot Schema
-- ==============================================================================

-- 1. Profiles Table Extension: Conflict of Interest Flag
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS conflict_of_interest BOOLEAN DEFAULT FALSE;

-- 2. Milestones Table
CREATE TABLE IF NOT EXISTS public.milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    required_skills TEXT[] DEFAULT '{}',
    acceptance_criteria TEXT[] DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'submitted', 'completed')),
    amount NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Milestones readable by authenticated users"
    ON public.milestones FOR SELECT
    TO authenticated
    USING (TRUE);

CREATE POLICY "Sponsors and admins can manage milestones"
    ON public.milestones FOR ALL
    TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.projects p WHERE p.id = milestones.project_id AND p.sponsor_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = auth.uid() AND pr.role = 'admin')
    );

-- 3. Agent Runs Table
CREATE TABLE IF NOT EXISTS public.agent_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    task TEXT NOT NULL,
    ai_provider TEXT NOT NULL CHECK (ai_provider IN ('cloud', 'local', 'gemini')),
    data_classification TEXT NOT NULL CHECK (data_classification IN ('PUBLIC', 'CONFIDENTIAL', 'MIXED', 'UNKNOWN')),
    output TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'completed',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agent runs readable by project members, owner, or admin"
    ON public.agent_runs FOR SELECT
    TO authenticated
    USING (
        owner_id = auth.uid() OR
        EXISTS (SELECT 1 FROM public.project_members pm WHERE pm.project_id = agent_runs.project_id AND pm.user_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM public.projects p WHERE p.id = agent_runs.project_id AND p.sponsor_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = auth.uid() AND pr.role = 'admin')
    );

CREATE POLICY "Users can record their own agent runs"
    ON public.agent_runs FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = owner_id);
