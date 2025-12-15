-- Migration 019: Ensure unique project names
-- The UNIQUE constraint may be missing if table was created before migration 002 added it

-- First, mark duplicates as deleted (keep the oldest one)
UPDATE projects p1
SET status = 'deleted'
WHERE EXISTS (
    SELECT 1 FROM projects p2 
    WHERE p2.name = p1.name 
    AND p2.id < p1.id
    AND p2.status = 'active'
)
AND p1.status = 'active';

-- Add unique constraint if not exists (only for active projects via partial index)
CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_name_active 
ON projects(name) 
WHERE status = 'active';

