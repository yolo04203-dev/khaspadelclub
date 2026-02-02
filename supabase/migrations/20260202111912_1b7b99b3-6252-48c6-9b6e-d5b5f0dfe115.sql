-- Add entry fee columns to tournaments table
ALTER TABLE tournaments
ADD COLUMN entry_fee DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN entry_fee_currency TEXT DEFAULT 'PKR';

-- Add payment tracking columns to tournament_participants table
ALTER TABLE tournament_participants
ADD COLUMN payment_status TEXT DEFAULT 'pending',
ADD COLUMN payment_confirmed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN payment_confirmed_by UUID,
ADD COLUMN payment_notes TEXT,
ADD COLUMN custom_team_name TEXT;

-- Create index for payment status filtering
CREATE INDEX idx_tournament_participants_payment_status ON tournament_participants(payment_status);

-- Add constraint for payment_status values using a trigger (avoiding CHECK constraint for flexibility)
CREATE OR REPLACE FUNCTION validate_payment_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_status NOT IN ('pending', 'paid', 'refunded') THEN
    RAISE EXCEPTION 'Invalid payment_status: %. Must be pending, paid, or refunded', NEW.payment_status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_payment_status
BEFORE INSERT OR UPDATE ON tournament_participants
FOR EACH ROW
EXECUTE FUNCTION validate_payment_status();