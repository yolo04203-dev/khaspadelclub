-- Add player name columns to tournament_participants for custom team registrations
ALTER TABLE tournament_participants
ADD COLUMN player1_name TEXT,
ADD COLUMN player2_name TEXT;