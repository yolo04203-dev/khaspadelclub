-- Add freeze columns to teams table
ALTER TABLE public.teams 
ADD COLUMN is_frozen boolean DEFAULT false,
ADD COLUMN frozen_until timestamp with time zone,
ADD COLUMN frozen_reason text,
ADD COLUMN frozen_by uuid,
ADD COLUMN frozen_at timestamp with time zone;