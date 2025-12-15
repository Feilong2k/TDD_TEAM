-- Migration 014: Add status column to projects table for soft delete
-- Also ensure description and git_url columns exist (they already do in 002)

-- Create an ENUM type for project status
CREATE TYPE project_status AS ENUM ('active', 'deleted', 'archived');

-- Add status column with default 'active'
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS status project_status NOT NULL DEFAULT 'active';

-- Add missing columns if they don't exist (for safety)
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS git_url VARCHAR(500);

-- Update existing rows to have status 'active' if NULL (should not happen due to NOT NULL default, but safe)
UPDATE projects SET status = 'active' WHERE status IS NULL;

-- Create index on status for faster filtering
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
