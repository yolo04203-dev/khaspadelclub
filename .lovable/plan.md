

# Admin Team Freeze & Challenge History Feature

## Overview

This plan implements two new admin capabilities:
1. **Team Freeze**: Allow admins to freeze a team for a specified duration, preventing other teams from challenging them
2. **Challenge History with Timestamps**: Display when challenges were created with full date and time information

---

## 1. Database Changes

### Add Freeze Columns to Teams Table

A new migration will add the following columns to the `teams` table:

| Column | Type | Purpose |
|--------|------|---------|
| `is_frozen` | boolean | Whether the team is currently frozen |
| `frozen_until` | timestamp | When the freeze period ends |
| `frozen_reason` | text | Optional reason for freezing (e.g., "Travelling") |
| `frozen_by` | uuid | Which admin froze the team |
| `frozen_at` | timestamp | When the freeze was applied |

---

## 2. Admin Teams Tab Enhancements

### New "Freeze Team" Action

Add a new option in the team dropdown menu:
- **Freeze Team** - Opens a dialog where admin can:
  - Select freeze duration (1 day, 3 days, 1 week, 2 weeks, custom date)
  - Optionally enter a reason (e.g., "Travelling", "Injury")
  
- **Unfreeze Team** - Immediately removes the freeze

### Visual Indicator

Teams that are frozen will display:
- A snowflake icon next to the team name
- "Frozen until [date]" badge in the table
- The reason if provided

---

## 3. Challenge Prevention Logic

### Update Ladder Detail Page

Modify the `canChallenge()` function to check if the target team is frozen:
- If `is_frozen` is true AND `frozen_until` is in the future, the challenge button is disabled
- Show tooltip: "This team is frozen until [date]"

### Update Challenges Page

If a team tries to view challenges while frozen:
- Show an info banner: "Your team is frozen until [date]. You cannot be challenged during this time."

---

## 4. Admin Challenges Tab (New)

### Add New Tab in Admin Portal

Create a new **Challenges** tab in the admin portal that displays:

| Column | Description |
|--------|-------------|
| Date & Time | Full timestamp when challenge was created |
| Challenger | Team that sent the challenge |
| Challenged | Team that received the challenge |
| Status | pending, accepted, declined, etc. |
| Responded At | When the challenge was responded to (if applicable) |
| Actions | Cancel/View details |

This provides the admin visibility into when exactly each challenge was sent.

---

## 5. File Changes Summary

### New Files
- None (enhancements to existing components)

### Modified Files

| File | Changes |
|------|---------|
| `src/components/admin/TeamsTab.tsx` | Add freeze/unfreeze actions, freeze dialog, frozen indicator |
| `src/pages/LadderDetail.tsx` | Update `canChallenge()` to check freeze status |
| `src/pages/Admin.tsx` | Add Challenges tab, fetch challenge data with timestamps |
| `src/pages/Challenges.tsx` | Show freeze status banner if user's team is frozen |

### Database Migration
- Add `is_frozen`, `frozen_until`, `frozen_reason`, `frozen_by`, `frozen_at` columns to `teams` table

---

## Technical Details

### Freeze Team Dialog Component

```text
┌──────────────────────────────────────┐
│         Freeze Team                   │
│                                       │
│  Duration:                            │
│  ┌─────────────────────────────────┐  │
│  │ 1 week                      ▼   │  │
│  └─────────────────────────────────┘  │
│                                       │
│  Reason (optional):                   │
│  ┌─────────────────────────────────┐  │
│  │ Travelling                      │  │
│  └─────────────────────────────────┘  │
│                                       │
│        [Cancel]  [Freeze Team]        │
└──────────────────────────────────────┘
```

### Challenge Visibility Query

The admin challenges query will select:
- `id`, `created_at` (full timestamp with time)
- Challenger and challenged team names
- `status`, `responded_at`, `expires_at`

### Auto-Unfreeze Logic

The freeze is checked at query time by comparing `frozen_until` with the current timestamp. No background job is needed - when the date passes, the team becomes challengeable again.

---

## User Experience

### For Teams
- When frozen, they cannot receive new challenges
- A banner on the Challenges page informs them of their frozen status
- Existing accepted challenges remain active (they can still play scheduled matches)

### For Challengers
- The Challenge button is disabled for frozen teams
- A tooltip explains why: "Team is frozen until Feb 10"
- Frozen teams show a visual indicator in the ladder rankings

### For Admins
- Easy one-click access to freeze/unfreeze teams
- Full visibility into challenge timestamps
- Clear freeze status visible in the Teams table

