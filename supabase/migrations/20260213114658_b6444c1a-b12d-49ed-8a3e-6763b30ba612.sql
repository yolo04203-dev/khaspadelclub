-- Fix 1: Remove overly permissive profiles SELECT policy that exposes phone_number
-- The public_profiles view (which excludes phone_number) + own-profile + admin policies are sufficient
DROP POLICY IF EXISTS "Authenticated users can view profiles via public view" ON public.profiles;