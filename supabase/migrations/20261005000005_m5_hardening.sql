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
