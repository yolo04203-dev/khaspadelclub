
# Add Challenge Notification Banner to Dashboard

## Overview
Add a prominent notification banner at the top of the dashboard that alerts users when they have incoming pending challenges that need their response. This will be more visible than the current stat card and encourage timely responses.

## What You'll See
- A colorful alert banner appears at the top of your dashboard when you have incoming challenges
- Shows the number of pending challenges with a call-to-action button to view them
- The banner is dismissible but will reappear on page refresh if challenges are still pending
- Subtle animation to draw attention without being intrusive

## Implementation Details

### 1. Enhance Data Fetching in Dashboard
**File: `src/pages/Dashboard.tsx`**

Currently, the dashboard fetches total pending challenges (both incoming and outgoing combined). We need to also fetch **incoming challenges** separately to show a more relevant notification - users need to respond to incoming challenges, not just be aware of outgoing ones.

Add new state to track:
- `incomingChallenges`: number of challenges sent TO the user's team that are awaiting response

Update the fetch logic to query:
```sql
-- Incoming pending challenges (challenges sent to user's team)
SELECT count(*) FROM challenges 
WHERE challenged_team_id = {teamId} AND status = 'pending'
```

### 2. Add Notification Banner Component
**File: `src/pages/Dashboard.tsx`**

Add an Alert component (already available in the codebase) that displays:
- An icon (Bell or Swords) to indicate challenge notifications
- Message like "You have 2 incoming challenges awaiting your response!"
- A button linking to `/challenges` page
- Styled with accent/warning colors to stand out

The banner will:
- Only appear when `incomingChallenges > 0`
- Be positioned above the Team Status Card for high visibility
- Use framer-motion for a subtle entrance animation
- Include a dismiss button (optional, stored in local state)

### 3. Visual Design
- Background: gradient with warning/accent tones (orange/yellow)
- Icon: Animated bell or swords icon
- Text: Bold count + descriptive message
- CTA Button: "View Challenges" linking to `/challenges`
- Border: subtle accent border for definition

---

## Technical Changes Summary

| File | Change |
|------|--------|
| `src/pages/Dashboard.tsx` | Add `incomingChallenges` state, update fetch query, add Alert banner component |

## Notes
- No database changes required - using existing `challenges` table
- Uses existing UI components (Alert, Button, Badge)
- Responsive design for mobile and desktop
