

## Fix Authentication Issues

### Problem 1: Password Reset Redirects to Home Page

The `redirectTo` in `Auth.tsx` line 133 points to `/auth?reset=true`, but there is no `/reset-password` page and no logic to handle the recovery token. Supabase sends the user back with hash fragments (`#access_token=...&type=recovery`), which get ignored.

### Problem 2: Company Email Signups Failing

No frontend email domain restriction was found in the code. The signup schema uses standard `z.string().email()` with no domain filtering. The auth logs show `429: email rate limit exceeded` errors for company domains — this is a **rate limit issue**, not a domain restriction. Multiple rapid signup attempts from the same IP are hitting the rate limiter. The emails themselves are not blocked by domain.

I'll inform the user about the rate limit situation and fix the actual broken flow (password reset).

### Changes

**1. Create `src/pages/ResetPassword.tsx`**
- Detects `type=recovery` in URL hash (Supabase appends `#access_token=...&type=recovery`)
- Calls `supabase.auth.getSession()` to verify the recovery session is active
- Shows new password + confirm password form
- Calls `supabase.auth.updateUser({ password })` on submit
- Handles expired/invalid token gracefully
- Redirects to `/auth` on success
- Uses same styling as Auth page (no design changes)

**2. Update `src/pages/Auth.tsx`**
- Change `redirectTo` from `/auth?reset=true` to `/reset-password` (line 133)

**3. Update `src/App.tsx`**
- Add `/reset-password` as a public route (no AuthProvider needed, Supabase handles the session via hash)
- Import lazy `ResetPassword` component

**4. Update `src/components/AuthenticatedRoutes.tsx`** (no change needed — `/reset-password` is a public route in App.tsx)

**5. Handle Capacitor deep links**
- The `NativeLifecycleManager` in App.tsx already handles `appUrlOpen` deep links and navigates to the path — this will work for `/reset-password` links automatically

### Email Domain Issue — User Communication
The company email signups are failing due to email rate limits (429 errors), not domain restrictions. The code has no domain filtering. The rate limit resets automatically. I'll note this to the user.

