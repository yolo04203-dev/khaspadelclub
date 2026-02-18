

## Redesign Tournaments Page to Match Reference

Redesign the Tournaments listing page to match the provided reference screenshot, featuring filter tabs, card-style tournament listings with diagonal status ribbons, and a floating action button.

### Visual Changes

**1. Filter Tabs (All / Ongoing / Upcoming / Completed)**
- Add a horizontal tab bar below the header with four filter options
- "All" shows everything, "Ongoing" filters `in_progress`, "Upcoming" filters `registration`/`draft`, "Completed" filters `completed`
- Active tab gets a filled primary background; inactive tabs are plain text

**2. Tournament Cards (new design)**
- Each card displays:
  - Tournament name (bold, truncated if long)
  - "Organizer" line showing the venue or a default label
  - Date range using `start_date` and `end_date` fields (with calendar icon)
- A diagonal ribbon in the top-right corner showing the status (Upcoming = green, Completed = gray, Ongoing = blue)
- Remove the current grid layout; use a single-column vertical list of cards for mobile-first design (grid on desktop)

**3. Floating Action Button**
- Replace the header "New Tournament" button with a centered FAB using the existing `FAB` component
- Only visible to admins
- Position: bottom-center, above the mobile nav bar

**4. Remove info card**
- Remove the "Tournament Formats" explanation card to simplify the page, matching the cleaner reference design

### Technical Details

**File:** `src/pages/Tournaments.tsx`
- Add `useState` for active filter tab (all/ongoing/upcoming/completed)
- Add a `filteredTournaments` computed list based on the selected tab
- Replace the header `actions` prop (remove the inline "New Tournament" button)
- Add filter tab UI using simple buttons/pills styled with Tailwind
- Redesign tournament cards:
  - Single column on mobile, 2-col grid on `md:` screens
  - Add a CSS diagonal ribbon for status using `overflow-hidden` and a rotated absolute-positioned element
  - Show venue as "Organizer" line
  - Format `start_date`/`end_date` with `date-fns` (e.g., "26 Feb - 09 Mar")
- Add the FAB component at the bottom for admin users
- Remove the "Tournament Formats" info card
- Add `Tabs` import from UI components for the filter bar

