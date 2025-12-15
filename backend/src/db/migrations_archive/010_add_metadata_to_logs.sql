-- Migration 010: Add metadata to logs table for AI usage tracking
-- Adds support for storing model name, token usage, cost, etc.

ALTER TABLE logs 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- distinct from subtask_id, we might want to know WHICH agent (actor) performed the action
ALTER TABLE logs
ADD COLUMN IF NOT EXISTS agent_id VARCHAR(20) REFERENCES agents(id) ON DELETE SET NULL;

-- Index for searching logs by agent
CREATE INDEX IF NOT EXISTS idx_logs_agent_id ON logs(agent_id);

-- Index inside metadata for model (optional, but good for analytics)
CREATE INDEX IF NOT EXISTS idx_logs_metadata_model ON logs ((metadata->>'model'));

