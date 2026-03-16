-- Migration for Accountability Partner Feature

-- 1. Add unlocked_until column to admin_users table
ALTER TABLE admin_users 
ADD COLUMN IF NOT EXISTS unlocked_until TIMESTAMP WITH TIME ZONE;

-- 2. Create partner_users table
CREATE TABLE IF NOT EXISTS partner_users (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for quick lookup
CREATE INDEX IF NOT EXISTS idx_partner_users_email ON partner_users(email);