
-- Recreate public_profiles view WITHOUT security_invoker so all authenticated users can query it
DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles AS
  SELECT 
    user_id,
    display_name,
    avatar_url,
    skill_level,
    bio,
    is_looking_for_team,
    preferred_play_times,
    created_at
  FROM public.profiles;

-- Grant SELECT on the view to authenticated and anon roles
GRANT SELECT ON public.public_profiles TO authenticated;
GRANT SELECT ON public.public_profiles TO anon;
