

## Split Challenges into Tab-Based Lazy Loading

### Problem
The current `Challenges.tsx` (1016 lines) fetches **all 4 categories** (incoming, outgoing, active, history) in parallel on mount — even though only one tab is visible. This blocks the first paint with unnecessary queries.

### Approach
Rather than separate routes (which would lose the tab navigation UX), **lazy-fetch per tab** — only load data when a tab is activated. Extract each tab's content and logic into its own component file, and fetch data on-demand.

### Changes

**1. Create `src/components/challenges/IncomingTab.tsx`**
- Receives `userTeamId`, fetches only incoming pending challenges on mount
- Contains accept/decline handlers and the decline reason dialog
- Skeleton loader while fetching

**2. Create `src/components/challenges/OutgoingTab.tsx`**
- Receives `userTeamId`, fetches only outgoing challenges (pending + declined)
- Contains cancel handler
- Skeleton loader while fetching

**3. Create `src/components/challenges/ActiveTab.tsx`**
- Receives `userTeamId` and `userTeam` (for score submission context), fetches only accepted challenges
- Contains score submission, scheduling, score confirmation logic
- Skeleton loader while fetching

**4. Refactor existing `src/components/challenges/ChallengeHistoryTab.tsx`**
- Make it self-fetching: receives `userTeamId`, fetches history challenges internally
- Currently it receives pre-fetched data as props — change to fetch on mount

**5. Slim down `src/pages/Challenges.tsx`**
- Remove the monolithic `fetchChallenges()` that queries all 4 categories
- Keep only: `fetchUserTeam()`, frozen team banner, tab shell
- Each `TabsContent` renders the corresponding lazy-fetched tab component
- Pass a shared `refreshKey` counter that tabs can listen to for cross-tab refreshes (e.g. after accepting an incoming challenge, bump the key so Active tab refetches when opened)

**6. Extract shared utilities to `src/components/challenges/challengeUtils.ts`**
- `formatTimeAgo()`, `formatExpiresIn()`, `getOpponentName()`, `mapChallenge()` — used across multiple tabs
- `Challenge` and `UserTeam` interfaces

### Result
- Opening Challenges page: 1 query (fetch user team) instead of 5
- Switching to a tab: 1-2 targeted queries for that tab only
- Each tab ~100-200 lines instead of one 1016-line file

