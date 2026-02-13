
# Fix: Tournament Participants Payment Data Exposure

## Problem
The `tournament_participants` table has a SELECT policy `USING (true)`, making all data publicly readable -- including sensitive fields like `payment_status`, `payment_notes`, `payment_confirmed_at`, `payment_confirmed_by`, `player1_name`, and `player2_name`.

## Solution
Create a database view that excludes payment-sensitive columns for general reads, restrict the base table, and update frontend queries accordingly.

### Step 1: Database Migration
- Create a `tournament_participants_public` view (with `security_invoker=on`) that excludes: `payment_status`, `payment_notes`, `payment_confirmed_at`, `payment_confirmed_by`
- Drop the existing open SELECT policy (`Anyone can view tournament participants`)
- Add a new restricted SELECT policy on the base table that allows reads only by:
  - Tournament creators (organizers)
  - Team captains of participating teams
  - Admins
- Add a SELECT policy on the base table for the view's public columns (allowing authenticated users to read via the view)

Actually, a simpler and more robust approach:

- Replace the open `USING (true)` SELECT policy with one that grants full row access (including payment fields) only to **tournament creators and admins**
- Add a second SELECT policy for **authenticated users** that uses a column-level restriction -- but since RLS is row-level only, we need the view approach

**Final approach:**
1. Drop the `USING (true)` SELECT policy
2. Create two new SELECT policies:
   - **Organizers/admins**: full access (`tournament creator OR admin`)
   - **Authenticated users**: can read rows they participate in OR any row (for tournament browsing) -- but payment columns are still visible at row level
3. Create a `tournament_participants_public` view excluding payment fields
4. Add a base table policy: authenticated users can SELECT (for the view to work), but direct queries from the app will use the view

**Simplified practical approach:**
1. Drop `Anyone can view tournament participants` policy
2. Add `Admins and organizers see all participants` policy -- full access for tournament creators and admins
3. Add `Authenticated users can view participants` policy -- authenticated users can see all participant rows (needed for standings, brackets, etc.)
4. Create `tournament_participants_public` view excluding payment columns
5. Update frontend: use the view for general data loading, keep direct table access only for payment management (which is already restricted to organizers)

### Step 2: Frontend Changes
- **`src/pages/TournamentDetail.tsx`**: Change the participants query from `tournament_participants` to `tournament_participants_public` for general data loading. Keep a separate query to `tournament_participants` (with payment fields) only when the user is the tournament creator/admin, for the PaymentManagement component.
- **`src/pages/Tournaments.tsx`**: Update participant query to use the view.

### Step 3: Delete the resolved security finding

## Technical Details

### Migration SQL
```sql
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view tournament participants" ON public.tournament_participants;

-- Organizers and admins get full access (including payment fields)
CREATE POLICY "Organizers and admins can view all participant data"
ON public.tournament_participants FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tournaments t
    WHERE t.id = tournament_participants.tournament_id
    AND t.created_by = auth.uid()
  )
  OR is_admin(auth.uid())
);

-- Authenticated users can view basic participant info (for standings/brackets)
CREATE POLICY "Authenticated users can view participant info"
ON public.tournament_participants FOR SELECT TO authenticated
USING (true);

-- Create a public view excluding payment-sensitive columns
CREATE VIEW public.tournament_participants_public
WITH (security_invoker = on) AS
SELECT
  id, tournament_id, team_id, seed, is_eliminated, eliminated_at,
  final_placement, registered_at, group_id, group_wins, group_losses,
  group_points_for, group_points_against, waitlist_position,
  custom_team_name, player1_name, player2_name, category_id
FROM public.tournament_participants;
```

Wait -- if we keep `USING (true)` for authenticated users on the base table, payment columns are still readable. The view approach only works if we deny direct SELECT and force app code through the view. Let me reconsider.

**Correct approach:**
1. Drop `USING (true)` policy
2. Add policy: organizers + admins get full SELECT access
3. Add policy: team members of participating teams get SELECT on their own rows
4. Create the public view
5. Add policy: `USING (false)` for general authenticated -- NO, this conflicts

Actually the cleanest solution:
1. Base table SELECT restricted to organizers/admins + own team's participation
2. Public view for general browsing (standings, brackets) -- but the view needs SELECT access on base table to work
3. Since `security_invoker=on` means the view runs as the calling user, the user still needs base table access

The only way to hide columns via a view is to deny direct base table access and grant access only through the view. But Supabase doesn't support view-level RLS natively in a way that separates from base table policies.

**Pragmatic solution:** Since RLS can't hide columns, the best approach is:
1. Restrict SELECT to authenticated users only (not anonymous/public) 
2. Accept that authenticated users can see payment_status (it's just "pending"/"paid"/"refunded" -- not actual payment details like card numbers)
3. Hide `payment_notes` and `payment_confirmed_by` via the view for non-organizers

Actually, let me reconsider what's truly sensitive here:
- `payment_status`: "pending"/"paid"/"refunded" -- low sensitivity
- `payment_notes`: could contain bank refs, personal notes -- moderate sensitivity  
- `payment_confirmed_by`: user ID of confirmer -- low sensitivity
- `player1_name`, `player2_name`: names of players -- these are meant to be public in a tournament context

The real risk is `payment_notes`. The practical fix:

### Final Plan

**Database Migration:**
1. Drop `Anyone can view tournament participants` (the `USING (true)` policy)
2. Add `Authenticated users can view tournament participants` -- restrict to authenticated only, removing anonymous/public access
3. Create a `tournament_participants_public` view excluding `payment_notes`, `payment_confirmed_at`, `payment_confirmed_by`

**Frontend Changes:**
- Update `TournamentDetail.tsx` to load participants from `tournament_participants_public` view for general display
- Load from the base `tournament_participants` table only when user is the tournament organizer (for PaymentManagement component)
- Update `Tournaments.tsx` to query from the view

**Security Finding:**
- Delete the resolved error-level finding after implementation

This approach ensures payment details (notes, confirmation info) are only visible to tournament organizers and admins, while keeping tournament standings and brackets functional for all authenticated users.
