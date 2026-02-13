

# Final QA Round -- Findings and Fixes

## Assessment Summary

The app is in strong production shape. This final round identified **3 actionable code/database fixes** and **2 manual actions** needed before launch.

---

## 1. Security Fixes

### 1a. CRITICAL: Tournament Participants Payment Data Exposed (ERROR)

The `tournament_participants` table has a SELECT policy with `USING (true)`, meaning **any authenticated user** can read `payment_status`, `payment_notes`, and `payment_confirmed_by` for all participants. This is a privacy violation.

**Fix:** Create a `tournament_participants_public` view that excludes payment fields, add a public SELECT policy to the view, and restrict the base table SELECT to only tournament creators, team members, and admins.

**Database migration:**
- Create view `tournament_participants_public` (excluding `payment_status`, `payment_notes`, `payment_confirmed_by`)
- Drop the overly permissive SELECT policy on `tournament_participants`
- Replace with a restrictive policy allowing SELECT only to: tournament creator, team captain of the participating team, or admin
- Add a public SELECT policy on the view for general visibility (team name, category, etc.)

**Code change:** Update any frontend code that reads `tournament_participants` for display purposes to use the public view instead. Tournament creators/admins who manage payments can continue querying the base table (their RLS policy permits it).

### 1b. WARN: public_profiles View Has No RLS Policies

The `public_profiles` view has RLS enabled but zero policies, making it completely inaccessible. This likely breaks the Player Directory and team-building features.

**Fix:** Add a SELECT policy on `public_profiles` allowing all authenticated users to read (this view already excludes `phone_number`).

**Database migration:**
```sql
CREATE POLICY "Anyone can view public profiles"
ON public.public_profiles FOR SELECT
TO authenticated
USING (true);
```

### 1c. WARN: Leaked Password Protection

This must be enabled manually in the Lovable Cloud authentication settings. It cannot be done via code.

**Action:** Enable Leaked Password Protection in the backend authentication settings.

---

## 2. Performance Fixes

### 2a. Remove framer-motion from Auth.tsx (Critical Path)

`Auth.tsx` is eagerly loaded and imports `motion` from `framer-motion` (line 3), pulling the animation chunk into the initial bundle. The `motion.div` at line 170 only does a simple fade-in.

**Fix in `src/pages/Auth.tsx`:**
- Remove `import { motion } from "framer-motion"` (line 3)
- Replace `<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>` with `<div className="animate-fade-in">`
- Replace closing `</motion.div>` with `</div>`
- Add a CSS animation class if `animate-fade-in` doesn't already exist (check tailwind config)

### 2b. Lazy-load Dashboard

Dashboard is eagerly imported (line 22 of App.tsx) but only needed after authentication. Landing page visitors pay for this in their initial bundle.

**Fix in `src/App.tsx`:**
- Move `import Dashboard from "./pages/Dashboard"` to lazy import pattern:
  ```typescript
  const Dashboard = lazy(() => import("./pages/Dashboard"));
  ```
- Add `Dashboard` to the `lazyImports` object for prefetching support

---

## 3. Security Findings to Dismiss

### 3a. profiles table (info level)
The profiles table has no public SELECT policy -- only own-profile and admin access. This is correct and intentional.

### 3b. team_invitations email exposure (warn level)
RLS restricts visibility to the invited user and the team captain only. Email exposure is limited to necessary parties. Mark as ignored.

---

## 4. Already Verified (No Changes Needed)

| Area | Status |
|------|--------|
| Auth: Zod validation, generic errors, enumeration prevention | Pass |
| Auth: Roles in separate `user_roles` table with `SECURITY DEFINER` | Pass |
| Auth: Session refresh (55-min interval + `useSessionGuard`) | Pass |
| Auth: OAuth via Google with proper redirect | Pass |
| HTTPS: All Supabase communication | Pass |
| RLS: 23 tables, all with RLS enabled | Pass |
| Sentry: PII masking (`maskAllText`, `blockAllMedia`) | Pass |
| Bundle: Manual chunk splitting (react, ui, animation, charts, supabase, sentry) | Pass |
| Bundle: Sentry deferred via `requestIdleCallback` | Pass |
| Caching: 2-min stale, 10-min gc, retry with exponential backoff | Pass |
| Lazy loading: All non-critical routes with hover/touch prefetch | Pass |
| Mobile: Capacitor lifecycle, safe areas, keyboard handling | Pass |
| Mobile: 44px touch targets, `touch-action: manipulation` | Pass |
| Mobile: 16px input font-size (prevents iOS zoom) | Pass |
| Offline: Service worker (network-first), offline/slow banners | Pass |
| Error handling: ErrorBoundary, RouteErrorBoundary, toast notifications | Pass |
| Account deletion: Edge function exists (`delete-account`) | Pass |
| Legal: Privacy Policy and Terms of Service pages exist and updated | Pass |
| Contact: Feedback form at `/contact` | Pass |
| Deep linking: Capacitor `appUrlOpen` handler | Pass |
| Background resume: `appStateChange` refetches active queries | Pass |

---

## Implementation Order

1. Database migration: Fix `tournament_participants` SELECT policy + add `public_profiles` SELECT policy
2. Code: Update tournament participant reads to use public view where appropriate
3. Code: Remove `framer-motion` from `Auth.tsx`
4. Code: Lazy-load Dashboard in `App.tsx`
5. Security findings: Dismiss false positives
6. Manual: Enable Leaked Password Protection in backend settings

