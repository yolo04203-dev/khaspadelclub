

# Security Audit Report and Remediation Plan

## Audit Results Summary

### PASSED (No Action Needed)

| Check | Status | Details |
|-------|--------|---------|
| Auth uses POST, not GET | PASS | `signInWithPassword` and `signUp` use POST via Supabase SDK |
| No passwords in URLs | PASS | Credentials sent in request body only |
| No hardcoded credentials | PASS | Only the public anon key is in the codebase (this is by design) |
| Service role key server-side only | PASS | Used only in edge functions via `Deno.env.get()`, never in frontend |
| Password hashing | PASS | Handled by Supabase Auth (bcrypt), never stored in plaintext |
| HTTPS everywhere | PASS | All Supabase endpoints use HTTPS; no HTTP URLs in codebase |
| No sensitive data in localStorage | PASS | Only Supabase session (managed by SDK with `autoRefreshToken`) |
| Input validation | PASS | Zod schemas on login/signup/forgot-password forms |
| Error boundaries | PASS | Global `ErrorBoundary` + per-route `RouteErrorBoundary` |
| Crash reporting | PASS | Sentry with tracing and replay |
| User enumeration prevention | PASS | Generic error messages on login, signup, and forgot password |
| Token refresh | PASS | `autoRefreshToken: true` + manual 55-min interval fallback |
| XSS via dangerouslySetInnerHTML | PASS | Only used in `chart.tsx` with static theme data, no user input |
| RLS on all tables | PASS | Every table has RLS enabled with appropriate policies |
| Role storage | PASS | Roles stored in separate `user_roles` table with `is_admin()` security definer function |
| Edge function auth | PASS | Manual JWT validation + role checks before service role key usage |
| File upload validation | PASS | Type check (`image/*`) and size limit (5MB) on avatar upload |

---

### ISSUES FOUND (Require Fixes)

---

### Issue 1: Sentry Session Replay Records All Text and Media (HIGH)

**File:** `src/lib/errorReporting.ts` (line 16)

Sentry Replay is configured with `maskAllText: false` and `blockAllMedia: false`. This means every session replay captures raw text content from the screen -- including email addresses, display names, phone numbers, bios, and any other PII visible in the UI. Sentry stores this data on their servers, creating a data exposure risk and potential GDPR violation.

**Fix:** Set `maskAllText: true` and `blockAllMedia: true` so replays mask sensitive content by default. If specific non-sensitive elements need to be visible in replays, use Sentry's `data-sentry-unmask` attribute selectively.

---

### Issue 2: Profiles Table Exposes Phone Numbers to Other Users (HIGH)

**Current RLS:** The `profiles` table has SELECT policies for "Users can view their own profile" and "Admins can view all profiles." However, the `PlayerProfile.tsx` page queries another user's profile by `user_id` (line 57-61). This query will fail for non-admin users due to RLS, meaning the Players page currently cannot display other users' profiles correctly.

There are two sub-issues:
1. If a broader SELECT policy is added later to make player profiles work, it would expose `phone_number` to all authenticated users.
2. The `PlayerProfile.tsx` page likely returns empty data for non-admin users right now, which is a functional bug.

**Fix:** Create a database VIEW called `public_profiles` that exposes only safe fields (`user_id`, `display_name`, `avatar_url`, `skill_level`, `bio`, `is_looking_for_team`, `created_at`) and excludes `phone_number`. Add a permissive SELECT policy on the view for all authenticated users. Update `PlayerProfile.tsx` and `Players.tsx` to query from this view instead.

---

### Issue 3: Team Invitations Expose Email Addresses (MEDIUM)

**Current RLS:** The `team_invitations` table has a SELECT policy that allows users to view invitations where `invited_email` matches their own email. However, the policy reads the user's email from `auth.users` via a subquery, which could allow enumeration if an attacker crafts queries to probe different `invited_email` values.

The `invited_email` field is stored in plaintext and is visible to team captains who can view sent invitations.

**Fix:** This is partially mitigated because captains can only see invitations they created. However, the email should be sanitized in the response -- consider hashing or partially masking the email in the SELECT query (e.g., showing `j***@example.com`). Alternatively, store only `invited_user_id` when the user exists, and use `invited_email` only for users not yet registered.

---

### Issue 4: Leaked Password Protection Disabled (MEDIUM)

**Source:** Supabase security linter

The "Leaked Password Protection" feature in Supabase Auth is disabled. This feature checks passwords against known breached databases (HaveIBeenPwned) and prevents users from setting compromised passwords.

**Fix:** This must be enabled manually in the Lovable Cloud backend settings (Authentication > Settings > Security). It cannot be done through code.

---

### Issue 5: Console Logging of Error Objects May Leak Sensitive Context (LOW)

**File:** `src/pages/Auth.tsx` (line 136)

The `console.error("Password reset error:", error)` call logs the full error object, which could contain request details or user input in some edge cases. While this is only visible in the user's own browser console, it's a best practice to sanitize error logging.

**Fix:** Replace with `logger.authError("passwordReset", error)` which uses the structured logger and strips stack traces in production.

---

## Remediation Plan

### Step 1: Fix Sentry Replay PII Exposure
Update `src/lib/errorReporting.ts` line 16:
- Change `maskAllText: false` to `maskAllText: true`
- Change `blockAllMedia: false` to `blockAllMedia: true`

### Step 2: Create Public Profiles View
Create a database migration with a `public_profiles` view exposing only non-sensitive fields. Add RLS-equivalent security via the view definition. Update `PlayerProfile.tsx` and `Players.tsx` to query from the view.

### Step 3: Sanitize Auth Console Logging
Replace `console.error("Password reset error:", error)` in `Auth.tsx` with `logger.authError("passwordReset", error)` for structured, non-leaking error logging.

### Step 4: Document Manual Steps
The following require manual action outside of code:
- Enable Leaked Password Protection in Lovable Cloud backend settings
- Review Sentry replay recordings for any already-captured PII

### Files to Modify

| File | Change |
|------|--------|
| `src/lib/errorReporting.ts` | Set `maskAllText: true`, `blockAllMedia: true` |
| `src/pages/Auth.tsx` | Replace `console.error` with `logger.authError` |
| Database migration | Create `public_profiles` view excluding `phone_number` |
| `src/pages/PlayerProfile.tsx` | Query from `public_profiles` view |
| `src/pages/Players.tsx` | Query from `public_profiles` view (if applicable) |

