
# Consolidate Leaderboard into Ladders

## Overview

This plan removes the separate "Leaderboard" page and consolidates all ranking functionality into the "Ladders" section. The Ladders page will become the single destination for viewing and managing all ladder rankings.

---

## Current Structure

| Page | Route | Purpose |
|------|-------|---------|
| Leaderboard | `/leaderboard` | Shows ALL rankings (no ladder/category filter) |
| Ladders | `/ladders` | Lists all ladders |
| LadderDetail | `/ladders/:id` | Shows a specific ladder's categories and rankings |

**Problem**: Leaderboard and LadderDetail do the same thing (show rankings with challenge functionality) but exist as separate pages, causing confusion.

---

## New Structure

| Page | Route | Purpose |
|------|-------|---------|
| Ladders | `/ladders` | Lists all ladders (unchanged) |
| LadderDetail | `/ladders/:id` | Shows ladder rankings with full functionality |

The LadderDetail page already has all the functionality of Leaderboard:
- Team rankings with rank badges (gold/silver/bronze)
- Team member avatars
- Win/loss stats and streaks
- Challenge button with validation
- Real-time updates

---

## Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/pages/Leaderboard.tsx` | Delete | Remove the standalone Leaderboard page |
| `src/pages/Dashboard.tsx` | Modify | Update "Leaderboard" card to link to `/ladders` instead; remove duplicate card |
| `src/App.tsx` | Modify | Remove `/leaderboard` route |

---

## Dashboard Changes

The Dashboard currently shows two separate cards:

```text
Current:
[Ladders] - Skill-based divisions with rankings
[Leaderboard] - View current rankings and ladder positions
```

After consolidation:

```text
New:
[Ladders] - View and compete in skill-based ladder rankings
```

The "View Ladder" button on the Team Status card will also update to link to `/ladders`.

---

## Navigation Flow

```text
Before:
Dashboard -> Leaderboard (shows all rankings)
Dashboard -> Ladders -> Ladder Detail (shows category rankings)

After:
Dashboard -> Ladders -> Ladder Detail (shows category rankings)
```

Users will go to the Ladders page to see all available ladders, then select one to view its rankings and challenge other teams.

---

## Technical Details

### Files to Delete

- `src/pages/Leaderboard.tsx` - The entire file will be removed

### Files to Modify

**src/App.tsx**
- Remove the import for `Leaderboard`
- Remove the route `<Route path="/leaderboard" element={<Leaderboard />} />`

**src/pages/Dashboard.tsx**
- Remove the "Leaderboard" quick action card
- Update the "Ladders" card description to: "View and compete in ladder rankings"
- Change the "View Ladder" button in the Team Status card from `/leaderboard` to `/ladders`

---

## What Stays the Same

- The Ladders listing page (`/ladders`) - no changes needed
- The LadderDetail page (`/ladders/:id`) - no changes needed, already has full functionality
- Admin portal Ladders tab - no changes needed
- All ladder management functionality - unchanged
