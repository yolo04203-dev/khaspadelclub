-- Step 1: Delete challenges linked to seeded teams
DELETE FROM challenges 
WHERE message LIKE 'SEED_DATA%';

-- Step 2: Delete matches linked to seeded teams
DELETE FROM matches 
WHERE notes LIKE 'SEED_DATA%';

-- Step 3: Delete ladder rankings linked to seeded teams
DELETE FROM ladder_rankings 
WHERE team_id IN (
  SELECT id FROM teams WHERE name LIKE '%SEED%'
);

-- Step 4: Delete seeded teams
DELETE FROM teams 
WHERE name LIKE '%SEED%';