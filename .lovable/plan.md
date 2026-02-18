

## Production-Harden Edge Functions for App Store Launch

### Issues Found

1. **`seed-test-data`**: This is a development-only function that creates fake data. It must be disabled or removed before launch -- if someone discovers the endpoint, they could flood your database even though it requires admin auth.

2. **`seed-test-data` has incomplete CORS headers**: It only allows `authorization, x-client-info, apikey, content-type` while all other functions include the full Capacitor/platform headers. This would cause CORS failures from the native app's WebView.

3. **Email sender is test-mode only**: Both `send-challenge-notification` and `send-team-freeze-notification` use `from: "onboarding@resend.dev"` which is Resend's sandbox sender. Emails will fail or land in spam for real users. You need a verified domain in Resend and update the sender address.

4. **`listUsers()` is inefficient at scale**: Both notification functions call `supabase.auth.admin.listUsers()` which fetches ALL users, then filters in memory. With hundreds of users this becomes slow and could timeout. Should query only the specific users needed.

### Plan

**Step 1: Remove or disable `seed-test-data`**
- Delete `supabase/functions/seed-test-data/index.ts`
- Remove its entry from `supabase/config.toml`
- Remove the deployed function

**Step 2: Fix email sender address**
- In `send-challenge-notification/index.ts` and `send-team-freeze-notification/index.ts`, replace `"onboarding@resend.dev"` with a configurable sender read from a secret (e.g., `RESEND_FROM_EMAIL`)
- Add the new secret so you can set it to your verified Resend domain email (e.g., `notifications@yourdomain.com`)

**Step 3: Optimize user email lookups**
- In both notification functions, replace `auth.admin.listUsers()` with `auth.admin.getUserById()` for each team member's user ID
- This avoids loading the entire user table just to get 2-4 emails

**Step 4: Add request body size validation**
- Add a body size check to `delete-account` and notification functions to reject oversized payloads (protection against abuse)

### Technical Details

**Step 2 - Email sender change (both notification functions):**
```typescript
// Before
from: "onboarding@resend.dev",

// After
const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";
// ...
from: fromEmail,
```

**Step 3 - Optimized email lookup (both notification functions):**
```typescript
// Before (loads ALL users)
const { data: users } = await supabase.auth.admin.listUsers();
const emails = users.users
  .filter(u => userIds.includes(u.id) && u.email)
  .map(u => u.email!);

// After (loads only needed users)
const emails: string[] = [];
for (const uid of userIds) {
  const { data } = await supabase.auth.admin.getUserById(uid);
  if (data?.user?.email) emails.push(data.user.email);
}
```

**Files changed:**
- `supabase/functions/seed-test-data/index.ts` -- deleted
- `supabase/config.toml` -- remove seed-test-data entry
- `supabase/functions/send-challenge-notification/index.ts` -- email sender + user lookup fix
- `supabase/functions/send-team-freeze-notification/index.ts` -- email sender + user lookup fix

