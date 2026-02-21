
-- Rate limiting table for edge functions
CREATE TABLE public.rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for efficient lookups
CREATE INDEX idx_rate_limits_user_action_time ON public.rate_limits (user_id, action, created_at DESC);

-- Enable RLS
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- No direct access policies needed - only accessed via SECURITY DEFINER function

-- Cleanup: auto-delete entries older than 1 hour to keep table small
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_user_id UUID,
  p_action TEXT,
  p_max_requests INT,
  p_window_seconds INT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count INT;
  v_window_start TIMESTAMPTZ;
BEGIN
  v_window_start := now() - (p_window_seconds || ' seconds')::INTERVAL;
  
  -- Clean up old entries for this user/action (older than window)
  DELETE FROM public.rate_limits
  WHERE user_id = p_user_id AND action = p_action AND created_at < v_window_start;
  
  -- Count recent requests
  SELECT COUNT(*) INTO v_count
  FROM public.rate_limits
  WHERE user_id = p_user_id AND action = p_action AND created_at >= v_window_start;
  
  -- If over limit, reject
  IF v_count >= p_max_requests THEN
    RETURN FALSE;
  END IF;
  
  -- Record this request
  INSERT INTO public.rate_limits (user_id, action, created_at)
  VALUES (p_user_id, p_action, now());
  
  RETURN TRUE;
END;
$$;
