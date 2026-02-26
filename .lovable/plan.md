

## Plan: Page-Specific Header Icons

### Change Summary
Show the notification bell and logout button **only on the Home/Dashboard page**. All other pages get a cleaner header with just the logo, nav, and any page-specific actions (like "Create Ladder" for admins).

### Implementation

**1. Update `AppHeader` component** (`src/components/AppHeader.tsx`)
- Add a new prop `showUserActions?: boolean` (defaults to `false`)
- Wrap the `<NotificationBell />`, user info display, and `<LogOut>` button in a conditional that only renders when `showUserActions` is `true`
- The `actions` slot remains always visible, so admin buttons like "Create Ladder" will naturally fill the right side when user actions are hidden

**2. Update Dashboard** (`src/pages/Dashboard.tsx`)
- Pass `showUserActions` to both `<AppHeader />` calls (loading state and main render):
  ```tsx
  <AppHeader showUserActions />
  ```

**3. No changes needed on other pages**
- Ladders, Challenges, Tournaments, Stats, and inner pages already don't pass `showUserActions`, so they'll get the clean header by default
- The Ladders page already passes the "Create Ladder" button via `actions`, which will align to the far right automatically since bell/logout won't be present

### Affected Files
- `src/components/AppHeader.tsx` — add `showUserActions` prop, conditionally render bell + logout + user info
- `src/pages/Dashboard.tsx` — pass `showUserActions` on both AppHeader usages

