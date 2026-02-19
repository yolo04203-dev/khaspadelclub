

# Remove All Test Admin Teams

## What will be removed

20 teams all created by "Test Admin" user at the same timestamp (2026-02-19 12:46:14), with names like "Ali Raza & Kamran", "Babar & Rizwan", etc. None have any matches or challenges tied to them.

## Deletion steps (in order, to respect foreign keys)

1. Delete ladder_rankings for all 20 teams
2. Delete team_members for all 20 teams
3. Delete the 20 teams themselves

Also includes "YOLO's Team" (created by same admin user, no rankings, no matches) -- let me know if you want to keep that one.

## Technical details

Three sequential DELETE statements targeting teams where `created_by = '4f7673a0-...'` and `created_at = '2026-02-19 12:46:14.876676+00'`. No schema changes needed -- this is purely data cleanup.

