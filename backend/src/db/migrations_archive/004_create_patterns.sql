-- Migration 004: Create patterns table

CREATE TABLE IF NOT EXISTS patterns (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    type VARCHAR(50) DEFAULT 'snippet' CHECK (type IN ('snippet', 'bug_fix', 'architecture')),
    title VARCHAR(255) NOT NULL,
    problem TEXT,
    solution TEXT NOT NULL,
    description TEXT,
    tags TEXT[],
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for searching tags
CREATE INDEX IF NOT EXISTS idx_patterns_tags ON patterns USING GIN (tags);

-- Index for searching title
CREATE INDEX IF NOT EXISTS idx_patterns_title ON patterns(title);
