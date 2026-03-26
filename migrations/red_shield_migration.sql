-- Red Shield (Irrevocable Policies) Feature Migration
-- Adds is_irrevocable column to url_blacklist, accessibility_policies, and app_policies
-- and creates triggers to prevent modification/deletion of irrevocable records

BEGIN;

-- 1. Add columns to url_blacklist
ALTER TABLE url_blacklist ADD COLUMN IF NOT EXISTS is_irrevocable BOOLEAN DEFAULT FALSE;

-- 2. Add columns to accessibility_policies
ALTER TABLE accessibility_policies ADD COLUMN IF NOT EXISTS is_irrevocable BOOLEAN DEFAULT FALSE;

-- 3. Add columns to app_policies
ALTER TABLE app_policies ADD COLUMN IF NOT EXISTS is_irrevocable BOOLEAN DEFAULT FALSE;

-- 4. Create trigger function
CREATE OR REPLACE FUNCTION prevent_irrevocable_modifications()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.is_irrevocable = TRUE THEN
        RAISE EXCEPTION 'Red Shield: Cannot modify or delete irrevocable policy';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Bind triggers
DROP TRIGGER IF EXISTS trigger_prevent_irrevocable_url_blacklist ON url_blacklist;
CREATE TRIGGER trigger_prevent_irrevocable_url_blacklist
    BEFORE UPDATE OR DELETE ON url_blacklist
    FOR EACH ROW
    EXECUTE FUNCTION prevent_irrevocable_modifications();

DROP TRIGGER IF EXISTS trigger_prevent_irrevocable_accessibility_policies ON accessibility_policies;
CREATE TRIGGER trigger_prevent_irrevocable_accessibility_policies
    BEFORE UPDATE OR DELETE ON accessibility_policies
    FOR EACH ROW
    EXECUTE FUNCTION prevent_irrevocable_modifications();

DROP TRIGGER IF EXISTS trigger_prevent_irrevocable_app_policies ON app_policies;
CREATE TRIGGER trigger_prevent_irrevocable_app_policies
    BEFORE UPDATE OR DELETE ON app_policies
    FOR EACH ROW
    EXECUTE FUNCTION prevent_irrevocable_modifications();

COMMIT;
