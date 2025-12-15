-- Migration 007: Recreate patterns table to ensure schema match
-- We drop the existing (broken) table and recreate it fully.

DROP TABLE IF EXISTS patterns;

CREATE TABLE patterns (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    type VARCHAR(50) DEFAULT 'snippet',
    title VARCHAR(255) NOT NULL,
    problem TEXT,
    solution TEXT NOT NULL,
    description TEXT,
    tags JSONB DEFAULT '[]', -- Using JSONB for tags for compatibility
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indices
CREATE INDEX idx_patterns_project_id ON patterns(project_id);

