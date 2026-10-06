-- ==============================================================================
-- Gardenia 2K26 — Milestone 0: Architecture Kill Test Migration
-- ==============================================================================

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('sponsor', 'student', 'expert', 'admin')),
    skills TEXT[] DEFAULT '{}',
    verified BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles RLS
CREATE POLICY "Profiles are readable by authenticated users"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (TRUE);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

-- 3. Projects Table
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sponsor_id UUID NOT NULL REFERENCES auth.users(id),
    title TEXT NOT NULL,
    public_summary TEXT NOT NULL,
    engagement_model TEXT NOT NULL DEFAULT 'charter_v1',
    data_sensitivity TEXT NOT NULL DEFAULT 'confidential' CHECK (data_sensitivity IN ('public', 'confidential', 'mixed')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'sponsor_withdrawn', 'work_stopped', 'complete')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Projects RLS: public summaries are readable by everyone
CREATE POLICY "Projects are readable by all authenticated users"
    ON public.projects FOR SELECT
    TO authenticated
    USING (TRUE);

CREATE POLICY "Sponsors and admins can insert projects"
    ON public.projects FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = sponsor_id OR
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Sponsors and admins can update projects"
    ON public.projects FOR UPDATE
    TO authenticated
    USING (
        auth.uid() = sponsor_id OR
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- 4. Charters Table
CREATE TABLE IF NOT EXISTS public.charters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    version INTEGER NOT NULL DEFAULT 1,
    engagement_model TEXT NOT NULL DEFAULT 'charter_v1',
    budget NUMERIC DEFAULT 0,
    milestones_json JSONB DEFAULT '[]'::JSONB,
    roles_json JSONB DEFAULT '[]'::JSONB,
    ip_terms TEXT,
    publication_terms TEXT,
    confidentiality_terms TEXT,
    permitted_ai_tools TEXT,
    credit_reward_terms TEXT,
    exit_dispute_terms TEXT,
    sponsor_withdrawal_terms TEXT,
    commercialisation_terms TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (project_id, version)
);

ALTER TABLE public.charters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Charters are readable by all authenticated users"
    ON public.charters FOR SELECT
    TO authenticated
    USING (TRUE);

CREATE POLICY "Sponsors and admins can manage charters"
    ON public.charters FOR ALL
    TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.projects p WHERE p.id = charters.project_id AND p.sponsor_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = auth.uid() AND pr.role = 'admin')
    );

-- 5. Project Members Table
CREATE TABLE IF NOT EXISTS public.project_members (
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('sponsor', 'student', 'expert', 'admin')),
    status TEXT NOT NULL DEFAULT 'accepted' CHECK (status IN ('pending', 'accepted', 'withdrawn', 'revoked')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (project_id, user_id)
);

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members readable by members, sponsor, admin"
    ON public.project_members FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid() OR
        EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_members.project_id AND p.sponsor_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = auth.uid() AND pr.role = 'admin')
    );

CREATE POLICY "Sponsor and admin can manage project members"
    ON public.project_members FOR ALL
    TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_members.project_id AND p.sponsor_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = auth.uid() AND pr.role = 'admin')
    );

-- 6. Charter Acceptances Table
CREATE TABLE IF NOT EXISTS public.charter_acceptances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    charter_id UUID NOT NULL REFERENCES public.charters(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    engagement_ack BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (charter_id, user_id)
);

ALTER TABLE public.charter_acceptances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own acceptances, sponsor/admin can view project acceptances"
    ON public.charter_acceptances FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.charters c
            JOIN public.projects p ON c.project_id = p.id
            WHERE c.id = charter_acceptances.charter_id
            AND (p.sponsor_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = auth.uid() AND pr.role = 'admin'))
        )
    );

CREATE POLICY "Users can insert their own charter acceptance"
    ON public.charter_acceptances FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Function & Trigger: When a charter is accepted, automatically record or update project_members to 'accepted'
CREATE OR REPLACE FUNCTION public.handle_charter_acceptance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_project_id UUID;
    v_user_role TEXT;
BEGIN
    SELECT project_id INTO v_project_id FROM public.charters WHERE id = NEW.charter_id;
    SELECT role INTO v_user_role FROM public.profiles WHERE id = NEW.user_id;
    IF v_user_role IS NULL THEN
        v_user_role := 'student';
    END IF;

    INSERT INTO public.project_members (project_id, user_id, role, status, joined_at)
    VALUES (v_project_id, NEW.user_id, v_user_role, 'accepted', NEW.accepted_at)
    ON CONFLICT (project_id, user_id)
    DO UPDATE SET status = 'accepted';

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_charter_accepted ON public.charter_acceptances;
CREATE TRIGGER on_charter_accepted
    AFTER INSERT ON public.charter_acceptances
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_charter_acceptance();

-- 7. Project Private Briefs Table (Confidential Data Boundary)
CREATE TABLE IF NOT EXISTS public.project_private_briefs (
    project_id UUID PRIMARY KEY REFERENCES public.projects(id) ON DELETE CASCADE,
    confidential_brief TEXT NOT NULL
);

ALTER TABLE public.project_private_briefs ENABLE ROW LEVEL SECURITY;

-- Private Brief RLS:
-- NON-MEMBER: cannot read
-- ACCEPTED MEMBER: can read (only if accepted charter / accepted membership)
-- SPONSOR: can read & manage
-- ADMIN: can read & manage
CREATE POLICY "Private briefs readable only by sponsor, admin, and accepted members"
    ON public.project_private_briefs FOR SELECT
    TO authenticated
    USING (
        -- 1. Project sponsor
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = project_private_briefs.project_id
            AND p.sponsor_id = auth.uid()
        )
        OR
        -- 2. System admin
        EXISTS (
            SELECT 1 FROM public.profiles pr
            WHERE pr.id = auth.uid()
            AND pr.role = 'admin'
        )
        OR
        -- 3. Accepted member who has accepted a charter for this project
        (
            EXISTS (
                SELECT 1 FROM public.project_members pm
                WHERE pm.project_id = project_private_briefs.project_id
                AND pm.user_id = auth.uid()
                AND pm.status = 'accepted'
            )
            AND
            EXISTS (
                SELECT 1 FROM public.charter_acceptances ca
                JOIN public.charters c ON ca.charter_id = c.id
                WHERE c.project_id = project_private_briefs.project_id
                AND ca.user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Sponsors and admins can manage private briefs"
    ON public.project_private_briefs FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = project_private_briefs.project_id
            AND p.sponsor_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.profiles pr
            WHERE pr.id = auth.uid()
            AND pr.role = 'admin'
        )
    );

-- 8. Hash-Chained Ledger Table
CREATE TABLE IF NOT EXISTS public.ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES auth.users(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::JSONB,
    prev_hash TEXT NOT NULL,
    entry_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ledger entries readable by authenticated users"
    ON public.ledger_entries FOR SELECT
    TO authenticated
    USING (TRUE);

-- Ledger Immutability: Block all UPDATE and DELETE operations
CREATE OR REPLACE FUNCTION public.prevent_ledger_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        RAISE EXCEPTION 'LEDGER_IMMUTABLE: ledger entries cannot be updated';
    ELSIF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'LEDGER_IMMUTABLE: ledger entries cannot be deleted';
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_ledger_update ON public.ledger_entries;
CREATE TRIGGER trg_prevent_ledger_update
    BEFORE UPDATE ON public.ledger_entries
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_ledger_mutation();

DROP TRIGGER IF EXISTS trg_prevent_ledger_delete ON public.ledger_entries;
CREATE TRIGGER trg_prevent_ledger_delete
    BEFORE DELETE ON public.ledger_entries
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_ledger_mutation();

-- 9. Function: Canonical Hash Calculation
-- Calculates SHA-256(prev_hash + ':' + payload_json_text)
CREATE OR REPLACE FUNCTION public.compute_entry_hash(p_prev_hash TEXT, p_payload JSONB)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT encode(digest(p_prev_hash || ':' || coalesce(p_payload::text, '{}'), 'sha256'), 'hex');
$$;

-- 10. Function: Append Ledger Entry (The sole entry-point for ledger writes)
CREATE OR REPLACE FUNCTION public.append_ledger_entry(
    p_project_id UUID,
    p_actor_id UUID,
    p_action TEXT,
    p_entity_type TEXT,
    p_entity_id UUID,
    p_payload JSONB
)
RETURNS public.ledger_entries
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_prev_hash TEXT;
    v_entry_hash TEXT;
    v_new_entry public.ledger_entries;
BEGIN
    -- Obtain advisory lock on project to prevent concurrent ledger branching
    PERFORM pg_advisory_xact_lock(hashtext(p_project_id::text));

    -- Get previous entry hash or 'GENESIS'
    SELECT entry_hash INTO v_prev_hash
    FROM public.ledger_entries
    WHERE project_id = p_project_id
    ORDER BY created_at DESC, id DESC
    LIMIT 1;

    IF v_prev_hash IS NULL THEN
        v_prev_hash := 'GENESIS';
    END IF;

    -- Compute SHA-256 hash
    v_entry_hash := public.compute_entry_hash(v_prev_hash, p_payload);

    -- Insert append-only entry
    INSERT INTO public.ledger_entries (
        project_id,
        actor_id,
        action,
        entity_type,
        entity_id,
        payload,
        prev_hash,
        entry_hash,
        created_at
    )
    VALUES (
        p_project_id,
        p_actor_id,
        p_action,
        p_entity_type,
        p_entity_id,
        coalesce(p_payload, '{}'::JSONB),
        v_prev_hash,
        v_entry_hash,
        NOW()
    )
    RETURNING * INTO v_new_entry;

    RETURN v_new_entry;
END;
$$;

-- 11. Function: Verify Ledger Chain
-- Recomputes the hash chain from genesis and validates every link
CREATE OR REPLACE FUNCTION public.verify_ledger_chain(p_project_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    r RECORD;
    v_expected_prev_hash TEXT := 'GENESIS';
    v_computed_hash TEXT;
    v_count INTEGER := 0;
BEGIN
    FOR r IN
        SELECT id, payload, prev_hash, entry_hash, created_at
        FROM public.ledger_entries
        WHERE project_id = p_project_id
        ORDER BY created_at ASC, id ASC
    LOOP
        v_count := v_count + 1;

        -- 1. Check prev_hash link
        IF r.prev_hash <> v_expected_prev_hash THEN
            RETURN jsonb_build_object(
                'status', 'FAIL',
                'reason', 'PREV_HASH_MISMATCH',
                'entry_id', r.id,
                'expected_prev_hash', v_expected_prev_hash,
                'actual_prev_hash', r.prev_hash,
                'entry_index', v_count
            );
        END IF;

        -- 2. Recompute entry hash
        v_computed_hash := public.compute_entry_hash(r.prev_hash, r.payload);
        IF r.entry_hash <> v_computed_hash THEN
            RETURN jsonb_build_object(
                'status', 'FAIL',
                'reason', 'ENTRY_HASH_MISMATCH',
                'entry_id', r.id,
                'expected_hash', v_computed_hash,
                'actual_hash', r.entry_hash,
                'entry_index', v_count
            );
        END IF;

        v_expected_prev_hash := r.entry_hash;
    END LOOP;

    RETURN jsonb_build_object(
        'status', 'PASS',
        'entries_verified', v_count,
        'head_hash', v_expected_prev_hash
    );
END;
$$;

-- 12. Function: Tamper Lab Simulator (Safe: NEVER modifies production ledger)
CREATE OR REPLACE FUNCTION public.simulate_tamper_ledger(
    p_project_id UUID,
    p_tamper_index INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_entries JSONB;
    v_entry JSONB;
    v_tampered_payload JSONB;
    v_expected_prev TEXT := 'GENESIS';
    v_computed TEXT;
    v_len INTEGER;
    i INTEGER;
    v_actual_prev TEXT;
    v_actual_entry_hash TEXT;
    v_entry_id TEXT;
    v_payload JSONB;
BEGIN
    -- Read production chain into in-memory JSONB array
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', id,
            'prev_hash', prev_hash,
            'entry_hash', entry_hash,
            'payload', payload,
            'created_at', created_at
        ) ORDER BY created_at ASC, id ASC
    )
    INTO v_entries
    FROM public.ledger_entries
    WHERE project_id = p_project_id;

    IF v_entries IS NULL OR jsonb_array_length(v_entries) = 0 THEN
        RETURN jsonb_build_object(
            'status', 'ERROR',
            'reason', 'NO_ENTRIES_FOUND'
        );
    END IF;

    v_len := jsonb_array_length(v_entries);
    IF p_tamper_index < 1 OR p_tamper_index > v_len THEN
        p_tamper_index := 1;
    END IF;

    -- Alter ONLY the in-memory copy at p_tamper_index (0-indexed: p_tamper_index - 1)
    v_entry := v_entries->(p_tamper_index - 1);
    v_tampered_payload := (v_entry->'payload') || '{"tampered": true, "unauthorized_credit_grant": 99999}'::JSONB;
    v_entry := jsonb_set(v_entry, '{payload}', v_tampered_payload);
    v_entries := jsonb_set(v_entries, ARRAY[(p_tamper_index - 1)::TEXT], v_entry);

    -- Run verification over the modified in-memory chain
    FOR i IN 0..(v_len - 1) LOOP
        v_entry := v_entries->i;
        v_entry_id := v_entry->>'id';
        v_actual_prev := v_entry->>'prev_hash';
        v_actual_entry_hash := v_entry->>'entry_hash';
        v_payload := v_entry->'payload';

        -- Verify link
        IF v_actual_prev <> v_expected_prev THEN
            RETURN jsonb_build_object(
                'status', 'FAIL',
                'reason', 'PREV_HASH_MISMATCH',
                'entry_id', v_entry_id,
                'tampered_entry_index', p_tamper_index,
                'detected_at_index', i + 1,
                'expected_prev_hash', v_expected_prev,
                'actual_prev_hash', v_actual_prev,
                'production_ledger_untouched', TRUE
            );
        END IF;

        -- Verify hash
        v_computed := public.compute_entry_hash(v_actual_prev, v_payload);
        IF v_actual_entry_hash <> v_computed THEN
            RETURN jsonb_build_object(
                'status', 'FAIL',
                'reason', 'ENTRY_HASH_MISMATCH',
                'entry_id', v_entry_id,
                'tampered_entry_index', p_tamper_index,
                'detected_at_index', i + 1,
                'expected_hash', v_computed,
                'actual_hash', v_actual_entry_hash,
                'production_ledger_untouched', TRUE
            );
        END IF;

        v_expected_prev := v_actual_entry_hash;
    END LOOP;

    RETURN jsonb_build_object(
        'status', 'PASS',
        'production_ledger_untouched', TRUE
    );
END;
$$;
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
-- ==============================================================================
-- Gardenia 2K26 — Milestone 4: Resilient Outbox & Idempotency Schema
-- ==============================================================================

ALTER TABLE public.contributions ADD COLUMN IF NOT EXISTS idempotency_id TEXT UNIQUE;
ALTER TABLE public.disputes ADD COLUMN IF NOT EXISTS idempotency_id TEXT UNIQUE;
-- ==============================================================================
-- Gardenia 2K26 — Milestone 5: Schema Hardening & Relationship Optimization
-- Adds explicit foreign keys to public.profiles so PostgREST embeds resolve cleanly.
-- ==============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'projects_sponsor_profile_fkey' AND table_name = 'projects'
  ) THEN
    ALTER TABLE public.projects 
      ADD CONSTRAINT projects_sponsor_profile_fkey 
      FOREIGN KEY (sponsor_id) REFERENCES public.profiles(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'ledger_entries_actor_profile_fkey' AND table_name = 'ledger_entries'
  ) THEN
    ALTER TABLE public.ledger_entries 
      ADD CONSTRAINT ledger_entries_actor_profile_fkey 
      FOREIGN KEY (actor_id) REFERENCES public.profiles(id);
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
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
-- ==============================================================================
-- Gardenia 2K26 — Private AI Access Permission Model
-- Grants/revokes confidential local AI access per project member.
-- Sponsor is granted by default; students are denied by default.
-- ==============================================================================

-- 1. Add can_use_private_ai flag to project_members
ALTER TABLE public.project_members
    ADD COLUMN IF NOT EXISTS can_use_private_ai BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Explicit project-scoped private AI access table
CREATE TABLE IF NOT EXISTS public.project_private_ai_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    granted_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'granted' CHECK (status IN ('granted', 'revoked')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (project_id, member_id)
);

ALTER TABLE public.project_private_ai_access ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Private AI access readable by member, sponsor, or admin"
    ON public.project_private_ai_access FOR SELECT
    TO authenticated
    USING (
        member_id = auth.uid() OR
        EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_private_ai_access.project_id AND p.sponsor_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = auth.uid() AND pr.role = 'admin')
    );

CREATE POLICY "Sponsor and admin can manage private AI access"
    ON public.project_private_ai_access FOR ALL
    TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_private_ai_access.project_id AND p.sponsor_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = auth.uid() AND pr.role = 'admin')
    );

-- 3. Automatic synchronization trigger between private_ai_access and project_members
CREATE OR REPLACE FUNCTION public.sync_private_ai_access_to_member()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.status = 'granted' AND NEW.revoked_at IS NULL) THEN
        UPDATE public.project_members
        SET can_use_private_ai = TRUE
        WHERE project_id = NEW.project_id AND user_id = NEW.member_id;
    ELSE
        UPDATE public.project_members
        SET can_use_private_ai = FALSE
        WHERE project_id = NEW.project_id AND user_id = NEW.member_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_private_ai_access ON public.project_private_ai_access;
CREATE TRIGGER trg_sync_private_ai_access
AFTER INSERT OR UPDATE ON public.project_private_ai_access
FOR EACH ROW
EXECUTE FUNCTION public.sync_private_ai_access_to_member();

-- ==============================================================================
-- 9. Workspace Commits & GitHub Integration
-- ==============================================================================
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS github_repo_url TEXT DEFAULT '';

CREATE TABLE IF NOT EXISTS public.workspace_commits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    repository TEXT DEFAULT '',
    branch TEXT NOT NULL DEFAULT 'main',
    commit_hash TEXT NOT NULL,
    commit_message TEXT NOT NULL,
    changed_files TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workspace_commits_project ON public.workspace_commits(project_id);
CREATE INDEX IF NOT EXISTS idx_workspace_commits_user ON public.workspace_commits(user_id);

ALTER TABLE public.workspace_commits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace commits viewable by authenticated users"
    ON public.workspace_commits FOR SELECT
    TO authenticated
    USING (TRUE);

CREATE POLICY "Workspace commits insertable by authenticated users"
    ON public.workspace_commits FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

