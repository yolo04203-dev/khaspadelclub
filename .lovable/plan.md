
# Add Pagination to Challenges Tab

## Overview

This plan adds pagination to the Challenges tab in the Admin portal, displaying 20 challenges per page with Previous/Next navigation controls. This improves performance and usability when there are many challenges in the system.

---

## How It Will Work

Instead of loading all 100 challenges at once, the system will:
1. Load only 20 challenges at a time
2. Track the current page number
3. Show navigation controls at the bottom of the table
4. Display the current range (e.g., "Showing 1-20 of 87 challenges")

---

## User Interface

The pagination controls will appear below the table:

```text
┌─────────────────────────────────────────────────────────────┐
│  Challenge History                                          │
│  View all challenges with full timestamps                   │
├─────────────────────────────────────────────────────────────┤
│  Date & Time  │ Challenger │ Challenged │ Status │ Actions │
├───────────────┼────────────┼────────────┼────────┼─────────┤
│  Feb 4, 2026  │ Team A     │ Team B     │ Pending│   •••   │
│  Feb 3, 2026  │ Team C     │ Team D     │ Accepted│  •••   │
│     ...       │    ...     │    ...     │   ...  │   ...   │
├─────────────────────────────────────────────────────────────┤
│   Showing 1-20 of 87 challenges                             │
│                                                             │
│               [← Previous]    1   2   3  ...  [Next →]      │
└─────────────────────────────────────────────────────────────┘
```

---

## Changes Summary

### File Modified

| File | Changes |
|------|---------|
| `src/components/admin/ChallengesTab.tsx` | Add pagination state, update query with range, add pagination controls UI |

---

## Technical Details

### State Management

New state variables:
- `currentPage` - Tracks which page is displayed (starts at 1)
- `totalCount` - Total number of challenges in the database
- `pageSize` - Items per page (set to 20)

### Database Query Changes

The query will be updated to use Supabase's `.range()` method for efficient server-side pagination:

```typescript
// Calculate offset based on current page
const from = (currentPage - 1) * pageSize;
const to = from + pageSize - 1;

// Fetch paginated data
const { data, count } = await supabase
  .from("challenges")
  .select("...", { count: "exact" })
  .order("created_at", { ascending: false })
  .range(from, to);
```

### Navigation Logic

- **Previous**: Disabled when on page 1
- **Next**: Disabled when on the last page
- **Page Numbers**: Show current page and nearby pages with ellipsis for gaps
- **Info Text**: "Showing X-Y of Z challenges"

### Re-fetch on Page Change

When the user clicks Previous/Next or a page number, the component will re-fetch data for that page. After cancelling a challenge, the current page data will be refreshed.
