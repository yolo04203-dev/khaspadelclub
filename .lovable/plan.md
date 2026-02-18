

## Make App Export-Ready: Remove Dev/Test Artifacts and Clean Database

### Part 1: Clean Up Admin Panel Dev Buttons

Remove the developer-only testing buttons from the Admin page that are not meant for the client. These include:

- "Seed 500 Users" button
- "Clear & Re-seed" button  
- "Run Perf Test" button
- "Test Error" button
- "Unhandled Rejection" button
- "Send Breadcrumb" button
- "Capture Message" button
- "Test Analytics" button
- The performance results display card

Also remove the associated state variables (`isSeeding`, `perfResult`, `isRunningPerf`) and handler functions (`handleSeedData`, `handlePerfTest`).

**File:** `src/pages/Admin.tsx`

### Part 2: Remove Dev-Only Pages and Routes

Remove the `GenerateIcons` page (an iOS icon generator utility, not needed by users).

**Files:**
- Delete `src/pages/GenerateIcons.tsx`
- Remove route from `src/components/AuthenticatedRoutes.tsx`
- Remove lazy import from `src/App.tsx`

### Part 3: Remove Dev Test Files

Remove load testing and performance benchmark files that are developer tools, not client features.

**Files to delete:**
- `src/test/load-test.ts`
- `src/test/performance-benchmarks.test.ts`

### Part 4: Clean Database of All Test Data

Run SQL to delete all existing test/dummy data so the client starts fresh. Order matters due to foreign key dependencies:

1. `americano_rounds` and `americano_team_matches`
2. `americano_players` and `americano_teams`
3. `americano_sessions`
4. `tournament_matches`
5. `tournament_participants`
6. `tournament_groups`
7. `tournament_categories`
8. `tournaments`
9. `challenges`
10. `matches`
11. `ladder_join_requests`
12. `ladder_rankings`
13. `ladder_categories`
14. `ladders`
15. `team_invitations`
16. `team_members`
17. `teams`
18. `client_errors`
19. `user_permissions`
20. `user_roles` (except keep any real admin accounts)
21. `profiles` (except keep any real admin accounts)

This will be done via SQL DELETE statements against the test environment.

### Part 5: Keep What Stays

These items are fine and should remain:
- Landing page mock rankings in `Hero.tsx` (static UI illustration, not real data)
- `PerfOverlay` component (already gated behind `import.meta.env.DEV`, invisible in production)
- `ErrorsTab` in admin (useful for the client to monitor real errors)
- Sentry + PostHog integration (production monitoring)
- `sendTestError` in `errorReporting.ts` (library function, harmless)

### Summary

| Action | What |
|--------|------|
| Remove from Admin | 8 dev-only buttons, seed/perf handlers, perf results card |
| Delete files | `GenerateIcons.tsx`, `load-test.ts`, `performance-benchmarks.test.ts` |
| Remove route | `/generate-icons` |
| Clean database | All test data from all tables (keep admin user accounts) |
| Keep as-is | Hero mock UI, PerfOverlay (dev-only), Sentry/PostHog, ErrorsTab |

