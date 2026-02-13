

# Fix Management Access for Permission-Based Users and Super Admin

## Problem
Currently, the `create_tournament` / `create_americano` permissions only grant access to the **creation page**. Once created, the creator CAN manage their own tournament (via `isOwner` check), but:
1. `super_admin` role is not recognized in management checks
2. The `isAdmin` logic on detail pages doesn't account for the new permission system

## Current Behavior
- **TournamentDetail.tsx (line 781):** `const isAdmin = role === "admin" || isOwner;` -- missing `super_admin`
- **AmericanoSession.tsx (line 404):** `const isOwner = user?.id === session?.created_by || role === "admin";` -- missing `super_admin`
- Ladder management page was not found, so it may already route through admin-only checks

## Answer to Your Question
**Yes**, a user with `create_tournament` permission **can** edit their own created tournament because the detail page checks `user?.id === tournament?.created_by`. However, `super_admin` is currently missing from these checks, which is a bug.

## Proposed Changes

### 1. TournamentDetail.tsx
Update the `isAdmin` variable to include `super_admin`:
```
const isOwner = user?.id === tournament?.created_by;
const isAdmin = role === "admin" || role === "super_admin" || isOwner;
```

### 2. AmericanoSession.tsx
Update the `isOwner` variable to include `super_admin`:
```
const isOwner = user?.id === session?.created_by || role === "admin" || role === "super_admin";
```

### 3. TournamentsTab.tsx (Admin panel)
The admin tournaments tab should also allow `super_admin` to manage/delete tournaments (this likely already works since the Admin page gates access, but worth verifying the delete action).

These are two small one-line fixes that ensure `super_admin` has full management access everywhere, and tournament/americano creators can continue managing what they created.

