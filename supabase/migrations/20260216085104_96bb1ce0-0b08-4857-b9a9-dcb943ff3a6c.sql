-- Add is_test flag to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_test boolean DEFAULT false;

-- Index for teams.created_by (admin/seed queries)
CREATE INDEX IF NOT EXISTS idx_teams_created_by ON public.teams(created_by);

-- Index for americano_sessions.created_by
CREATE INDEX IF NOT EXISTS idx_americano_sessions_created_by ON public.americano_sessions(created_by);