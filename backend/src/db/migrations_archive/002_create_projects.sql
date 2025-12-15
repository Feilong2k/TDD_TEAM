-- Migration 002: Create projects table and add project_id foreign keys
-- This enables multi-project capability for CodeMaestro

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    path VARCHAR(500), -- local filesystem path for this project
    git_url VARCHAR(500), -- optional git repository URL
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(name)
);

-- Add project_id to subtasks table
ALTER TABLE subtasks 
ADD COLUMN IF NOT EXISTS project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE DEFAULT 1;

-- Add project_id to logs table  
ALTER TABLE logs 
ADD COLUMN IF NOT EXISTS project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE DEFAULT 1;

-- Add project_id to agents table
ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE DEFAULT 1;

-- Add project_id to events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE DEFAULT 1;

-- Indexes for project-related queries
CREATE INDEX IF NOT EXISTS idx_subtasks_project_id ON subtasks(project_id);
CREATE INDEX IF NOT EXISTS idx_logs_project_id ON logs(project_id);
CREATE INDEX IF NOT EXISTS idx_agents_project_id ON agents(project_id);
CREATE INDEX IF NOT EXISTS idx_events_project_id ON events(project_id);

-- Insert a default project (for backward compatibility)
INSERT INTO projects (id, name, description, path, git_url) 
VALUES (1, 'Default Project', 'Main development project', NULL, NULL)
ON CONFLICT (id) DO NOTHING;
