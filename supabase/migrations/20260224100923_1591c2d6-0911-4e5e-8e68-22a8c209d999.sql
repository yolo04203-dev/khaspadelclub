
-- Create audit log table for admin ladder edits
CREATE TABLE public.ladder_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID NOT NULL,
  action TEXT NOT NULL,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  ladder_category_id UUID REFERENCES public.ladder_categories(id) ON DELETE SET NULL,
  old_values JSONB,
  new_values JSONB,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ladder_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can insert and view audit logs
CREATE POLICY "Admins can insert audit logs"
ON public.ladder_audit_log
FOR INSERT
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can view audit logs"
ON public.ladder_audit_log
FOR SELECT
USING (is_admin(auth.uid()));
