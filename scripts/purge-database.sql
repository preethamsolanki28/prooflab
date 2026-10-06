-- ==============================================================================
-- ResearchMesh / Gardenia 2K26 — Complete Database Purge Script
-- Run this in the Supabase Dashboard SQL Editor (opwfsjflhoczeyllhcrf) to
-- completely clean all projects, ledger entries, and profiles.
-- ==============================================================================

-- 1. Temporarily drop the immutability triggers on ledger_entries to allow cleanup
DROP TRIGGER IF EXISTS trg_prevent_ledger_delete ON public.ledger_entries;
DROP TRIGGER IF EXISTS trg_prevent_ledger_update ON public.ledger_entries;

-- 2. Clear all tables in dependency order
DELETE FROM public.project_feedback;
DELETE FROM public.disputes;
DELETE FROM public.credentials;
DELETE FROM public.payouts;
DELETE FROM public.escrows;
DELETE FROM public.reviews;
DELETE FROM public.contributions;
DELETE FROM public.workspace_commits;
DELETE FROM public.milestones;
DELETE FROM public.agent_runs;
DELETE FROM public.charter_acceptances;
DELETE FROM public.charters;
DELETE FROM public.project_private_ai_access;
DELETE FROM public.project_private_briefs;
DELETE FROM public.project_applications;
DELETE FROM public.project_members;
DELETE FROM public.notifications;

-- 3. Clear ledger entries and projects
DELETE FROM public.ledger_entries;
DELETE FROM public.projects;

-- 4. Clear profiles
DELETE FROM public.profiles;

-- 5. Re-enable the immutability triggers on ledger_entries
CREATE TRIGGER trg_prevent_ledger_update
    BEFORE UPDATE ON public.ledger_entries
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_ledger_mutation();

CREATE TRIGGER trg_prevent_ledger_delete
    BEFORE DELETE ON public.ledger_entries
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_ledger_mutation();

-- 6. Verify table row counts
SELECT 'projects' as tbl, count(*) FROM public.projects
UNION ALL
SELECT 'ledger_entries', count(*) FROM public.ledger_entries
UNION ALL
SELECT 'profiles', count(*) FROM public.profiles;
