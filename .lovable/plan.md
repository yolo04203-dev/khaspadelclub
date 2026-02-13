
# Make Score & Schedule Dialogs Full-Width on Mobile

## Problem
The "Record Match Result" (SetScoreDialog) and "Schedule Match" (ScheduleMatchDialog) dialogs appear as narrow centered cards on mobile, wasting screen space and feeling congested. They should expand to fill the screen on mobile devices.

## Changes

### 1. Update Dialog base component for mobile-friendly variant
**File:** `src/components/ui/dialog.tsx`

Currently the DialogContent has `max-w-lg` and `top-[10%]` on all screen sizes. Change mobile defaults to:
- Remove side margins on mobile (full width)
- Position at the very top on mobile (`top-0`, no translate)
- Remove rounded corners on mobile (full-bleed feel)
- Keep the current centered card style on `sm:` and above

Updated classes on DialogContent:
- Mobile: `top-0 translate-y-0 max-h-[100vh] rounded-none w-full max-w-full`
- Desktop (`sm:`): `sm:top-[50%] sm:translate-y-[-50%] sm:max-w-lg sm:rounded-lg sm:max-h-[85vh]`

### 2. Increase score input sizes in SetScoreDialog
**File:** `src/components/challenges/SetScoreDialog.tsx`

- Make the set score inputs larger on mobile (wider tap targets, bigger font)
- Give the match score display more breathing room with larger padding
- Make buttons full-width on mobile

### 3. Improve ScheduleMatchDialog spacing
**File:** `src/components/challenges/ScheduleMatchDialog.tsx`

- Already uses `sm:max-w-[425px]` -- will inherit the full-width mobile behavior from the Dialog base change
- No additional changes needed beyond the base Dialog fix

## Summary
The core fix is in `dialog.tsx` -- making all dialogs full-screen on mobile. This benefits every dialog in the app, not just these two. The SetScoreDialog gets additional spacing/sizing tweaks to make score entry feel spacious.
