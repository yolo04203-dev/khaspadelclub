

# Super Admin and Granular Permissions System

## Overview
Ahmed (user ID: `02c37fb9-1334-4356-8036-f0ec49e19a45`) becomes the **super admin** -- the only person who can grant and revoke permissions for other users. Regular admins become permission-based: they can only do what the super admin has allowed.

## Database Changes

### 1. Add `super_admin` to the `app_role` enum
Add a new enum value so Ahmed's role can be set to `super_admin`.

### 2. Create a `user_permissions` table
Stores granular permissions that the super admin grants to users:

```text
user_permissions
  id            UUID (PK)
  user_id       UUID (FK -> auth.users, NOT NULL)
  permission    TEXT (NOT NULL)
  granted_by    UUID (FK -> auth.users)
  created_at    TIMESTAMPTZ
  UNIQUE(user_id, permission)
```

Permission values: `create_tournament`, `create_ladder`, `create_americano`, `manage_matches`

### 3. Create helper functions
- `is_super_admin(uuid)` -- checks if user has `super_admin` role
- `has_permission(uuid, text)` -- checks `user_permissions` table (super_admins implicitly have all permissions)

### 4. Set Ahmed as super_admin
Update Ahmed's role from `admin` to `super_admin`.

### 5. RLS on `user_permissions`
- SELECT: authenticated users can read their own permissions; super_admins can read all
- INSERT/DELETE: only super_admins

## Code Changes

### AuthContext (`src/contexts/AuthContext.tsx`)
- Add `super_admin` to the `UserRole` type
- Prioritize `super_admin` > `admin` > `player` in role resolution

### Admin Page (`src/pages/Admin.tsx`)
- Allow both `admin` and `super_admin` roles to access the admin portal
- Add a new "Permissions" tab visible only to `super_admin`

### New Component: `PermissionsTab`
- Shows all users with a toggle/checkbox for each permission
- Super admin can grant/revoke: Create Tournaments, Create Ladders, Create Americano, Manage Matches
- Uses the `user_permissions` table

### PlayersTab (`src/components/admin/PlayersTab.tsx`)
- Only super_admin can promote/demote users (hide role actions for regular admins)

### Creation Pages (TournamentCreate, LadderCreate, AmericanoCreate)
- Update access checks: allow if user is `super_admin`, `admin`, OR has the specific permission (e.g., `create_tournament`)
- Fetch user permissions on mount and check accordingly

### Dashboard / Navigation
- Show "Admin Panel" link for both `admin` and `super_admin` roles
- Show creation buttons based on permissions rather than just role

## Summary of Changes
| File | Change |
|------|--------|
| Database migration | New enum value, `user_permissions` table, helper functions, Ahmed's role update |
| `src/contexts/AuthContext.tsx` | Add `super_admin` role type and priority |
| `src/pages/Admin.tsx` | Allow `super_admin` access, add Permissions tab |
| New: `src/components/admin/PermissionsTab.tsx` | UI for granting/revoking permissions |
| `src/components/admin/PlayersTab.tsx` | Restrict role changes to super_admin only |
| `src/pages/TournamentCreate.tsx` | Check `create_tournament` permission |
| `src/pages/LadderCreate.tsx` | Check `create_ladder` permission |
| `src/pages/AmericanoCreate.tsx` | Check `create_americano` permission |
| Navigation components | Show create buttons based on permissions |

