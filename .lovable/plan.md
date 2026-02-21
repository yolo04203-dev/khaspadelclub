

# Security Audit: Comprehensive Review

## 1. Password Requirements

**Current state**: The client-side Zod schema only requires 6 characters (`min(6)`). There is no enforcement of uppercase, lowercase, or numeric characters -- either client-side or server-side.

**Fix**:
- Update the `signupSchema` and `loginSchema` in `src/pages/Auth.tsx` to require min 8 characters with regex validation for uppercase, lowercase, and number.
- The login schema only needs `min(1)` (since we validate on signup); but updating to `min(8)` is fine for UX consistency.

---

## 2. Exposed API Keys / Secrets

**Finding: CLEAN** -- No issues found.
- No `service_role` key in frontend code.
- The Supabase anon key and URL are public/publishable keys -- this is expected and safe.
- Sentry DSN is loaded via `VITE_SENTRY_DSN` (publishable).
- PostHog key is loaded via `VITE_POSTHOG_KEY` (publishable).
- All sensitive keys (RESEND_API_KEY, SERVICE_ROLE_KEY) are only used inside Edge Functions via `Deno.env.get()`.
- `errorReporting.ts` actively scrubs tokens, passwords, and PII before sending to Sentry.

---

## 3. Form Submission Security

**Finding: XSS vulnerability in `send-contact-message` Edge Function.**
- Line 100: `${message.replace(/\n/g, "<br />")}` -- user-provided `name`, `email`, `subject`, and `message` are interpolated directly into HTML without escaping. This allows HTML/script injection in the email body.
- The `send-challenge-notification` and `send-team-freeze-notification` functions correctly use `escapeHtml()` for all user inputs.
- The contact message function does NOT use `escapeHtml()`.

**Fix**: Add the `escapeHtml` utility to `send-contact-message/index.ts` and escape `name`, `email`, `subject`, and `message` before HTML interpolation.

**Other forms reviewed (no issues)**:
- Auth forms use Zod validation with proper schemas.
- `SetScoreDialog` validates padel set scores with strict numeric bounds.
- `AvatarUpload` validates file type and size (5MB limit).
- `ReportProblemDialog` limits input to 500 chars.
- Contact form has server-side length validation and email regex.
- No `dangerouslySetInnerHTML` with user content (chart.tsx usage is internal theme CSS only).
- All database operations use the Supabase SDK with parameterized queries -- no raw SQL injection risk.

---

## 4. Rate Limiting

**Finding: No server-side rate limiting on any Edge Function.**

Rate limiting on Lovable Cloud Edge Functions is not directly configurable via code (no built-in middleware). However, practical mitigations are already in place:
- **Login/signup/password reset**: These go through Supabase Auth, which has built-in rate limiting at the infrastructure level (e.g., rate limits on `signInWithPassword`, `signUp`, `resetPasswordForEmail`).
- **Contact form** (`send-contact-message`): Requires JWT authentication (validates claims), so only logged-in users can send. This inherently limits abuse to registered accounts.
- **Client-side logger**: Already has rate limiting (20 errors/minute, dedup, batching).

**No actionable changes** -- Supabase Auth handles rate limiting for auth endpoints. The Edge Functions are already auth-gated. Adding in-function rate limiting would require external state (database or KV store) which adds complexity without proportional benefit for the current scale.

---

## 5. Security Headers

**Finding: Limited control -- headers are managed by the hosting platform (Lovable Cloud / Netlify).**

What is already configured:
- `_redirects` handles SPA routing.
- Service Worker correctly excludes Supabase API calls and OAuth redirects from caching.
- CORS headers on Edge Functions use `Access-Control-Allow-Origin: *` (standard for SPA-to-API calls).

What cannot be configured via code:
- `Content-Security-Policy`, `X-Frame-Options`, `Strict-Transport-Security`, `X-Content-Type-Options` are all set by the hosting infrastructure and cannot be overridden via `_redirects` or `index.html` meta tags in a meaningful way on Lovable Cloud.
- CSP via meta tag is limited (no control over `frame-ancestors`, no report-uri support).

**No actionable changes** -- these headers are managed at the infrastructure level by Lovable Cloud.

---

## Summary of Changes

| Area | Status | Action |
|------|--------|--------|
| Password requirements | Weak | Strengthen to 8+ chars, 1 upper, 1 lower, 1 number |
| Exposed secrets | Clean | No changes needed |
| XSS in contact email | Vulnerable | Add HTML escaping to send-contact-message |
| SQL injection | Clean | No changes needed |
| Rate limiting | Adequate | Supabase Auth handles auth endpoints |
| Security headers | Platform-managed | No changes possible |

## Technical Implementation

### File 1: `src/pages/Auth.tsx`
- Update `signupSchema.password` to: `z.string().min(8).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/)`
- Add user-friendly error messages for each regex rule.

### File 2: `supabase/functions/send-contact-message/index.ts`
- Add `escapeHtml()` helper function (same pattern as the other edge functions).
- Escape `name`, `email`, `subject`, and `message` before embedding in the HTML email template.

