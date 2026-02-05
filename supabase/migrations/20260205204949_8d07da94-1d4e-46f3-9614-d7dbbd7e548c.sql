-- Enhance profiles table with new fields
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS skill_level text,
  ADD COLUMN IF NOT EXISTS phone_number text,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS is_looking_for_team boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS preferred_play_times text[];

-- Add team recruitment flags
ALTER TABLE public.teams 
  ADD COLUMN IF NOT EXISTS is_recruiting boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS recruitment_message text;

-- Add decline reason for challenges
ALTER TABLE public.challenges 
  ADD COLUMN IF NOT EXISTS decline_reason text;

-- Create team invitations table
CREATE TABLE IF NOT EXISTS public.team_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  invited_email text,
  invited_user_id uuid,
  invited_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days')
);

-- Enable RLS on team_invitations
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for team_invitations
CREATE POLICY "Anyone can view their invitations"
  ON public.team_invitations FOR SELECT
  USING (invited_user_id = auth.uid() OR invited_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Team captains can view sent invitations"
  ON public.team_invitations FOR SELECT
  USING (is_team_captain(auth.uid(), team_id));

CREATE POLICY "Team captains can create invitations"
  ON public.team_invitations FOR INSERT
  WITH CHECK (is_team_captain(auth.uid(), team_id));

CREATE POLICY "Invited users can update invitation status"
  ON public.team_invitations FOR UPDATE
  USING (invited_user_id = auth.uid() OR invited_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Team captains can delete invitations"
  ON public.team_invitations FOR DELETE
  USING (is_team_captain(auth.uid(), team_id));

CREATE POLICY "Admins can manage all invitations"
  ON public.team_invitations FOR ALL
  USING (is_admin(auth.uid()));

-- Create avatars storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars bucket
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);