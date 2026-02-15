

# Update Observability: Sentry + PostHog Clear Responsibilities

## Overview

Reassign session replay from Sentry to PostHog, add cross-linking between the two systems, and tighten sampling/privacy settings on both sides.

## Changes

### 1. `src/lib/analytics/posthog.ts` -- Enable session replay + cross-linking

- Change `disable_session_recording: true` to `disable_session_recording: false` (production only; stays disabled in dev via `isEnabled()` gate)
- Add `session_recording` config block with privacy-first settings:
  - `maskAllInputs: true`
  - `maskTextSelector: "input[type=password], input[type=email], input[name*=otp], input[name*=pin], input[name*=card], input[name*=cvc], input[name*=phone]"`
  - `networkPayloadCapture: { recordBody: false, recordHeaders: false }`
- Add a `getSessionId()` helper that returns `posthogInstance?.get_session_id()` for cross-linking
- Add a `getDistinctId()` helper that returns `posthogInstance?.get_distinct_id()`

### 2. `src/lib/errorReporting.ts` -- Reduce Sentry replay, add cross-linking

- Change `REPLAYS_SESSION_RATE` from `0.05` (prod) to `0` -- Sentry no longer records general sessions (PostHog owns replay)
- Change `REPLAYS_ERROR_RATE` from `1.0` to `0.5` -- moderate crash-only sampling
- In `beforeSend`, attach PostHog context to every Sentry event:
  - Import `analytics` and call `getSessionId()` / `getDistinctId()`
  - Set `event.tags.posthog_session_id` and `event.contexts.posthog.distinct_id`
- Add `set-cookie` and `session` to the `SENSITIVE_KEYS` regex (currently missing per the request)
- In `setErrorReportingUser`, stop sending `email` to Sentry (change to `{ id: user.id }` only) to match PII policy
- The existing `beforeSend` PII scrubbing, bot filtering, and breadcrumb redaction remain unchanged

### 3. `src/contexts/AuthContext.tsx` -- Dual identification

Already calls both `setErrorReportingUser` and `analytics.identify` on login, and `clearErrorReportingUser` + `analytics.reset` on logout. No changes needed -- this is already correct.

### 4. `src/pages/Admin.tsx` -- No changes needed

Already has "Test Error" (Sentry) and "Test Analytics" (PostHog) buttons.

### 5. Environment variables

- `VITE_POSTHOG_KEY` -- already configured as a secret
- `VITE_POSTHOG_HOST` -- reads from env, defaults to `https://app.posthog.com` (already in code)
- `VITE_SENTRY_DSN` -- already reads from env (line 6 of errorReporting.ts)

No new secrets to add.

## Technical Details

### Files modified

| File | What changes |
|---|---|
| `src/lib/analytics/posthog.ts` | Enable replay, add masking config, export `getSessionId`/`getDistinctId` |
| `src/lib/errorReporting.ts` | Lower replay rates, add PostHog cross-link tags in `beforeSend`, expand sensitive key regex, remove email from `setUser` |

### Files unchanged

| File | Why |
|---|---|
| `src/contexts/AuthContext.tsx` | Already calls both Sentry `setUser` and PostHog `identify`/`reset` |
| `src/pages/Admin.tsx` | Already has test buttons for both systems |
| `src/main.tsx` | Already initializes both systems |
| `src/components/ErrorBoundary.tsx` | Already provides friendly fallback UI with "Report issue" copy-to-clipboard |
| `src/components/ReportProblemDialog.tsx` | Already sends feedback via `Sentry.captureFeedback` |
| `vite.config.ts` | Already has `analytics` and `sentry` chunks |

### Responsibility matrix after changes

```text
+-----------------------+---------+---------+
| Capability            | Sentry  | PostHog |
+-----------------------+---------+---------+
| Error monitoring      |   Yes   |   No    |
| Performance tracing   |   Yes   |   No    |
| Session replay (UX)   |   No    |   Yes   |
| Session replay (crash)|  0.5x   |   No    |
| Product analytics     |   No    |   Yes   |
| Feature flags         |   No    |   Yes   |
| User identification   |   Yes   |   Yes   |
| Cross-linking         |   Yes   |   Yes   |
+-----------------------+---------+---------+
```

### Privacy controls summary

- PostHog replay: all inputs masked, sensitive field selectors blocked, no network bodies/headers captured
- Sentry: existing PII scrubbing in `beforeSend`/`beforeBreadcrumb` plus expanded `set-cookie`/`session` keywords; email removed from `setUser`
- Both systems: no passwords, tokens, OTPs, or card data leave the browser

