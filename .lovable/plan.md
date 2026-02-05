

# Combined Feature Implementation: Match Scheduling + In-App Badge Notifications

## Overview

This plan combines two key missing features into a cohesive implementation:

1. **Match Scheduling** - Allow teams to set venue and timing after a challenge is accepted
2. **In-App Badge Notifications** - Global notification bell in the header showing alerts for challenges, scheduled matches, and ladder approvals

---

## Part 1: Match Scheduling (Venue & Timing)

### What It Does

After both teams agree to a challenge (when accepted), either team can update where and when they'll play. This removes the need for external coordination.

### Database Change

Add a `venue` column to the existing `matches` table:

```sql
ALTER TABLE public.matches ADD COLUMN venue text;
```

Note: The `scheduled_at` column already exists in the matches table.

### New Component: ScheduleMatchDialog

**File: `src/components/challenges/ScheduleMatchDialog.tsx`**

A dialog that allows users to:
- Pick a date using the existing Calendar component
- Select a time (dropdown or time input)
- Enter a venue/location (text input)
- See which team they're coordinating with

```text
+----------------------------------+
| Schedule Your Match              |
+----------------------------------+
| vs [Opponent Team Name]          |
|                                  |
| Date                             |
| [Calendar Picker]                |
|                                  |
| Time                             |
| [Hour] : [Minute] [AM/PM]        |
|                                  |
| Venue / Location                 |
| [__________________________]     |
|                                  |
| [Cancel]      [Save Schedule]    |
+----------------------------------+
```

### UI Updates to Challenges Page

**File: `src/pages/Challenges.tsx`**

Update the "Active" tab (accepted challenges) to:
- Display scheduled date/time and venue if set
- Add a "Schedule" button (with calendar icon) next to "Record Score"
- Join with matches table to fetch `scheduled_at` and `venue`

```text
Before:
+----------------------------------------+
| vs Opponent Team                       |
| Accepted 2h ago | Ready to play        |
|                         [Record Score] |
+----------------------------------------+

After:
+----------------------------------------+
| vs Opponent Team                       |
| Accepted 2h ago | Ready to play        |
| Mar 15 at 6:00 PM @ Club Courts       |
|             [Schedule] [Record Score]  |
+----------------------------------------+
```

---

## Part 2: In-App Badge Notification System

### What It Does

A global notification bell icon appears in the header of all authenticated pages. It shows a badge count for:
- Incoming challenges awaiting response
- Scheduled matches (matches with a set date/time)
- Approved ladder join requests

The badge updates in real-time using Supabase subscriptions.

### New Context: NotificationContext

**File: `src/contexts/NotificationContext.tsx`**

Tracks notification counts globally and subscribes to real-time changes:

```typescript
interface NotificationCounts {
  incomingChallenges: number;    // Challenges sent to you (pending)
  scheduledMatches: number;      // Accepted matches with scheduled_at set
  ladderApprovals: number;       // Join requests approved
  total: number;                 // Sum of all
}

interface NotificationContextType {
  counts: NotificationCounts;
  isLoading: boolean;
  refresh: () => void;
}
```

Subscribes to real-time changes on:
- `challenges` table
- `matches` table
- `ladder_join_requests` table

### New Component: NotificationBell

**File: `src/components/NotificationBell.tsx`**

Bell icon with badge count and dropdown menu:
- Shows total count as a badge
- Dropdown lists categorized notifications with counts
- Each category links to the relevant page
- Gentle pulse animation when new notifications arrive

### New Component: AppHeader

**File: `src/components/AppHeader.tsx`**

A shared header component used across all authenticated pages:
- Logo (links to dashboard)
- Optional back button
- Notification bell with badge
- User info and sign out button

Props:
```typescript
interface AppHeaderProps {
  showBack?: boolean;      // Show back arrow
  backTo?: string;         // Back navigation target
  actions?: React.ReactNode;  // Right-side action buttons
}
```

### App.tsx Update

Wrap the app with `<NotificationProvider>` inside the existing `AuthProvider`.

### Pages to Update

Replace inline headers with the new `<AppHeader />` component:

| Page | Current Header | Changes |
|------|----------------|---------|
| `Dashboard.tsx` | Inline header | Use `<AppHeader />` |
| `Ladders.tsx` | Inline header | Use `<AppHeader showBack />` |
| `LadderDetail.tsx` | Inline header | Use `<AppHeader showBack />` |
| `LadderManage.tsx` | Inline header | Use `<AppHeader showBack />` |
| `Challenges.tsx` | Inline header | Use `<AppHeader showBack />` |
| `FindOpponents.tsx` | Inline header | Use `<AppHeader showBack />` |
| `Tournaments.tsx` | Inline header | Use `<AppHeader showBack />` |
| `TournamentDetail.tsx` | Inline header | Use `<AppHeader showBack />` |
| `Americano.tsx` | Inline header | Use `<AppHeader showBack />` |
| `AmericanoSession.tsx` | Inline header | Use `<AppHeader showBack />` |
| `Profile.tsx` | Inline header | Use `<AppHeader showBack />` |

---

## Implementation Summary

### Database Migration

```sql
-- Add venue column to matches table for scheduling
ALTER TABLE public.matches ADD COLUMN venue text;
```

### Files to Create

| File | Purpose |
|------|---------|
| `src/contexts/NotificationContext.tsx` | Global notification state with real-time subscriptions |
| `src/components/AppHeader.tsx` | Shared header with notification bell and user menu |
| `src/components/NotificationBell.tsx` | Bell icon with badge and dropdown |
| `src/components/challenges/ScheduleMatchDialog.tsx` | Dialog for setting match venue and time |

### Files to Modify

| File | Changes |
|------|---------|
| `src/App.tsx` | Wrap with `<NotificationProvider />` |
| `src/pages/Challenges.tsx` | Add schedule button, display venue/time, fetch match details |
| `src/pages/Dashboard.tsx` | Replace header with `<AppHeader />`, can remove banner |
| `src/pages/Ladders.tsx` | Replace header with `<AppHeader />` |
| `src/pages/LadderDetail.tsx` | Replace header with `<AppHeader />` |
| `src/pages/LadderManage.tsx` | Replace header with `<AppHeader />` |
| `src/pages/FindOpponents.tsx` | Replace header with `<AppHeader />` |
| `src/pages/Tournaments.tsx` | Replace header with `<AppHeader />` |
| `src/pages/TournamentDetail.tsx` | Replace header with `<AppHeader />` |
| `src/pages/Americano.tsx` | Replace header with `<AppHeader />` |
| `src/pages/AmericanoSession.tsx` | Replace header with `<AppHeader />` |
| `src/pages/Profile.tsx` | Replace header with `<AppHeader />` |

---

## User Experience Flow

### Scheduling a Match

1. User accepts a challenge (or their challenge is accepted)
2. Match appears in "Active" tab on Challenges page
3. User clicks "Schedule" button on the match card
4. Dialog opens with date picker, time selector, and venue input
5. User fills in details and saves
6. Both teams see the scheduled info on their challenge card
7. Real-time updates sync changes instantly

### Receiving Notifications

1. User logs in and sees the notification bell in the header
2. Bell shows a badge with the total count (e.g., "3")
3. User clicks the bell to see breakdown:
   - 2 New Challenges (links to /challenges)
   - 1 Scheduled Match (links to /challenges)
4. User navigates to handle the notifications
5. Counts update in real-time as changes occur

---

## Technical Notes

### Real-time Subscriptions

The NotificationContext will set up channels for:
- `challenges` - new/updated challenges where user's team is challenged
- `matches` - updates to matches where user's team is involved
- `ladder_join_requests` - status changes on user's team's requests

### Existing Patterns Used

- Real-time subscriptions: Already implemented in `TournamentDetail.tsx` and `Challenges.tsx`
- Calendar component: Already available in `src/components/ui/calendar.tsx`
- Dialog pattern: Already used in `SetScoreDialog.tsx`
- Badge component: Already available in `src/components/ui/badge.tsx`
- Dropdown menu: Already available in `src/components/ui/dropdown-menu.tsx`

