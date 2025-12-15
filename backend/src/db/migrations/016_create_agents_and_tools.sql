-- Add description and is_active to existing agents table
ALTER TABLE agents ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create tools table
CREATE TABLE IF NOT EXISTS tools (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  class_name VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create agent_tools junction table (many-to-many)
-- Note: agent_id is VARCHAR to match existing agents.id type
CREATE TABLE IF NOT EXISTS agent_tools (
  agent_id VARCHAR(20) REFERENCES agents(id) ON DELETE CASCADE,
  tool_id INTEGER REFERENCES tools(id) ON DELETE CASCADE,
  PRIMARY KEY (agent_id, tool_id)
);

-- Insert/update default agents
INSERT INTO agents (id, name, role, description) VALUES
  ('orion', 'Orion', 'orchestrator', 'Strategic orchestrator - coordinates tasks and has full tool access'),
  ('devon', 'Devon', 'developer', 'Implementation agent - handles coding and file operations'),
  ('tara', 'Tara', 'tester', 'Testing agent - writes and runs tests')
ON CONFLICT (id) DO UPDATE SET description = EXCLUDED.description;

-- Insert default tools
INSERT INTO tools (name, description, class_name) VALUES
  ('FileSystemTool', 'Read/write files with path traversal protection', 'FileSystemTool'),
  ('GitTool', 'Git operations (commit, branch, push, pull) with safety checks', 'GitTool'),
  ('ShellTool', 'Execute shell commands with whitelist/blocklist safety', 'ShellTool'),
  ('ProjectTool', 'CRUD operations for project management', 'ProjectTool'),
  ('DatabaseTool', 'Direct database queries (restricted access)', 'DatabaseTool')
ON CONFLICT (name) DO NOTHING;

-- Assign tools to agents
-- Orion gets all tools
INSERT INTO agent_tools (agent_id, tool_id)
SELECT 'orion', t.id FROM tools t
ON CONFLICT DO NOTHING;

-- Devon gets FileSystem, Git, Shell, Project
INSERT INTO agent_tools (agent_id, tool_id)
SELECT 'devon', t.id FROM tools t 
WHERE t.name IN ('FileSystemTool', 'GitTool', 'ShellTool', 'ProjectTool')
ON CONFLICT DO NOTHING;

-- Tara gets FileSystem, Git, Shell
INSERT INTO agent_tools (agent_id, tool_id)
SELECT 'tara', t.id FROM tools t 
WHERE t.name IN ('FileSystemTool', 'GitTool', 'ShellTool')
ON CONFLICT DO NOTHING;
