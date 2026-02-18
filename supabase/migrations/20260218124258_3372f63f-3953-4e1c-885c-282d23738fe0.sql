
-- Drop broken SELECT/UPDATE policies that query auth.users
DROP POLICY IF EXISTS "Anyone can view their invitations" ON team_invitations;
DROP POLICY IF EXISTS "Invited users can update invitation status" ON team_invitations;

-- Recreate with simple invited_user_id check
CREATE POLICY "Anyone can view their invitations"
  ON team_invitations FOR SELECT
  USING (invited_user_id = auth.uid());

CREATE POLICY "Invited users can update invitation status"
  ON team_invitations FOR UPDATE
  USING (invited_user_id = auth.uid());
