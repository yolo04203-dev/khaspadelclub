

# Comprehensive Security, Performance, and UX Audit -- Remediation Plan

## Audit Status Overview

### Already Passing (No Changes Needed)

| Category | Check | Status |
|----------|-------|--------|
| Security | Auth uses POST for credentials | PASS |
| Security | No passwords in URLs | PASS |
| Security | Password hashing (bcrypt via Supabase Auth) | PASS |
| Security | HTTPS on all API endpoints | PASS |
| Security | Service role key server-side only | PASS |
| Security | RLS enabled on all tables | PASS |
| Security | User enumeration prevention | PASS |
| Security | Sentry PII masking (maskAllText, blockAllMedia) | PASS (fixed in prior round) |
| Security | Public profiles view hides phone_number | PASS (fixed in prior round) |
| Security | Edge function JWT validation + role checks | PASS |
| Security | File upload type/size validation | PASS |
| Security | Input validation with Zod schemas | PASS |
| Performance | Code splitting (21 lazy routes, 3 vendor chunks) | PASS |
| Performance | Query caching (2-min stale, 10-min gc, exponential backoff) | PASS |
| Performance | Pagination (30-50 items per page) | PASS |
| Performance | Search debouncing (300ms) | PASS |
| Performance | Skeleton loaders on data-heavy pages | PASS |
| Performance | Performance budgets defined (TTI, tap, FPS, 1000 users) | PASS |
| Performance | Web Vitals tracking (FCP, LCP, CLS, INP) | PASS |
| Performance | Font preloading + preconnect hints | PASS |
| UX/Mobile | Safe area insets (notch, home indicator) | PASS |
| UX/Mobile | Touch targets >= 44px | PASS |
| UX/Mobile | No tap delay (touch-manipulation) | PASS |
| UX/Mobile | Input font >= 16px (no iOS zoom) | PASS |
| UX/Mobile | Keyboard handling (useKeyboardHeight) | PASS |
| UX/Mobile | Haptic feedback | PASS |
| UX/Mobile | Pull-to-refresh | PASS |
| UX/Mobile | Deep linking (Capacitor) | PASS |
| UX/Mobile | Status bar theme sync | PASS |
| UX/Mobile | Splash screen controlled dismissal | PASS |
| UX/Mobile | Dark mode support | PASS |
| Error Handling | Global ErrorBoundary + RouteErrorBoundary | PASS |
| Error Handling | Sentry crash reporting with tracing/replay | PASS |
| Error Handling | Unhandled rejection listeners | PASS |
| Error Handling | API client with timeouts, retries, AbortController | PASS |

---

## Issues Found and Fixes

### Issue 1: Raw `console.error` Calls Across 17 Pages (MEDIUM -- Log Hygiene)

There are 138 instances of `console.error()` across 17 page files and several components. These bypass the structured `logger` utility, which means:
- In production, raw stack traces and potentially sensitive error context (user IDs, team IDs, query parameters) appear in the browser console
- Errors are not consistently formatted or filterable
- No centralized control over what gets logged in production vs development

**Fix:** Replace all `console.error(...)` calls in `src/pages/` and `src/components/` with `logger.error(...)` or `logger.apiError(...)` as appropriate. This is a systematic find-and-replace across all affected files.

**Files affected:** `PlayerProfile.tsx`, `Players.tsx`, `Profile.tsx`, `TournamentCreate.tsx`, `CreateTeam.tsx`, `LadderDetail.tsx`, `AmericanoCreate.tsx`, `LadderManage.tsx`, `Americano.tsx`, `Admin.tsx`, `Stats.tsx`, `Tournaments.tsx`, `AmericanoSession.tsx`, `FindOpponents.tsx`, `TournamentDetail.tsx`, `ScoreConfirmationCard.tsx`, `InvitePartnerDialog.tsx`, `PlayersTab.tsx`, `MatchesTab.tsx`, `PendingInvitations.tsx`, `JoinRequestsManagement.tsx`, `Hero.tsx`, `Header.tsx`

---

### Issue 2: Seed Data Edge Function Has No Authentication (HIGH -- Security)

The `seed-test-data` edge function creates up to 1000 teams, 5000 challenges, and 3000 matches with no authentication check. Any unauthenticated request can flood the database with test data. The function also has `verify_jwt = false` in `config.toml`.

**Fix:** Add JWT verification and admin role check to the seed function. Only users with the `admin` role should be able to seed test data. Update `config.toml` to set `verify_jwt = true` for this function.

**Files:** `supabase/functions/seed-test-data/index.ts`, `supabase/config.toml`

---

### Issue 3: Email Notification Function Logs Email Addresses (MEDIUM -- PII Leak)

In `send-challenge-notification/index.ts` (line 259), the function logs recipient email addresses:
```
console.log(`Sending ${type} notification to:`, emails);
```

Edge function logs are stored and could be accessed by anyone with backend access. Email addresses are PII and should not appear in logs.

**Fix:** Replace the log with a count: `console.log(\`Sending ${type} notification to ${emails.length} recipients\`)`. Remove all other PII from edge function logs.

**File:** `supabase/functions/send-challenge-notification/index.ts`

---

### Issue 4: No Account Deletion Feature (MEDIUM -- GDPR Compliance)

There is no mechanism for users to delete their account and all associated data. Under GDPR Article 17 ("Right to Erasure"), users must be able to request deletion of their personal data.

**Fix:** Add a "Delete Account" button to the Profile page that:
1. Shows a confirmation dialog explaining what will be deleted
2. Calls a new `delete-account` edge function
3. The edge function deletes the user's profile, team memberships, and auth account using the service role
4. Signs the user out and redirects to the landing page

**Files:** New `supabase/functions/delete-account/index.ts`, update `src/pages/Profile.tsx`

---

### Issue 5: No In-App Feedback / Support Mechanism (LOW -- App Store Compliance)

The Contact page exists but there is no in-app feedback mechanism for logged-in users to report issues or provide feedback. App Store and Play Store guidelines recommend providing a way for users to contact support from within the app.

**Fix:** Add a "Report Issue" or "Send Feedback" link in the Profile page that navigates to `/contact` with context pre-filled (user ID, app version).

**File:** `src/pages/Profile.tsx`

---

## Technical Details

### File Changes Summary

| File | Change |
|------|--------|
| 17 page files + 6 component files | Replace `console.error` with `logger.error` / `logger.apiError` |
| `supabase/functions/seed-test-data/index.ts` | Add admin-only auth check |
| `supabase/config.toml` | Set `verify_jwt = true` for seed-test-data |
| `supabase/functions/send-challenge-notification/index.ts` | Remove email addresses from logs |
| `supabase/functions/delete-account/index.ts` | New -- account deletion edge function |
| `src/pages/Profile.tsx` | Add Delete Account button + Feedback link |

### Manual Steps Required (Outside Lovable Scope)

- **Leaked Password Protection**: Must be enabled manually in the backend dashboard under Authentication > Settings > Security. This was flagged in a prior audit and remains the only linter warning.
- **Real-Device Testing**: Battery/memory profiling, network throttling (3G/4G), and native permission testing require local device access.
- **Penetration Testing**: OWASP ZAP, Burp Suite, or similar tools should be run against the deployed app for comprehensive vulnerability scanning.
- **App Store Submission**: Privacy policy and terms pages exist at `/privacy` and `/terms` -- content should be reviewed by legal counsel before submission.

