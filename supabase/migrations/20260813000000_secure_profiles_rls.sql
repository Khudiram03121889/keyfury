-- KeyFury v1 Security Migration: Prevent Client-Side MMR & Stat Tampering

-- 1. Trigger Function: Reverts modifications to sensitive ranking/stat columns if executed by an unprivileged client role
CREATE OR REPLACE FUNCTION protect_profile_sensitive_columns()
RETURNS TRIGGER AS $$
BEGIN
  -- Service role and postgres superuser bypass column restrictions
  IF (current_setting('role', true) = 'service_role' OR current_user = 'postgres') THEN
    RETURN NEW;
  END IF;

  -- Protect rating, win/loss stats, and rank tier from client-side REST mutations
  NEW.mmr := OLD.mmr;
  NEW.wins := OLD.wins;
  NEW.losses := OLD.losses;
  NEW.matches_played := OLD.matches_played;
  NEW.rank_tier := OLD.rank_tier;
  NEW.rank_division := OLD.rank_division;
  NEW.placement_remaining := OLD.placement_remaining;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Attach trigger to profiles table
DROP TRIGGER IF EXISTS trg_protect_profile_sensitive_columns ON profiles;
CREATE TRIGGER trg_protect_profile_sensitive_columns
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION protect_profile_sensitive_columns();
