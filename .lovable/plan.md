

# Add Join Requests Tab to Admin Page

## What Changes

A new "Join Requests" tab will be added to the Admin page, allowing admins to see and manage all pending ladder join requests across all ladders in one centralized place -- no need to visit each ladder's manage page individually.

## UI Changes

### Admin Page (`src/pages/Admin.tsx`)

- Add a new "Join Requests" tab to the tab list (with a `UserPlus` icon)
- Show a badge with the pending request count (similar to the Errors tab)
- Fetch the pending join request count alongside existing admin data
- Render a new `JoinRequestsTab` component

### New Component: `src/components/admin/JoinRequestsTab.tsx`

- Fetches ALL pending join requests across all ladders (admin RLS already allows this)
- Displays each request in a card layout showing:
  - Team name
  - Ladder name and category name
  - Custom player names (if provided)
  - Message from the team captain
  - Submission date
  - Admin notes textarea
  - Approve / Reject buttons
- Reuses the same approve/reject logic from `JoinRequestsManagement` (insert ranking on approve, update status on both)
- Groups or labels requests by ladder for clarity

## Technical Details

### Data Fetching

Query for the new tab:
```
supabase
  .from("ladder_join_requests")
  .select(`
    id, team_id, ladder_category_id, status, message,
    player1_name, player2_name, created_at,
    team:teams (name),
    category:ladder_categories (name, ladder_id, ladder:ladders (name))
  `)
  .eq("status", "pending")
  .order("created_at", { ascending: true })
```

This gives us team name, category name, AND ladder name in a single query.

### Pending Count

A lightweight count query will run in `Admin.tsx` alongside existing data fetches:
```
supabase
  .from("ladder_join_requests")
  .select("id", { count: "exact", head: true })
  .eq("status", "pending")
```

The count is displayed as a badge on the tab trigger, matching the pattern used for the Errors tab.

### Approve Logic (same as existing `JoinRequestsManagement`)

1. Check team isn't already in the category
2. Get max rank in category, assign next rank
3. Insert into `ladder_rankings`
4. Update request status to "approved"

### Reject Logic

1. Update request status to "rejected" with optional admin notes

### No Database Changes

The `ladder_join_requests` table already has admin-level RLS policies that allow full access. No schema or policy changes needed.

### Files to Create/Edit

1. **Create** `src/components/admin/JoinRequestsTab.tsx` -- new component with the full request list and approve/reject actions
2. **Edit** `src/pages/Admin.tsx` -- add the tab trigger, pending count state, count fetch, and tab content

