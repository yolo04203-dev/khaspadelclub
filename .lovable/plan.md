

## Remove Google Sign-In from Auth Page

Remove the "Continue with Google" button and the "or" divider from both the Sign In and Sign Up tabs on the auth page.

### Changes

**File: `src/pages/Auth.tsx`**
- Remove the Google sign-in button from the **Sign In** tab (lines ~230-247)
- Remove the "or" divider below it in the Sign In tab (lines ~249-252)
- Remove the Google sign-in button from the **Sign Up** tab (lines ~290-307)
- Remove the "or" divider below it in the Sign Up tab (lines ~309-312)
- Remove the unused `lovable` import since it will no longer be referenced

This keeps email/password authentication as the sole sign-in method.

