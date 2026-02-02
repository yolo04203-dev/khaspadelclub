-- Fix the function search path security issue
CREATE OR REPLACE FUNCTION validate_payment_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.payment_status NOT IN ('pending', 'paid', 'refunded') THEN
    RAISE EXCEPTION 'Invalid payment_status: %. Must be pending, paid, or refunded', NEW.payment_status;
  END IF;
  RETURN NEW;
END;
$$;