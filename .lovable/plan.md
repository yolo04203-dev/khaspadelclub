
# Fix 6 Mobile UX Issues on Android

## Issue 1: Schedule Dialog Congested on Mobile
The ScheduleMatchDialog opens as a centered dialog that doesn't account for mobile screen space well. The dialog content overflows, and the footer buttons ("Save Schedule" / "Cancel") get pushed off-screen or crowd the content.

**Fix:** Change the ScheduleMatchDialog to use a drawer/sheet layout on mobile by making DialogContent scrollable with reduced padding, and stack the footer buttons vertically on mobile. Also reduce spacing between form fields.

**Files:** `src/components/challenges/ScheduleMatchDialog.tsx`, `src/components/admin/AdminScheduleDialog.tsx`

---

## Issue 2: Admin Dashboard Header Buttons Too Close
On the Admin page header, the "New Tournament" and "Padel Leaderboard" buttons in the top bar are too close together on mobile. The AdminHeader component has tight spacing.

**Fix:** This is actually in the AppHeader used on pages like Dashboard where the logo text "Padel LEADERBOARD" sits next to action buttons. The admin tabs (grid-cols-7) are also very compressed on mobile. Make the admin TabsList horizontally scrollable instead of cramming all 7 tabs, and reduce tab text size on mobile.

**Files:** `src/pages/Admin.tsx`

---

## Issue 3: Tournament Information Text Overlapping
The TabsList on TournamentDetail has `flex-wrap` but the fixed `h-10` height on TabsList prevents wrapped items from being visible -- they overlap the content below. With 7-8 tabs on an admin view, they wrap but the container height stays at h-10.

**Fix:** Override the TabsList height on TournamentDetail to `h-auto` so wrapped tabs display correctly without overlapping the content below. Also make it horizontally scrollable on mobile as an alternative.

**Files:** `src/pages/TournamentDetail.tsx`

---

## Issue 4: "Edit with Lovable" Badge Showing
The Capacitor config already has `forceHideBadge=true` in the server URL, but the badge is still showing. This is because when the app loads via Capacitor using the live server URL, the badge hiding depends on the query param being parsed correctly.

**Fix:** This is a known behavior. To remove the badge, go to **Project Settings** and enable **"Hide 'Lovable' Badge"**. The `forceHideBadge` query param only works in certain contexts. The proper way is through the project settings toggle.

**Action:** No code change -- user needs to toggle the setting in Project Settings.

---

## Issue 5: Opponent Team Name Cut Off (No Scroll)
In FindOpponents, the opponent card layout uses `flex items-center justify-between gap-4` but the team name text has no truncation or min-width constraint, so on narrow screens the last item's name gets clipped with no way to see it.

**Fix:** Add `min-w-0` to the text container and `truncate` to the team name so it ellipsizes gracefully instead of being cut off. Also ensure the main content area has `pb-safe-nav` for bottom nav clearance.

**Files:** `src/pages/FindOpponents.tsx`

---

## Issue 6: Keyboard Hides Challenge Message Input
When opening the challenge dialog on FindOpponents and tapping the textarea, the Android keyboard pushes up and hides the message input. The dialog is centered vertically (`top-[50%] translate-y-[-50%]`) which doesn't adjust for keyboard.

**Fix:** Update the DialogContent component to reposition on mobile when keyboard is open -- shift from `top-[50%]` to `top-[10%]` with `translate-y-0` on small screens, making the dialog anchor to the top of the viewport instead of center. This ensures the textarea remains visible above the keyboard. Also reduce the dialog padding on mobile.

**Files:** `src/components/ui/dialog.tsx`

---

## Technical Summary

| File | Change |
|------|--------|
| `src/components/challenges/ScheduleMatchDialog.tsx` | Reduce spacing, stack footer buttons vertically on mobile |
| `src/components/admin/AdminScheduleDialog.tsx` | Same treatment as above |
| `src/pages/Admin.tsx` | Make 7-tab TabsList horizontally scrollable on mobile |
| `src/pages/TournamentDetail.tsx` | Fix TabsList height for wrapped tabs, add horizontal scroll |
| `src/pages/FindOpponents.tsx` | Add truncation to team names, add pb-safe-nav |
| `src/components/ui/dialog.tsx` | Reposition dialog to top on mobile to avoid keyboard overlap |

**Issue 4 (Lovable badge):** Requires toggling "Hide Lovable Badge" in project settings -- no code change needed.
