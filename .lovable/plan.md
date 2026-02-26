

## Plan: Create Google Play Store Demo/Review Account

This requires creating a pre-verified user account via an edge function (since we can't directly insert into `auth.users`), then seeding it with profile data, a team, ladder ranking, and admin role.

### Step 1: Create edge function `seed-review-account`

Create `supabase/functions/seed-review-account/index.ts` — a one-time-use edge function that:
1. Creates user `playreview@khaspadelclub.com` with password `PlayReview123!` using the Supabase Admin API (`supabase.auth.admin.createUser` with `email_confirm: true`)
2. Updates the profile with display name "Play Reviewer" and marks `is_test: true`
3. Grants `admin` role in `user_roles`
4. Creates a team "Demo Team — Review" with the user as captain
5. Adds the team to an existing ladder category (Category A) with a seeded ranking
6. Creates 2-3 sample completed matches against existing teams to populate stats/match history
7. Returns success confirmation

The function will be protected by a simple shared secret check to prevent unauthorized use.

### Step 2: Add `verify_jwt = false` to config.toml

Add the function entry so it can be called without auth.

### Step 3: Invoke the function once to seed the data

Call the edge function after deployment to create everything.

### Step 4: Clean up

After confirming the account works, the edge function can remain dormant (it will check if the account already exists and skip if so).

### Important notes
- The `is_test: true` flag on the profile marks this as an internal account
- The admin role grants full access to all app areas
- The `handle_new_user` trigger will auto-create the profile and player role, so the function just needs to update the profile and add the admin role
- No code changes needed in the frontend — the account logs in normally via the existing auth flow

