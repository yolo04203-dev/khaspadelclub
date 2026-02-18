

## Add Email Notification on New Challenge

### What changes

After a challenge is successfully inserted into the database, the app will call the `send-challenge-notification` edge function with type `"new_challenge"` so the challenged team receives an email immediately.

### Implementation

**File: `src/pages/FindOpponents.tsx`**

In the `handleSendChallenge` function, after the successful `challenges.insert()` call and before the success toast, add a non-blocking call to the edge function:

```typescript
// After successful insert, send email notification (non-blocking)
supabase.functions.invoke("send-challenge-notification", {
  body: {
    type: "new_challenge",
    challengerTeamId: userTeam.id,
    challengerTeamName: userTeam.name,
    challengedTeamId: challengingTeam.team_id,
    challengedTeamName: challengingTeam.team_name,
  },
}).then(({ error }) => {
  if (error) console.error("Failed to send challenge notification email:", error);
});
```

Key details:
- The call is **fire-and-forget** (not awaited) so the UI stays fast -- the user sees the success toast immediately regardless of whether the email sends
- If the email fails, it logs an error but does not affect the challenge itself
- The edge function already has the `"new_challenge"` email template built in, so no backend changes are needed
- Authentication is handled automatically by `supabase.functions.invoke()` which passes the current user's token

### No other files need changes
The edge function already supports the `new_challenge` type with a proper HTML email template, CORS headers, auth validation, and the optimized user lookup we just deployed.

