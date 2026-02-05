

# Comprehensive App Enhancement Plan

## Overview

This plan addresses all identified gaps and missing features to create a complete experience for players. The implementation is organized into phases for logical progression.

---

## Phase 1: Quick Fixes & Database Foundation

### 1.1 Fix Broken Navigation

**File: `src/pages/Profile.tsx`**

Fix the broken link that points to `/leaderboard` instead of `/ladders`.

```typescript
// Change from:
<Link to="/leaderboard">View Ladder</Link>

// Change to:
<Link to="/ladders">View Ladder</Link>
```

### 1.2 Database Schema Updates

Add missing columns to support new features:

```sql
-- Enhance profiles table
ALTER TABLE public.profiles 
  ADD COLUMN skill_level text,
  ADD COLUMN phone_number text,
  ADD COLUMN bio text,
  ADD COLUMN is_looking_for_team boolean DEFAULT false,
  ADD COLUMN preferred_play_times text[];

-- Add team recruitment flag
ALTER TABLE public.teams 
  ADD COLUMN is_recruiting boolean DEFAULT false,
  ADD COLUMN recruitment_message text;

-- Add decline reason for challenges
ALTER TABLE public.challenges 
  ADD COLUMN decline_reason text;

-- Create team invitations table
CREATE TABLE public.team_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  invited_email text,
  invited_user_id uuid,
  invited_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days')
);

-- Enable RLS on team_invitations
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for team_invitations
CREATE POLICY "Anyone can view their invitations"
  ON public.team_invitations FOR SELECT
  USING (invited_user_id = auth.uid() OR invited_email = auth.email());

CREATE POLICY "Team captains can create invitations"
  ON public.team_invitations FOR INSERT
  WITH CHECK (is_team_captain(auth.uid(), team_id));

CREATE POLICY "Invited users can update invitation status"
  ON public.team_invitations FOR UPDATE
  USING (invited_user_id = auth.uid() OR invited_email = auth.email());

CREATE POLICY "Team captains can delete invitations"
  ON public.team_invitations FOR DELETE
  USING (is_team_captain(auth.uid(), team_id));
```

---

## Phase 2: Enhanced Profile Page

### 2.1 Avatar Upload Functionality

**Create Storage Bucket** (via Supabase):
- Bucket name: `avatars`
- Public access for reading
- Authenticated upload only

**File: `src/components/profile/AvatarUpload.tsx`** (new)

Component that handles:
- File selection with drag-and-drop support
- Image preview before upload
- Upload to Supabase Storage
- Update profile with new avatar URL
- Loading and error states

```typescript
interface AvatarUploadProps {
  currentAvatarUrl?: string;
  onUploadComplete: (url: string) => void;
}
```

### 2.2 Extended Profile Form

**File: `src/pages/Profile.tsx`** (update)

Add new profile fields:
- Skill level dropdown (Beginner, Intermediate, Advanced, Pro)
- Phone number input (optional)
- Bio textarea (max 200 characters)
- "Looking for team" toggle
- Preferred play times multi-select

```text
+------------------------------------------+
| Profile                                  |
+------------------------------------------+
| [Avatar]  [Change Photo]                 |
|                                          |
| Display Name                             |
| [_______________________]                |
|                                          |
| Skill Level                              |
| [Intermediate        ▼]                  |
|                                          |
| Bio                                      |
| [_______________________]                |
| [_______________________]                |
|                                          |
| Phone (optional)                         |
| [_______________________]                |
|                                          |
| [ ] I'm looking for a team to join       |
|                                          |
| Preferred Play Times                     |
| [x] Weekday Mornings  [ ] Weekday Eves   |
| [ ] Weekend Mornings  [x] Weekend Eves   |
|                                          |
| [Save Changes]                           |
+------------------------------------------+
```

---

## Phase 3: Team Invitation System

### 3.1 Invite Partner Component

**File: `src/components/team/InvitePartnerDialog.tsx`** (new)

Dialog for team captains to invite partners:
- Search by email or display name
- Autocomplete suggestions from profiles
- Custom invitation message
- Send invitation button

```text
+----------------------------------+
| Invite Partner to [Team Name]    |
+----------------------------------+
| Find Player                      |
| [@_________________________]     |
| Suggestions:                     |
|   • john@email.com               |
|   • PlayerJohn                   |
|                                  |
| Message (optional)               |
| [_________________________]      |
|                                  |
| [Cancel]      [Send Invitation]  |
+----------------------------------+
```

### 3.2 Team Invitations List

**File: `src/components/team/PendingInvitations.tsx`** (new)

Shows pending invitations for the user:
- Team name and who invited them
- Accept/Decline buttons
- Invitation message preview
- Expiration countdown

### 3.3 Team Management Section

**File: `src/pages/Profile.tsx`** (update)

Enhance the Team section:
- If captain: Show "Invite Partner" button
- If captain: Show pending sent invitations
- If no team: Show "My Invitations" section with pending invites
- Recruitment toggle for captains

---

## Phase 4: Player Directory

### 4.1 Player Directory Page

**File: `src/pages/Players.tsx`** (new)

A searchable directory of all players:

```text
+--------------------------------------------------+
| Find Players                                      |
+--------------------------------------------------+
| [Search by name...              ] [🔍]           |
|                                                  |
| Filters:                                         |
| Skill: [All ▼]  Looking for Team: [All ▼]       |
|                                                  |
+--------------------------------------------------+
| [Avatar] John Smith                              |
|          Intermediate • Looking for team         |
|          "Love playing weekends at City Courts"  |
|                              [View] [Invite]     |
+--------------------------------------------------+
| [Avatar] Sarah Johnson                           |
|          Advanced • Has team (Smash Bros)        |
|          "Competitive player, 3 years exp"       |
|                              [View] [Challenge]  |
+--------------------------------------------------+
```

Features:
- Search by display name
- Filter by skill level
- Filter by "looking for team" status
- Show player's team (if any)
- Quick actions: View profile, Invite to team, Challenge team

### 4.2 Player Profile View

**File: `src/pages/PlayerProfile.tsx`** (new)

Public view of another player's profile:
- Avatar and display name
- Skill level badge
- Bio
- Team membership (with link)
- Recent match history
- Head-to-head record (if applicable)
- "Invite to Team" or "Challenge" buttons

---

## Phase 5: Stats Dashboard

### 5.1 Enhanced Dashboard Stats

**File: `src/pages/Dashboard.tsx`** (update)

Add detailed statistics section:

```text
+--------------------------------------------------+
| Your Performance                                  |
+--------------------------------------------------+
|                                                  |
| [Win Rate Chart - Line graph over time]          |
|                                                  |
| This Month        All Time                       |
| 8 Wins / 3 Losses 45 Wins / 28 Losses           |
| 72% Win Rate      61% Win Rate                   |
|                                                  |
+--------------------------------------------------+
| Recent Form: W W L W W (5 match streak)          |
+--------------------------------------------------+
```

### 5.2 Detailed Stats Page

**File: `src/pages/Stats.tsx`** (new)

Comprehensive statistics view:

```text
+--------------------------------------------------+
| Performance Stats                                 |
+--------------------------------------------------+
|                                                  |
| [Win Rate Over Time - Recharts Line Graph]       |
|                                                  |
| Period: [Last 30 Days ▼]                         |
|                                                  |
+--------------------------------------------------+
| Match History Timeline                            |
+--------------------------------------------------+
| Mar 15 | vs Team Alpha    | W 3-1 | Ladder      |
| Mar 12 | vs Smash Bros    | L 1-3 | Tournament  |
| Mar 10 | vs Pro Players   | W 3-2 | Ladder      |
| ...                                              |
+--------------------------------------------------+
| Head-to-Head Records                              |
+--------------------------------------------------+
| Team Alpha      | 5W - 2L | 71% | [View History] |
| Smash Bros      | 3W - 4L | 43% | [View History] |
| Pro Players     | 1W - 1L | 50% | [View History] |
+--------------------------------------------------+
| Performance by Ladder                             |
+--------------------------------------------------+
| Men's Open      | #3 | 12W-5L | 70%              |
| Mixed Doubles   | #7 | 8W-6L  | 57%              |
+--------------------------------------------------+
```

Features:
- Win rate trend chart (using Recharts)
- Period selector (7 days, 30 days, all time)
- Match history timeline with filters
- Head-to-head breakdown by opponent
- Performance breakdown by ladder/category
- Current and best streak tracking

---

## Phase 6: Challenge Improvements

### 6.1 Decline Reason

**File: `src/pages/Challenges.tsx`** (update)

When declining a challenge, prompt for reason:
- Scheduling conflict
- Already have pending match
- Other (with text input)

Store in `decline_reason` column for transparency.

### 6.2 Challenge History

Add "History" tab to Challenges page showing:
- Past declined challenges with reasons
- Completed matches with results
- Expired challenges

---

## Implementation Summary

### Database Migrations

```sql
-- Single migration with all schema changes
ALTER TABLE public.profiles 
  ADD COLUMN skill_level text,
  ADD COLUMN phone_number text,
  ADD COLUMN bio text,
  ADD COLUMN is_looking_for_team boolean DEFAULT false,
  ADD COLUMN preferred_play_times text[];

ALTER TABLE public.teams 
  ADD COLUMN is_recruiting boolean DEFAULT false,
  ADD COLUMN recruitment_message text;

ALTER TABLE public.challenges 
  ADD COLUMN decline_reason text;

-- Team invitations table with RLS
CREATE TABLE public.team_invitations (...);
```

### Storage Bucket

Create `avatars` bucket with public read access.

### Files to Create

| File | Purpose |
|------|---------|
| `src/components/profile/AvatarUpload.tsx` | Avatar upload with preview |
| `src/components/team/InvitePartnerDialog.tsx` | Team invitation dialog |
| `src/components/team/PendingInvitations.tsx` | List of received invitations |
| `src/pages/Players.tsx` | Player directory with search |
| `src/pages/PlayerProfile.tsx` | Public player profile view |
| `src/pages/Stats.tsx` | Detailed statistics page |
| `src/components/stats/WinRateChart.tsx` | Win rate trend chart |
| `src/components/stats/HeadToHead.tsx` | H2H records component |
| `src/components/stats/MatchTimeline.tsx` | Match history timeline |

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Profile.tsx` | Fix /leaderboard link, add avatar upload, new profile fields, team invitations |
| `src/pages/Dashboard.tsx` | Add stats preview section |
| `src/pages/Challenges.tsx` | Add decline reason, history tab |
| `src/App.tsx` | Add routes for /players, /players/:id, /stats |

### New Routes

| Route | Component | Purpose |
|-------|-----------|---------|
| `/players` | `Players.tsx` | Player directory |
| `/players/:id` | `PlayerProfile.tsx` | View player profile |
| `/stats` | `Stats.tsx` | Detailed statistics |

---

## Priority Order

1. **Quick Fixes** - Fix broken link (immediate)
2. **Database Schema** - All migrations in one batch
3. **Avatar Upload** - High visibility, frequently requested
4. **Team Invitations** - Critical for team formation
5. **Player Directory** - Enables discovery and recruitment
6. **Stats Dashboard** - Engagement and retention feature
7. **Challenge Improvements** - Polish and transparency

---

## Dependencies

- Recharts (already installed) for statistics charts
- Supabase Storage for avatar uploads
- Existing UI components (Dialog, Card, Button, Input, Select, etc.)

