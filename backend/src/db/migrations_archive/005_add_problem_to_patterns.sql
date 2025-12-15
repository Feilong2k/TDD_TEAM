-- Migration 005: Fix missing columns in patterns table
ALTER TABLE patterns ADD COLUMN IF NOT EXISTS problem TEXT;
ALTER TABLE patterns ADD COLUMN IF NOT EXISTS solution TEXT;
ALTER TABLE patterns ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE patterns ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]';
ALTER TABLE patterns ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'snippet';
