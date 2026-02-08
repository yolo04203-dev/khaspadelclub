

# Load Testing Plan for 2000 Concurrent Users

## Summary
Create a comprehensive load testing strategy to validate application performance under high traffic (2000 concurrent users). This includes database seeding, test scripts, and performance benchmarks.

---

## Current State Analysis

### Database Size (Current)
| Table | Row Count |
|-------|-----------|
| tournament_matches | 58 |
| tournament_participants | 32 |
| teams | 28 |
| ladder_rankings | 25 |
| challenges | 11 |
| profiles | 7 |

### Existing Performance Infrastructure
- `useAsyncData` hook with timeout (30s), retry logic (3 attempts), and exponential backoff
- `useNetworkStatus` hook for offline/slow connection detection
- Parallel data fetching with `Promise.all`
- Defensive data handling (`safeData.ts`)
- Route-level error boundaries

---

## Testing Strategy

### Phase 1: Database Seeding (Test Data Generation)

Create an edge function to seed the database with realistic test data:

**Tables to Seed:**
| Table | Target Rows | Description |
|-------|-------------|-------------|
| profiles | 2,000 | Simulated user profiles |
| teams | 1,000 | 2 players per team |
| team_members | 2,000 | Link users to teams |
| ladder_rankings | 2,000 | Rankings across categories |
| challenges | 5,000 | Mix of pending/accepted/completed |
| matches | 3,000 | Historical match records |

**New File:** `supabase/functions/seed-test-data/index.ts`

```text
POST /seed-test-data
Body: { count: 2000, clearExisting: false }
```

### Phase 2: Client-Side Load Testing Script

Create a test utility that simulates concurrent user behavior:

**New File:** `src/test/load-test.ts`

**Test Scenarios:**
1. **Dashboard Load** - 2000 users loading dashboard simultaneously
2. **Ladder View** - Paginated ranking list with 1000+ teams
3. **Challenge Creation** - Concurrent challenge submissions
4. **Real-time Updates** - Subscriptions from 2000 clients

### Phase 3: Performance Benchmarks

**Metrics to Measure:**
- Time to First Byte (TTFB)
- Full page load time
- API response times (p50, p95, p99)
- Database query execution time
- Memory usage under load
- Error rate percentage

**Benchmark Targets:**
| Metric | Acceptable | Target |
|--------|------------|--------|
| Dashboard load | < 3s | < 1.5s |
| Ladder fetch (1000 teams) | < 2s | < 800ms |
| Challenge submission | < 1s | < 300ms |
| Real-time latency | < 500ms | < 100ms |
| Error rate | < 1% | < 0.1% |

---

## Technical Implementation

### 1. Seed Data Edge Function

```text
supabase/functions/seed-test-data/index.ts
- Generate UUIDs for 2000 fake users
- Create profiles with random names
- Create teams (pairs of users)
- Assign rankings with proper distribution
- Generate challenge/match history
- Use batch inserts for performance
```

### 2. Load Test Utilities

```text
src/test/load-test.ts
- Simulate authenticated sessions
- Concurrent request batching
- Response time measurement
- Error tracking and reporting
- Progress reporting
```

### 3. Database Optimizations to Verify

```text
- Index coverage on frequently queried columns
- RLS policy performance under load
- Connection pooling limits
- Query pagination (avoid 1000 row default limit)
```

---

## Implementation Files

| File | Purpose |
|------|---------|
| `supabase/functions/seed-test-data/index.ts` | Edge function to populate test data |
| `src/test/load-test.ts` | Load testing utilities and runners |
| `src/test/performance-benchmarks.test.ts` | Vitest performance test cases |

---

## Recommended Database Indexes

Before running load tests, ensure these indexes exist:

```sql
-- Optimize team lookups
CREATE INDEX IF NOT EXISTS idx_team_members_user_id 
ON team_members(user_id);

-- Optimize ranking queries
CREATE INDEX IF NOT EXISTS idx_ladder_rankings_category_rank 
ON ladder_rankings(ladder_category_id, rank);

-- Optimize challenge queries
CREATE INDEX IF NOT EXISTS idx_challenges_status_teams 
ON challenges(status, challenger_team_id, challenged_team_id);

-- Optimize match history
CREATE INDEX IF NOT EXISTS idx_matches_teams_status 
ON matches(status, challenger_team_id, challenged_team_id);
```

---

## Execution Plan

1. **Create seed function** - Edge function to generate 2000 test users
2. **Add database indexes** - Ensure optimal query performance
3. **Run seed script** - Populate database with test data
4. **Execute load tests** - Run concurrent simulations
5. **Analyze results** - Identify bottlenecks
6. **Optimize** - Address any performance issues found

---

## Limitations and Considerations

- **Lovable Cloud backend** has built-in connection pooling
- **Supabase free tier** may have rate limits affecting test accuracy
- **Real-time subscriptions** limited by WebSocket connections
- **Browser-based testing** limited; recommend server-side load tools (k6, Artillery) for production-grade testing

