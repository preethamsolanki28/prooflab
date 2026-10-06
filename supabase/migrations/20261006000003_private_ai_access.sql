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
