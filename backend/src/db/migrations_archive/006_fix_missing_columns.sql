-- Migration 006: Fix missing solution column
ALTER TABLE patterns ADD COLUMN IF NOT EXISTS solution TEXT;
ALTER TABLE patterns ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE patterns ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]';
ALTER TABLE patterns ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'snippet';

