

## Redesign Americano Session with Standings & Rounds Tabs

Restructure the Americano session page to match the reference design, with summary stats at the top and two tabs: "Standings" and "Rounds".

### Layout Changes

**1. Summary Header Section**
- Keep the session name, mode badge, and status badge at the top
- Add a 2x2 grid of stat cards showing: Players/Teams count, Courts, Duration (calculated from `started_at`), Points per round
- Add a progress bar showing completed matches vs total matches with percentage

**2. Two-Tab Layout (Standings / Rounds)**
- Replace the current side-by-side grid layout with a full-width tabbed interface
- Use the existing `Tabs` component from `@radix-ui/react-tabs`
- **Standings tab** (default): Shows the rankings table with enhanced columns matching the reference (P+, P-, +/-, W, T, L for individual; or W, L, Pts for teams). Each row shows rank number in a circle badge
- **Rounds tab**: Shows all matches grouped by round with score inputs (same as current matches section)

**3. Enhanced Standings Table (Individual Mode)**
- Columns: #, Player, P+ (points for), P- (points against), +/- (difference), W (wins), T (ties), L (losses)
- The +/- column uses color-coded badges (green for positive, red for negative)
- W/T/L columns also use subtle colored backgrounds
- Rank numbers displayed in circular badges
- Top player row gets a subtle highlight

### Technical Details

**File:** `src/pages/AmericanoSession.tsx`
- Import `Tabs, TabsList, TabsTrigger, TabsContent` from UI components
- Import `Trophy, LayoutList` icons (LayoutList for Rounds tab icon)
- Add `activeTab` state defaulting to `"standings"`
- Compute derived stats: `pointsAgainst` per player (requires iterating rounds data to calculate P- for each player)
- Compute wins/ties/losses per player from completed rounds
- Replace the `grid lg:grid-cols-3` layout with a single-column layout:
  1. Stat cards grid (2x2)
  2. Progress bar
  3. Tabs component with Standings and Rounds content
- Move the "Start Session" and "Complete Session" buttons into the header area or above the tabs
- Calculate duration from `session.started_at` to now (or `completed_at`)

**New computed data for individual standings:**
- For each player, iterate all completed rounds to calculate:
  - `pointsFor`: sum of scores when player was on that team
  - `pointsAgainst`: sum of opponent scores
  - `wins`: count of rounds where player's team scored higher
  - `ties`: count of rounds where scores were equal  
  - `losses`: count of rounds where player's team scored lower

