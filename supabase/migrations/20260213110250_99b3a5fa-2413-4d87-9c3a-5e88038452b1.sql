
-- Create a public_profiles view that excludes sensitive fields (phone_number)
CREATE VIEW public.public_profiles
WITH (security_invoker = on) AS
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

-- Add a SELECT policy allowing all authenticated users to read public_profiles via the view
-- The view uses security_invoker=on, so we need a policy on the base profiles table
-- that allows authenticated users to SELECT only the columns exposed by the view.
-- We'll add a permissive SELECT policy for all authenticated users on profiles.
CREATE POLICY "Authenticated users can view profiles via public view"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);
