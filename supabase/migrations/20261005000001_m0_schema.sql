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
