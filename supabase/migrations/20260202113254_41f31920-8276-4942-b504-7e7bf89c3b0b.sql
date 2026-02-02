-- Add payment instructions column to tournaments table
ALTER TABLE tournaments
ADD COLUMN payment_instructions TEXT;