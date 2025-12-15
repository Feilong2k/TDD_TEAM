-- Chat messages table for persistent conversation history (per project)
CREATE TABLE IF NOT EXISTS chat_messages (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL,          -- 'user', 'assistant', 'system'
  content TEXT NOT NULL,
  agent VARCHAR(50) DEFAULT 'Orion',  -- Which agent responded
  mode VARCHAR(20),                   -- 'tactical', 'strategic'
  metadata JSONB,                     -- tool_calls, function results, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX idx_chat_project ON chat_messages(project_id);
CREATE INDEX idx_chat_created ON chat_messages(project_id, created_at DESC);
CREATE INDEX idx_chat_agent ON chat_messages(agent);

