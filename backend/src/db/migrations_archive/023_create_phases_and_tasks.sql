-- Migration 023: Create phases and tasks tables for UI project hierarchy
-- This migration adds the missing tables to support the frontend's expected structure:
-- phases -> tasks -> subtasks

-- Phases table
CREATE TABLE IF NOT EXISTS phases (
    id VARCHAR(20) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'active',
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id VARCHAR(20) PRIMARY KEY,
    phase_id VARCHAR(20) REFERENCES phases(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    agent VARCHAR(50),
    subtask_ids TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update subtasks table to add task_id and phase_id foreign keys
-- Note: subtasks already has a 'phase' column (text), we'll keep it for backward compatibility
ALTER TABLE subtasks 
ADD COLUMN IF NOT EXISTS task_id VARCHAR(20) REFERENCES tasks(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS phase_id VARCHAR(20) REFERENCES phases(id) ON DELETE CASCADE;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_phases_status ON phases(status);
CREATE INDEX IF NOT EXISTS idx_phases_order ON phases(order_index);
CREATE INDEX IF NOT EXISTS idx_tasks_phase_id ON tasks(phase_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_subtasks_task_id ON subtasks(task_id);
CREATE INDEX IF NOT EXISTS idx_subtasks_phase_id ON subtasks(phase_id);

-- Function to update updated_at timestamp for phases and tasks
CREATE OR REPLACE FUNCTION update_phases_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for phases
DROP TRIGGER IF EXISTS update_phases_updated_at ON phases;
CREATE TRIGGER update_phases_updated_at
    BEFORE UPDATE ON phases
    FOR EACH ROW
    EXECUTE FUNCTION update_phases_tasks_updated_at();

-- Trigger for tasks
DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_phases_tasks_updated_at();

-- Insert default phase and tasks from archived project.json for migration
-- This ensures the UI has data to display after migration
INSERT INTO phases (id, title, description, status, order_index) VALUES
('phase1', 'Foundation', 'Phase 1: UI can chat with Orion, context checkbox works, basic task log creation, Orion performs Quick CDP', 'active', 1)
ON CONFLICT (id) DO NOTHING;

-- Insert tasks for phase1 (matching archived project.json)
INSERT INTO tasks (id, phase_id, title, description, status, agent) VALUES
('1-1', 'phase1', 'UI can chat with Orion (real responses)', 'Implement Orion wrapper functions 1-4 to enable real chat responses', 'in_progress', NULL),
('1-2', 'phase1', 'Context checkbox works (send full context vs. minimal)', 'Implement UI checkbox and backend logic for context selection', 'pending', NULL),
('1-3', 'phase1', 'Basic task log creation', 'Create project.json structure and logs directory for task tracking', 'in_progress', NULL),
('1-4', 'phase1', 'Orion performs Quick CDP analysis', 'Integrate Constraint Discovery Protocol for task analysis', 'pending', NULL)
ON CONFLICT (id) DO NOTHING;

-- Update existing subtasks with task_id and phase_id where possible
-- This is a best-effort migration based on the archived project.json structure
UPDATE subtasks SET 
    task_id = CASE 
        WHEN id LIKE '1-1-%' THEN '1-1'
        WHEN id LIKE '1-2-%' THEN '1-2'
        WHEN id LIKE '1-3-%' THEN '1-3'
        WHEN id LIKE '1-4-%' THEN '1-4'
        ELSE NULL
    END,
    phase_id = 'phase1'
WHERE id LIKE '1-%-%';
