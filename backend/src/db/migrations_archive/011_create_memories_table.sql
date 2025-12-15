CREATE TABLE IF NOT EXISTS memories (
  id SERIAL PRIMARY KEY,
  key VARCHAR(255) NOT NULL,
  value JSONB NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'context', 'preference', 'reflex'
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  user_id INTEGER, -- Nullable for system-wide memories
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraints to prevent duplicates
  UNIQUE(key, type, project_id, user_id)
);

-- Index for searching
CREATE INDEX idx_memories_type ON memories(type);
CREATE INDEX idx_memories_project ON memories(project_id);
CREATE INDEX idx_memories_user ON memories(user_id);

