-- Migration 002: Add details JSONB column to subtasks for storing richer subtask information
-- This allows storing Adam decomposition, CDP analysis, and stage-specific data

-- Add details column to subtasks table
ALTER TABLE subtasks ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}';

-- Add metadata column for flexibility
ALTER TABLE subtasks ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Create index on details for better query performance
CREATE INDEX IF NOT EXISTS idx_subtasks_details ON subtasks USING GIN (details);

-- Create index on metadata
CREATE INDEX IF NOT EXISTS idx_subtasks_metadata ON subtasks USING GIN (metadata);

-- Update existing subtasks to have empty details object
UPDATE subtasks SET details = '{}' WHERE details IS NULL;
UPDATE subtasks SET metadata = '{}' WHERE metadata IS NULL;
