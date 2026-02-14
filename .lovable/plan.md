
# Preventing Crashes with 100 Concurrent Users

## The Problem

With 100 users on the app simultaneously, the biggest crash risks are not about frontend rendering (which is already optimized with virtualization) -- they are about **connection exhaustion** and **query stampedes** hitting the backend.

## Root Causes Found

### 1. TournamentDetail opens 4 realtime channels per user -- 3 are unfiltered

When a user views a tournament, the app subscribes to `tournament_matches`, `tournament_participants`, and `tournament_groups` tables **without any filter**. This means every change to ANY row in those tables triggers a full `fetchData()` reload for ALL 100 users. If 20 users are viewing tournaments, that is 80 unfiltered channels. A single score update triggers 60+ simultaneous database fetches.

### 2. ErrorsTab realtime channel has no cleanup guard

The admin Errors tab subscribes to ALL `client_errors` inserts globally. If errors are being logged frequently (which they will be under load), this triggers constant re-fetches.

### 3. Dashboard makes sequential queries that could fail under load

The Dashboard fetches team data, then stats, then challenges in a waterfall. Under load, if any query times out, the entire dashboard shows an error state with no partial data.

### 4. No request deduplication for realtime-triggered refetches

When a realtime event fires, `fetchData()` runs immediately. If 10 events arrive within 1 second (common during a tournament), 10 identical fetches fire simultaneously.

## Implementation Plan

### 1. Filter TournamentDetail realtime channels by tournament ID

**File:** `src/pages/TournamentDetail.tsx`

Add `filter: \`tournament_id=eq.\${id}\`` to the `tournament_matches`, `tournament_participants`, and `tournament_groups` channels. This ensures each user only receives events for the tournament they are viewing, reducing broadcast volume by ~95%.

### 2. Debounce realtime-triggered refetches

**File:** `src/pages/TournamentDetail.tsx`

Wrap the `fetchData()` call triggered by realtime events in a debounce (500ms). If 10 events arrive within 500ms, only one fetch fires. This prevents query stampedes during active tournament play.

### 3. Add a connection limiter utility

**File:** `src/lib/realtimeDebounce.ts` (new)

Create a small utility that:
- Debounces realtime callbacks (configurable delay, default 500ms)
- Provides a `debouncedCallback` wrapper for use in any realtime subscription
- Prevents the same query from running multiple times within the debounce window

### 4. Protect ErrorsTab from excessive refetches

**File:** `src/components/admin/ErrorsTab.tsx`

Debounce the realtime callback so rapid error bursts (common under load) don't cause 50 refetches per second. Also add a `limit(100)` to the fetch query to prevent loading thousands of rows.

### 5. Add graceful degradation for Dashboard

**File:** `src/pages/Dashboard.tsx`

Split the data fetch into independent try/catch blocks so if the stats RPC times out, the team card and quick actions still render. Currently a single failure shows a full-page error message.

### 6. Add QueryClient request deduplication settings

**File:** `src/App.tsx`

The existing QueryClient config is good but the Dashboard doesn't use React Query -- it uses raw `useState` + `useEffect`. Convert the Dashboard data fetching to use `useQuery` hooks so that React Query's built-in deduplication, caching, and retry logic handles concurrent access automatically.

## Files Changed

| File | Change |
|------|--------|
| `src/lib/realtimeDebounce.ts` | New utility -- debounced realtime callback wrapper |
| `src/pages/TournamentDetail.tsx` | Add tournament_id filter to 3 channels, debounce refetches |
| `src/components/admin/ErrorsTab.tsx` | Debounce realtime callback, add query limit |
| `src/pages/Dashboard.tsx` | Independent error handling per data section, partial rendering on failure |

## Expected Impact

| Scenario | Before | After |
|----------|--------|-------|
| 20 users on tournament page, 1 score update | 60 unfiltered broadcasts + 60 fetches | 20 filtered broadcasts + 20 debounced fetches |
| Error burst (10 errors in 1s) on admin page | 10 full refetches | 1 debounced refetch |
| Dashboard with slow stats RPC | Full page error | Team card + actions render, stats show "unavailable" |
| 100 users all on Dashboard | 100 independent fetch chains | 100 fetch chains with independent failure isolation |

## What This Does NOT Change

- No database schema changes needed
- No new dependencies
- Backend query performance stays the same (already optimized)
- Existing virtualization and animation optimizations remain
- Service worker and caching strategy untouched
