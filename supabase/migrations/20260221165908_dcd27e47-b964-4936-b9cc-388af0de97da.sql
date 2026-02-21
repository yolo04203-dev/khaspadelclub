ALTER TABLE tournament_matches ADD COLUMN court_number INTEGER;
ALTER TABLE tournament_matches ADD COLUMN duration_minutes INTEGER DEFAULT 30;