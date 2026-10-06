-- ==============================================================================
-- Gardenia 2K26 / ResearchMesh — Migration 20261006000004
-- Workspace Integration, GitHub Repo Tracking & Simplified Credits
-- ==============================================================================

-- 1. Ensure projects table has GitHub repository URL
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS github_repo_url TEXT DEFAULT '';

-- 2. Workspace Commits Table for tracking Git commits in project workspaces
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

-- Workspace Commits RLS: viewable by authenticated users
CREATE POLICY "Workspace commits viewable by authenticated users"
    ON public.workspace_commits FOR SELECT
    TO authenticated
    USING (TRUE);

-- Workspace Commits RLS: insertable by authenticated user for themselves
CREATE POLICY "Workspace commits insertable by authenticated users"
    ON public.workspace_commits FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);
