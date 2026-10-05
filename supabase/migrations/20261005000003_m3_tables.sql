-- ==============================================================================
-- Gardenia 2K26 — Milestone 3: Contributions, Reviews, Escrow, Payouts, Disputes & Credentials
-- ==============================================================================

-- 0. Update Milestones status constraint to support 'accepted'
ALTER TABLE public.milestones DROP CONSTRAINT IF EXISTS milestones_status_check;
ALTER TABLE public.milestones ADD CONSTRAINT milestones_status_check CHECK (status IN ('open', 'in_progress', 'submitted', 'accepted', 'completed'));

-- 1. Contributions Table
CREATE TABLE IF NOT EXISTS public.contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    milestone_id UUID REFERENCES public.milestones(id) ON DELETE SET NULL,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    contribution_type TEXT NOT NULL DEFAULT 'code' CHECK (contribution_type IN ('code', 'dataset', 'benchmark', 'paper', 'review', 'analysis')),
    content_hash TEXT NOT NULL,
    ai_assisted BOOLEAN NOT NULL DEFAULT FALSE,
    ai_provider TEXT NOT NULL DEFAULT 'none' CHECK (ai_provider IN ('cloud', 'local', 'none', 'gemini')),
    status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'reviewed', 'accepted', 'rejected', 'needs_revision')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contributions are viewable by authenticated users"
    ON public.contributions FOR SELECT
    TO authenticated
    USING (TRUE);

CREATE POLICY "Users can insert their own contributions"
    ON public.contributions FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Sponsors and admins can update contributions"
    ON public.contributions FOR UPDATE
    TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.projects p WHERE p.id = contributions.project_id AND p.sponsor_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = auth.uid() AND pr.role IN ('admin', 'expert'))
    );

-- 2. Reviews Table
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contribution_id UUID NOT NULL REFERENCES public.contributions(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    quality SMALLINT NOT NULL CHECK (quality BETWEEN 0 AND 2),
    usefulness SMALLINT NOT NULL CHECK (usefulness BETWEEN 0 AND 2),
    evidence SMALLINT NOT NULL CHECK (evidence BETWEEN 0 AND 1),
    impact_score SMALLINT NOT NULL CHECK (impact_score BETWEEN 0 AND 5),
    decision TEXT NOT NULL CHECK (decision IN ('APPROVED', 'REJECTED', 'NEEDS_REVISION')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviews are viewable by authenticated users"
    ON public.reviews FOR SELECT
    TO authenticated
    USING (TRUE);

CREATE POLICY "Experts, sponsors, and admins can insert reviews"
    ON public.reviews FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = auth.uid() AND pr.role IN ('expert', 'sponsor', 'admin'))
    );

-- 3. Escrows Table
CREATE TABLE IF NOT EXISTS public.escrows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    milestone_id UUID REFERENCES public.milestones(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'UNFUNDED' CHECK (status IN ('UNFUNDED', 'FUNDED', 'RELEASED', 'PROTECTED')),
    funded_at TIMESTAMPTZ,
    released_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (milestone_id)
);

ALTER TABLE public.escrows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Escrows are viewable by authenticated users"
    ON public.escrows FOR SELECT
    TO authenticated
    USING (TRUE);

CREATE POLICY "Sponsors and admins can manage escrows"
    ON public.escrows FOR ALL
    TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.projects p WHERE p.id = escrows.project_id AND p.sponsor_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = auth.uid() AND pr.role = 'admin')
    );

-- 4. Payouts Table
CREATE TABLE IF NOT EXISTS public.payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    milestone_id UUID REFERENCES public.milestones(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    pool TEXT NOT NULL CHECK (pool IN ('student', 'expert', 'platform', 'ai_reserve')),
    credit_weight NUMERIC NOT NULL DEFAULT 0,
    share NUMERIC NOT NULL DEFAULT 0,
    amount NUMERIC NOT NULL DEFAULT 0,
    explanation JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Payouts viewable by authenticated users"
    ON public.payouts FOR SELECT
    TO authenticated
    USING (TRUE);

CREATE POLICY "Sponsors and admins can manage payouts"
    ON public.payouts FOR ALL
    TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.projects p WHERE p.id = payouts.project_id AND p.sponsor_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = auth.uid() AND pr.role = 'admin')
    );

-- 5. Disputes Table
CREATE TABLE IF NOT EXISTS public.disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    contribution_id UUID REFERENCES public.contributions(id) ON DELETE SET NULL,
    raised_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'RESOLVED')),
    resolution TEXT,
    resolved_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Disputes viewable by authenticated users"
    ON public.disputes FOR SELECT
    TO authenticated
    USING (TRUE);

CREATE POLICY "Users can raise disputes"
    ON public.disputes FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = raised_by);

CREATE POLICY "Admins and sponsors can update disputes"
    ON public.disputes FOR UPDATE
    TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = auth.uid() AND pr.role = 'admin') OR
        EXISTS (SELECT 1 FROM public.projects p WHERE p.id = disputes.project_id AND p.sponsor_id = auth.uid())
    );

-- 6. Credentials Table
CREATE TABLE IF NOT EXISTS public.credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'research_credit',
    title TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Credentials viewable by authenticated users"
    ON public.credentials FOR SELECT
    TO authenticated
    USING (TRUE);

CREATE POLICY "Sponsors and admins can issue credentials"
    ON public.credentials FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.projects p WHERE p.id = credentials.project_id AND p.sponsor_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = auth.uid() AND pr.role = 'admin')
    );
