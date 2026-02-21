
-- Drop the overly permissive insert policies
DROP POLICY IF EXISTS "Anon users can insert errors" ON public.client_errors;
DROP POLICY IF EXISTS "Users can insert their own errors" ON public.client_errors;

-- Authenticated users can only insert errors with their own user_id
CREATE POLICY "Authenticated users can insert own errors"
ON public.client_errors
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Anonymous users can insert errors but user_id must be null
CREATE POLICY "Anonymous users can insert errors"
ON public.client_errors
FOR INSERT
TO anon
WITH CHECK (user_id IS NULL);
