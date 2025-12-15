-- PostgreSQL Schema for TDD_TEAM v3

-- Table: subtasks
CREATE TABLE IF NOT EXISTS subtasks (
    id           TEXT PRIMARY KEY,
    title        TEXT NOT NULL,
    phase        TEXT,
    status       TEXT NOT NULL DEFAULT 'pending',
    owner        TEXT,
    priority     TEXT DEFAULT 'medium',
    dependencies TEXT[] DEFAULT '{}',
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Table: subtask_state
CREATE TABLE IF NOT EXISTS subtask_state (
    subtask_id  TEXT PRIMARY KEY REFERENCES subtasks(id) ON DELETE CASCADE,
    state       JSONB NOT NULL DEFAULT '{}'::JSONB,
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Table: subtask_logs
CREATE TABLE IF NOT EXISTS subtask_logs (
    id          BIGSERIAL PRIMARY KEY,
    subtask_id  TEXT REFERENCES subtasks(id) ON DELETE CASCADE,
    actor       TEXT,
    kind        TEXT,
    content     TEXT,
    meta        JSONB DEFAULT '{}'::JSONB,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_subtasks_status ON subtasks(status);
CREATE INDEX IF NOT EXISTS idx_subtasks_phase ON subtasks(phase);
CREATE INDEX IF NOT EXISTS idx_subtask_logs_subtask_id ON subtask_logs(subtask_id);
CREATE INDEX IF NOT EXISTS idx_subtask_logs_created_at ON subtask_logs(created_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for subtasks
DROP TRIGGER IF EXISTS update_subtasks_updated_at ON subtasks;
CREATE TRIGGER update_subtasks_updated_at
    BEFORE UPDATE ON subtasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for subtask_state
DROP TRIGGER IF EXISTS update_subtask_state_updated_at ON subtask_state;
CREATE TRIGGER update_subtask_state_updated_at
    BEFORE UPDATE ON subtask_state
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Sample seed data (optional)
-- INSERT INTO subtasks (id, title, phase, status, owner, priority) VALUES
-- ('1-1-1', 'Sample Subtask 1', 'Phase 1', 'pending', NULL, 'medium'),
-- ('1-1-2', 'Sample Subtask 2', 'Phase 1', 'in_progress', 'Devon', 'high');
