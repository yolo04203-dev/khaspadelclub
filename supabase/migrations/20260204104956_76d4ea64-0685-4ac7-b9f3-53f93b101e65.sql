
-- Create enum for request status
CREATE TYPE public.ladder_request_status AS ENUM ('pending', 'approved', 'rejected');

-- Create ladder join requests table
CREATE TABLE public.ladder_join_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  ladder_category_id UUID NOT NULL REFERENCES public.ladder_categories(id) ON DELETE CASCADE,
  status public.ladder_request_status NOT NULL DEFAULT 'pending',
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  responded_at TIMESTAMP WITH TIME ZONE,
  responded_by UUID,
  admin_notes TEXT,
  UNIQUE (team_id, ladder_category_id)
);

-- Enable RLS
ALTER TABLE public.ladder_join_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can view requests (for transparency)
CREATE POLICY "Anyone can view ladder join requests"
ON public.ladder_join_requests
FOR SELECT
USING (true);

-- Team captains can create requests for their team
CREATE POLICY "Team captains can create join requests"
ON public.ladder_join_requests
FOR INSERT
WITH CHECK (is_team_captain(auth.uid(), team_id));

-- Team captains can cancel their own pending requests
CREATE POLICY "Team captains can delete pending requests"
ON public.ladder_join_requests
FOR DELETE
USING (is_team_captain(auth.uid(), team_id) AND status = 'pending');

-- Admins can manage all requests
CREATE POLICY "Admins can manage join requests"
ON public.ladder_join_requests
FOR ALL
USING (is_admin(auth.uid()));

-- Create index for faster lookups
CREATE INDEX idx_ladder_join_requests_category ON public.ladder_join_requests(ladder_category_id);
CREATE INDEX idx_ladder_join_requests_status ON public.ladder_join_requests(status);
