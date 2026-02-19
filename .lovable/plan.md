

# Fix: Dashboard "Team needs a partner" Warning for Manually-Added Partners

## The Problem

The Dashboard builds the team member list from the `team_members` database table. When a partner is added manually (which only renames the team to "Player1 & Player2" without adding a DB row), the table still has 1 row. This causes:

1. The "Team needs a partner to compete" warning to appear
2. The "Add Partner" button to show instead of team member names
3. The "Remove Partner" button to be hidden

## The Fix

### File: `src/pages/Dashboard.tsx`

When `memberNames` from the database has only 1 entry, check if the team name contains "&" (indicating a manually-added partner). If so, parse the two player names from the team name and use those as `memberNames`.

**Logic change in the data fetching section (~line 94-107):**

After building `memberNames` from DB profiles, add a fallback:

```
if (memberNames.length < 2 && teamName.includes(" & ")) {
  const parts = teamName.split("&").map(n => n.trim());
  if (parts.length === 2 && parts[0] && parts[1]) {
    memberNames = parts;
  }
}
```

This ensures:
- The warning disappears for teams with manually-added partners
- Both player names display correctly (e.g., "Ahmed & Ali")
- The "Add Partner" button is replaced with "Change Partner" or hidden
- Teams with 2 real DB members continue working as before (DB names take priority)

No other files need changes. No database changes required.
