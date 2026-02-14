
-- Create client_errors table for in-app error analytics
CREATE TABLE public.client_errors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  message TEXT NOT NULL,
  stack TEXT,
  page_url TEXT,
  user_agent TEXT,
  device_info JSONB DEFAULT '{}'::JSONB,
  severity TEXT NOT NULL DEFAULT 'error',
  resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_errors ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can insert their own errors
CREATE POLICY "Users can insert their own errors"
ON public.client_errors
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow anonymous inserts for logged-out users too
CREATE POLICY "Anon users can insert errors"
ON public.client_errors
FOR INSERT
TO anon
WITH CHECK (true);

-- Admins can read all errors
CREATE POLICY "Admins can read all errors"
ON public.client_errors
FOR SELECT
USING (public.is_admin(auth.uid()));

-- Admins can update (resolve) errors
CREATE POLICY "Admins can update errors"
ON public.client_errors
FOR UPDATE
USING (public.is_admin(auth.uid()));

-- Index for admin queries
CREATE INDEX idx_client_errors_created_at ON public.client_errors (created_at DESC);
CREATE INDEX idx_client_errors_resolved ON public.client_errors (resolved, created_at DESC);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.client_errors;
