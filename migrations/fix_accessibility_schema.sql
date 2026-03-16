-- ============================================
-- ACCESSIBILITY SERVICES SCHEMA FIX
-- Aligns production schema with expected columns
-- ============================================

-- 1. Make old columns nullable (for backward compatibility)
ALTER TABLE accessibility_policies 
ALTER COLUMN service_package DROP NOT NULL;

ALTER TABLE accessibility_policies 
ALTER COLUMN service_name DROP NOT NULL;

-- 2. Add missing columns to accessibility_policies
ALTER TABLE accessibility_policies 
ADD COLUMN IF NOT EXISTS service_id VARCHAR(500);

ALTER TABLE accessibility_policies 
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE;

ALTER TABLE accessibility_policies 
ADD COLUMN IF NOT EXISTS locked_by VARCHAR(255);

ALTER TABLE accessibility_policies 
ADD COLUMN IF NOT EXISTS locked_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE accessibility_policies 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 3. Migrate data from old columns to new columns
UPDATE accessibility_policies 
SET service_id = service_package 
WHERE service_id IS NULL AND service_package IS NOT NULL;

UPDATE accessibility_policies 
SET is_locked = is_force_enabled 
WHERE is_locked IS NULL;

-- 4. Create unique constraint on new columns (drop old one first if needed)
-- Note: This will fail if constraint already exists, which is fine
DO $$ 
BEGIN
    ALTER TABLE accessibility_policies 
    ADD CONSTRAINT accessibility_policies_device_service_unique 
    UNIQUE(device_id, service_id);
EXCEPTION
    WHEN duplicate_table THEN NULL;
    WHEN duplicate_object THEN NULL;
END $$;

-- 5. Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'accessibility_policies'
ORDER BY ordinal_position;
